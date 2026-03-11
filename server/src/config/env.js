module.exports = {
    jwt: {
        secret: process.env.JWT_SECRET || 'fallback-secret-change-me',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    },
    n8n: {
        webhookUrl: process.env.N8N_WEBHOOK_URL,
        timeout: parseInt(process.env.N8N_WEBHOOK_TIMEOUT) || 10000,
        retries: 3
    },
    pagination: {
        defaultLimit: 20,
        maxLimit: 100
    }
};
