const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { query } = require('../config/database');

// Verify JWT token
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, config.jwt.secret);

            // Verify user still exists
            const result = await query(
                'SELECT id, email, name, role FROM users WHERE id = $1',
                [decoded.userId]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'User no longer exists.'
                });
            }

            req.user = result.rows[0];
            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token has expired.'
                });
            }
            return res.status(401).json({
                success: false,
                error: 'Invalid token.'
            });
        }
    } catch (error) {
        next(error);
    }
}

// Generate JWT token
function generateToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
}

module.exports = {
    authenticate,
    generateToken
};
