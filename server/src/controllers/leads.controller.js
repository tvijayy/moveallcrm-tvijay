const { supabase } = require('../config/database');

const NEW_FIELDS = [
    'customer_name', 'phone', 'email', 'move_date', 'status', 'extra_request',
    'lead_source', 'preferred_start_time', 'move_out_address', 'move_in_address',
    'rough_size', 'heavy_items', 'access_issues', 'category',
    'last_sms_action', 'last_sms_at', 'last_email_action', 'last_email_at',
    'sms_no_ans', 'sms_after_hours', 'sms_1st_checkin', 'sms_2nd_nudge', 'sms_3rd_final', 'sms_replies',
    'is_completed', 'email_booking_sent'
];



// GET /api/leads
async function getAll(req, res, next) {
    try {
        const { status, search, category, lead_source, limit = 200, offset = 0 } = req.query;

        let q = supabase.from('leads').select('*', { count: 'exact' });

        if (status    && status    !== 'all') q = q.eq('status',      status);
        if (category  && category  !== 'all') q = q.eq('category',    category);
        if (lead_source && lead_source !== 'all') q = q.eq('lead_source', lead_source);
        if (search) q = q.or(
            `customer_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`
        );

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
        const payload = {};
        for (const f of NEW_FIELDS) {
            if (req.body[f] !== undefined) payload[f] = req.body[f] === '' ? null : req.body[f];
        }
        if (!payload.status) payload.status = 'new';

        const { data, error } = await supabase.from('leads').insert(payload).select().single();
        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
}

// PUT /api/leads/:id
async function update(req, res, next) {
    try {
        const updates = { updated_at: new Date().toISOString() };
        for (const f of NEW_FIELDS) {
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
