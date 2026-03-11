require('dotenv').config();

const express = require('express');
const app = require('./src/app');
const { testConnection } = require('./src/config/database');

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await testConnection();
        console.log('✅ Supabase connected successfully');

        app.listen(PORT, () => {
            console.log(`✅ Server running on port ${PORT}`);
            console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 API: http://localhost:${PORT}/api`);
            console.log(`🗄️  Supabase: ${process.env.SUPABASE_URL}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received. Shutting down...');
    process.exit(0);
});

startServer();
