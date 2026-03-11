const { supabase } = require('../config/database');

// GET /api/storage
async function getAll(req, res, next) {
    try {
        const { status, search, limit = 50, offset = 0 } = req.query;

        let q = supabase.from('storage_masterlist').select('*', { count: 'exact' });

        if (status && status !== 'all') q = q.eq('status', status);
        if (search) q = q.or(`client_name.ilike.%${search}%,storage_location.ilike.%${search}%,email.ilike.%${search}%`);

        q = q.order('created_at', { ascending: false })
             .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        const { data, error, count } = await q;
        if (error) throw error;

        res.json({ success: true, data, pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) } });
    } catch (error) { next(error); }
}

// GET /api/storage/:id
async function getById(req, res, next) {
    try {
        const { data, error } = await supabase.from('storage_masterlist').select('*').eq('id', req.params.id).single();
        if (error) return res.status(404).json({ success: false, error: 'Storage plan not found.' });
        res.json({ success: true, data });
    } catch (error) { next(error); }
}

// POST /api/storage
async function create(req, res, next) {
    try {
        const { storage_location, move_in_date, unit_numbers, padlock_code, client_name,
                mobile, email, phone, repeated_invoice, stripe_sub, sell_price, buy_price, margin, status } = req.body;

        const { data, error } = await supabase.from('storage_masterlist').insert({
            storage_location: storage_location || null,
            move_in_date: move_in_date || null,
            unit_numbers: unit_numbers || null,
            padlock_code: padlock_code || null,
            client_name,
            mobile: mobile || null,
            email: email || null,
            phone: phone || null,
            repeated_invoice: repeated_invoice || null,
            stripe_sub: stripe_sub || null,
            sell_price: parseFloat(sell_price) || 0,
            buy_price: parseFloat(buy_price) || 0,
            margin: parseFloat(margin) || 0,
            status: status || 'active'
        }).select().single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
}

// PUT /api/storage/:id
async function update(req, res, next) {
    try {
        const numericFields = ['sell_price', 'buy_price', 'margin'];
        const fields = ['storage_location','move_in_date','unit_numbers','padlock_code','client_name',
                        'mobile','email','phone','repeated_invoice','stripe_sub','sell_price','buy_price','margin','status'];

        const updates = { updated_at: new Date().toISOString() };
        for (const f of fields) {
            if (req.body[f] !== undefined) {
                updates[f] = numericFields.includes(f) ? (parseFloat(req.body[f]) || 0)
                                                       : (req.body[f] === '' ? null : req.body[f]);
            }
        }

        const { data, error } = await supabase.from('storage_masterlist').update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(404).json({ success: false, error: 'Storage plan not found.' });
        res.json({ success: true, data });
    } catch (error) { next(error); }
}

// DELETE /api/storage/:id
async function remove(req, res, next) {
    try {
        const { error } = await supabase.from('storage_masterlist').delete().eq('id', req.params.id);
        if (error) return res.status(404).json({ success: false, error: 'Storage plan not found.' });
        res.json({ success: true, message: 'Storage plan deleted.' });
    } catch (error) { next(error); }
}

module.exports = { getAll, getById, create, update, delete: remove };
