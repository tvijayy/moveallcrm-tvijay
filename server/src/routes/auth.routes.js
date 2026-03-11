const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { loginValidation } = require('../middleware/validate');

// Rate limit login attempts: 10 per 15 minutes per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Too many login attempts. Please try again in 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// POST /api/auth/login - User login (rate-limited)
router.post('/login', loginLimiter, loginValidation, authController.login);

// GET /api/auth/me - Get current user (requires auth)
router.get('/me', authenticate, authController.getMe);

module.exports = router;
