const config = require('../config/env');

/**
 * Trigger a webhook by action key.
 * Each action (sms_no_answer, email_2m_booking, etc.) has its own webhook URL.
 * @param {string} action   - Webhook action key (e.g. 'sms_no_answer')
 * @param {Object} data     - Payload to send (lead data, phone, email, etc.)
 */
async function trigger(action, data) {
    // Look up the webhook URL for this action
    const webhookUrl = getWebhookUrl(action);

    if (!webhookUrl) {
        console.warn(`Webhook [${action}] not configured. Skipping.`);
        return { success: true, message: `Webhook ${action} skipped (not configured)`, simulated: true };
    }

    const requestPayload = {
        action,
        data,
        timestamp: new Date().toISOString(),
        source: 'movehome-crm'
    };

    const retries = config.n8n.retries || 3;
    const timeout = config.n8n.timeout || 10000;
    let lastError = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Source': 'MoveHome-CRM',
                    'X-Action': action,
                    'X-Attempt': attempt.toString()
                },
                body: JSON.stringify(requestPayload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const responseData = await response.json().catch(() => ({}));
                console.log(`✅ Webhook [${action}] triggered successfully (attempt ${attempt})`);
                return { success: true, statusCode: response.status, response: responseData };
            }

            lastError = `HTTP ${response.status}: ${response.statusText}`;
            console.warn(`Webhook [${action}] attempt ${attempt} failed: ${lastError}`);
        } catch (error) {
            lastError = error.name === 'AbortError' ? 'Request timeout' : error.message;
            console.error(`Webhook [${action}] attempt ${attempt} error: ${lastError}`);
        }

        // Exponential backoff
        if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
    }

    return {
        success: false,
        error: `Webhook [${action}] failed after ${retries} attempts: ${lastError}`
    };
}

/**
 * Get the webhook URL for a specific action from environment variables.
 * Format: WEBHOOK_{ACTION_UPPERCASE}_URL
 * Falls back to N8N_WEBHOOK_URL if specific one not set.
 */
function getWebhookUrl(action) {
    const envKey = `WEBHOOK_${action.toUpperCase()}_URL`;
    return process.env[envKey] || config.n8n.webhookUrl || null;
}

/**
 * Get all configured webhook actions and their status.
 */
function getWebhookConfig() {
    const actions = [
        { key: 'sms_no_answer', label: 'SMS No Answer' },
        { key: 'sms_after_hours', label: 'SMS After Hours' },
        { key: 'sms_1st_checkin', label: 'SMS 1st Check-in' },
        { key: 'sms_2nd_nudge', label: 'SMS 2nd Nudge' },
        { key: 'sms_3rd_final', label: 'SMS 3rd & Final Try' },
        { key: 'email_2m_booking', label: 'Email 2M Booking Form' },
        { key: 'email_3m_booking', label: 'Email 3M Booking Form' }
    ];

    return actions.map(a => ({
        ...a,
        url: getWebhookUrl(a.key),
        configured: !!getWebhookUrl(a.key)
    }));
}

module.exports = { trigger, getWebhookUrl, getWebhookConfig };
