const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ─── Security Headers ────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false,   // allow inline scripts in frontend
    crossOriginEmbedderPolicy: false
}));

// ─── Compression ─────────────────────────────────────
app.use(compression());

// ─── Request Logging ─────────────────────────────────
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(logFormat));

// ─── CORS ────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map(s => s.trim());

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, same-origin)
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(null, true); // permissive for now; tighten in production
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Body Parsing ────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ─── API Routes ──────────────────────────────────────
app.use('/api', routes);

// ─── Serve Frontend Static Files ─────────────────────
// In production, Express serves the frontend directly (no separate http-server)
const frontendPath = path.join(__dirname, '..', '..');
app.use(express.static(frontendPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    index: 'index.html'
}));

// SPA fallback: serve index.html for any non-API, non-file route
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// ─── 404 Handler (API only) ─────────────────────────
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'API endpoint not found'
    });
});

// ─── Global Error Handler ────────────────────────────
app.use(errorHandler);

module.exports = app;
