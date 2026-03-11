const { supabase } = require('../config/database');

// GET /api/contractors
async function getAll(req, res, next) {
    try {
        const { category, search, limit = 50, offset = 0 } = req.query;

        let q = supabase.from('contractors').select('*', { count: 'exact' });

        if (category && category !== 'all') q = q.eq('category', category);
        if (search) q = q.or(`company.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);

        q = q.order('created_at', { ascending: false })
             .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        const { data, error, count } = await q;
        if (error) throw error;

        res.json({ success: true, data, pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) } });
    } catch (error) { next(error); }
}

// GET /api/contractors/:id
async function getById(req, res, next) {
    try {
        const { data, error } = await supabase.from('contractors').select('*').eq('id', req.params.id).single();
        if (error) return res.status(404).json({ success: false, error: 'Contractor not found.' });
        res.json({ success: true, data });
    } catch (error) { next(error); }
}

// POST /api/contractors
async function create(req, res, next) {
    try {
        const { company, category, tag, rates, trucks, first_name, last_name, phone, email, linkedin } = req.body;

        const { data, error } = await supabase.from('contractors').insert({
            company,
            category: category || 'driver',
            tag: tag || null, rates: rates || null, trucks: trucks || null,
            first_name: first_name || null, last_name: last_name || null,
            phone: phone || null, email: email || null, linkedin: linkedin || null
        }).select().single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
}

// PUT /api/contractors/:id
async function update(req, res, next) {
    try {
        const fields = ['company','category','tag','rates','trucks','first_name','last_name','phone','email','linkedin'];
        const updates = { updated_at: new Date().toISOString() };
        for (const f of fields) {
            if (req.body[f] !== undefined) updates[f] = req.body[f] === '' ? null : req.body[f];
        }

        const { data, error } = await supabase.from('contractors').update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(404).json({ success: false, error: 'Contractor not found.' });
        res.json({ success: true, data });
    } catch (error) { next(error); }
}

// DELETE /api/contractors/:id
async function remove(req, res, next) {
    try {
        const { error } = await supabase.from('contractors').delete().eq('id', req.params.id);
        if (error) return res.status(404).json({ success: false, error: 'Contractor not found.' });
        res.json({ success: true, message: 'Contractor deleted.' });
    } catch (error) { next(error); }
}

module.exports = { getAll, getById, create, update, delete: remove };
