const bcrypt = require('bcryptjs');
const { supabase } = require('../config/database');
const { generateToken } = require('../middleware/auth');

// POST /api/auth/login
async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        const { data: users, error } = await supabase
            .from('users')
            .select('id, email, password_hash, name, role')
            .eq('email', email)
            .limit(1);

        if (error) throw error;
        if (!users || users.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid email or password.' });
        }

        const user = users[0];
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Invalid email or password.' });
        }

        const token = generateToken(user);
        res.json({
            success: true,
            data: {
                token,
                user: { id: user.id, email: user.email, name: user.name, role: user.role }
            }
        });
    } catch (error) { next(error); }
}

// GET /api/auth/me
async function getMe(req, res) {
    res.json({
        success: true,
        data: { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role }
    });
}

module.exports = { login, getMe };
