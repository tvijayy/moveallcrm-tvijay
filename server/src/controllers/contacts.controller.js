const { supabase } = require('../config/database');

// GET /api/contacts
async function getAll(req, res, next) {
    try {
        const { category, search, limit = 50, offset = 0 } = req.query;

        let q = supabase.from('contacts').select('*', { count: 'exact' });

        if (category && category !== 'all') q = q.eq('category', category);
        if (search) q = q.or(`client_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);

        q = q.order('created_at', { ascending: false })
             .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        const { data, error, count } = await q;
        if (error) throw error;

        res.json({ success: true, data, pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) } });
    } catch (error) { next(error); }
}

// GET /api/contacts/:id
async function getById(req, res, next) {
    try {
        const { data, error } = await supabase.from('contacts').select('*').eq('id', req.params.id).single();
        if (error) return res.status(404).json({ success: false, error: 'Contact not found.' });
        res.json({ success: true, data });
    } catch (error) { next(error); }
}

// POST /api/contacts
async function create(req, res, next) {
    try {
        const { client_name, address, first_name, last_name, email, mobile,
                category, related_jobs, last_move_date, last_move_in, last_team } = req.body;

        const { data, error } = await supabase.from('contacts').insert({
            client_name,
            address: address || null, first_name: first_name || null,
            last_name: last_name || null, email: email || null,
            mobile: mobile || null, category: category || 'residential',
            related_jobs: related_jobs || null, last_move_date: last_move_date || null,
            last_move_in: last_move_in || null, last_team: last_team || null
        }).select().single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
}

// PUT /api/contacts/:id
async function update(req, res, next) {
    try {
        const fields = ['client_name','address','first_name','last_name','email',
                        'mobile','category','related_jobs','last_move_date','last_move_in','last_team'];
        const updates = { updated_at: new Date().toISOString() };
        for (const f of fields) {
            if (req.body[f] !== undefined) updates[f] = req.body[f] === '' ? null : req.body[f];
        }

        const { data, error } = await supabase.from('contacts').update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(404).json({ success: false, error: 'Contact not found.' });
        res.json({ success: true, data });
    } catch (error) { next(error); }
}

// DELETE /api/contacts/:id
async function remove(req, res, next) {
    try {
        const { error } = await supabase.from('contacts').delete().eq('id', req.params.id);
        if (error) return res.status(404).json({ success: false, error: 'Contact not found.' });
        res.json({ success: true, message: 'Contact deleted.' });
    } catch (error) { next(error); }
}

module.exports = { getAll, getById, create, update, delete: remove };
