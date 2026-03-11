const { supabase } = require('../config/database');
const bcrypt = require('bcryptjs');

// GET /api/users
async function getAll(req, res, next) {
    try {
        const { search, limit = 50, offset = 0 } = req.query;

        let q = supabase
            .from('users')
            .select('id, name, phone, email, role, created_at, updated_at', { count: 'exact' });

        if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);

        q = q.order('created_at', { ascending: false })
             .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        const { data, error, count } = await q;
        if (error) throw error;

        res.json({ success: true, data, pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) } });
    } catch (error) { next(error); }
}

// GET /api/users/:id
async function getById(req, res, next) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, phone, email, role, created_at, updated_at')
            .eq('id', req.params.id)
            .single();
        if (error) return res.status(404).json({ success: false, error: 'User not found.' });
        res.json({ success: true, data });
    } catch (error) { next(error); }
}

// POST /api/users
async function create(req, res, next) {
    try {
        const { name, phone, email, password, role } = req.body;
        if (!password) return res.status(400).json({ success: false, error: 'Password is required.' });

        const password_hash = await bcrypt.hash(password, 10);
        const { data, error } = await supabase.from('users').insert({
            name, phone: phone || null, email, password_hash, role: role || 'staff'
        }).select('id, name, phone, email, role, created_at').single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
}

// PUT /api/users/:id
async function update(req, res, next) {
    try {
        const simpleFields = ['name', 'phone', 'email', 'role'];
        const updates = { updated_at: new Date().toISOString() };
        for (const f of simpleFields) {
            if (req.body[f] !== undefined) updates[f] = req.body[f] === '' ? null : req.body[f];
        }
        if (req.body.password) {
            updates.password_hash = await bcrypt.hash(req.body.password, 10);
        }

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', req.params.id)
            .select('id, name, phone, email, role, updated_at')
            .single();

        if (error) return res.status(404).json({ success: false, error: 'User not found.' });
        res.json({ success: true, data });
    } catch (error) { next(error); }
}

// DELETE /api/users/:id
async function remove(req, res, next) {
    try {
        const { error } = await supabase.from('users').delete().eq('id', req.params.id);
        if (error) return res.status(404).json({ success: false, error: 'User not found.' });
        res.json({ success: true, message: 'User deleted.' });
    } catch (error) { next(error); }
}

module.exports = { getAll, getById, create, update, delete: remove };
