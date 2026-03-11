const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const { supabase } = require('../config/database');
const webhook = require('../services/webhook.service');

// Action labels
const ACTION_LABELS = {
    sms_no_answer:    'SMS No Answer',
    sms_after_hours:  'SMS After Hours',
    sms_1st_checkin:  'SMS 1st Check-in',
    sms_2nd_nudge:    'SMS 2nd Nudge',
    sms_3rd_final:    'SMS 3rd & Final',
    email_2m_booking: 'Email 2M Booking',
    email_3m_booking: 'Email 3M Booking'
};

// GET /api/webhooks/config - Get webhook configuration status
router.get('/config', (req, res) => {
    const config = webhook.getWebhookConfig();
    res.json({ success: true, data: config });
});

// GET /api/webhooks/config - protected
router.get('/config', authenticate, (req, res) => {
    const config = webhook.getWebhookConfig();
    res.json({ success: true, data: config });
});

// POST /api/webhooks/trigger - NO auth required (called from browser, proxied to n8n)
router.post('/trigger', async (req, res, next) => {
    try {
        const { action, leadId } = req.body;

        if (!action || !leadId) {
            return res.status(400).json({ success: false, error: 'action and leadId are required' });
        }

        // Fetch the lead from Supabase
        const { data: leads, error: fetchErr } = await supabase
            .from('leads')
            .select('*')
            .eq('id', leadId)
            .limit(1);

        if (fetchErr || !leads || leads.length === 0) {
            return res.status(404).json({ success: false, error: 'Lead not found' });
        }

        const lead = leads[0];
        const label = ACTION_LABELS[action] || action;

        // Build payload — entire lead row + action metadata
        const payload = {
            // Action info
            action_key:         action,
            action_label:       label,
            // All lead columns from the table
            ...lead,
            // Who triggered it
            triggered_by:       req.body.triggered_by       || 'Staff',
            triggered_by_email: req.body.triggered_by_email || '',
            triggered_by_role:  req.body.triggered_by_role  || 'staff',
            triggered_at:       new Date().toISOString(),
            source:             'movehome-crm'
        };

        // Fire the webhook
        const webhookResult = await webhook.trigger(action, payload);

        // Tag lead with last SMS/Email action
        try {
            if (action.startsWith('sms_')) {
                await supabase
                    .from('leads')
                    .update({ last_sms_action: label, last_sms_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                    .eq('id', leadId);
            } else if (action.startsWith('email_')) {
                await supabase
                    .from('leads')
                    .update({ last_email_action: label, last_email_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                    .eq('id', leadId);
            }
        } catch (tagErr) {
            console.error('Failed to tag lead:', tagErr.message);
        }

        // Log to activity_logs
        try {
            await supabase.from('activity_logs').insert({
                action:      `webhook_${action}`,
                entity_type: 'lead',
                entity_id:   lead.id,
                details:     JSON.stringify({ action, label, success: webhookResult.success })
            });
        } catch (logErr) {
            console.error('Failed to log webhook action:', logErr.message);
        }

        if (webhookResult.success) {
            res.json({
                success:   true,
                message:   webhookResult.simulated
                    ? `"${label}" recorded. Webhook fires once URL is configured.`
                    : `"${label}" triggered successfully.`,
                simulated: webhookResult.simulated || false,
                tag:       label
            });
        } else {
            res.status(502).json({ success: false, error: webhookResult.error || 'Webhook failed' });
        }
    } catch (error) {
        next(error);
    }
});

// PUT /api/webhooks/tag/:leadId - protected
router.put('/tag/:leadId', authenticate, async (req, res, next) => {
    try {
        const { leadId } = req.params;
        const { last_sms_action, last_email_action } = req.body;

        const updates = { updated_at: new Date().toISOString() };
        if (last_sms_action !== undefined) {
            updates.last_sms_action = last_sms_action || null;
            updates.last_sms_at    = new Date().toISOString();
        }
        if (last_email_action !== undefined) {
            updates.last_email_action = last_email_action || null;
            updates.last_email_at     = new Date().toISOString();
        }

        if (Object.keys(updates).length === 1) {
            return res.status(400).json({ success: false, error: 'No tags to update' });
        }

        const { error } = await supabase.from('leads').update(updates).eq('id', leadId);
        if (error) throw new Error(error.message);

        res.json({ success: true, message: 'Tags updated' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
