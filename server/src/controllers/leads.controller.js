const { supabase } = require('../config/database');

// GET /api/leads
async function getAll(req, res, next) {
    try {
        const { status, search, limit = 50, offset = 0 } = req.query;

        let q = supabase.from('leads').select('*', { count: 'exact' });

        if (status && status !== 'all') q = q.eq('status', status);
        if (search) q = q.or(`customer_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);

        q = q.order('updated_at', { ascending: false })
             .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        const { data, error, count } = await q;
        if (error) throw error;

        res.json({ success: true, data, pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) } });
    } catch (error) { next(error); }
}

// GET /api/leads/:id
async function getById(req, res, next) {
    try {
        const { data, error } = await supabase.from('leads').select('*').eq('id', req.params.id).single();
        if (error) return res.status(404).json({ success: false, error: 'Lead not found.' });
        res.json({ success: true, data });
    } catch (error) { next(error); }
}

// POST /api/leads
async function create(req, res, next) {
    try {
        const { customer_name, phone, email, move_date, status, extra_request } = req.body;
        const { data, error } = await supabase.from('leads').insert({
            customer_name,
            phone: phone || null,
            email: email || null,
            move_date: move_date || null,
            status: status || 'new',
            extra_request: extra_request || null
        }).select().single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
}

// PUT /api/leads/:id
async function update(req, res, next) {
    try {
        const fields = ['customer_name', 'phone', 'email', 'move_date', 'status', 'extra_request'];
        const updates = { updated_at: new Date().toISOString() };
        for (const f of fields) {
            if (req.body[f] !== undefined) updates[f] = req.body[f] === '' ? null : req.body[f];
        }

        const { data, error } = await supabase.from('leads').update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(404).json({ success: false, error: 'Lead not found.' });
        res.json({ success: true, data });
    } catch (error) { next(error); }
}

// DELETE /api/leads/:id
async function remove(req, res, next) {
    try {
        const { error } = await supabase.from('leads').delete().eq('id', req.params.id);
        if (error) return res.status(404).json({ success: false, error: 'Lead not found.' });
        res.json({ success: true, message: 'Lead deleted.' });
    } catch (error) { next(error); }
}

module.exports = { getAll, getById, create, update, delete: remove };
