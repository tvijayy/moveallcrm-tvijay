const { supabase } = require('../config/database');

// GET /api/jobs
async function getAll(req, res, next) {
    try {
        const { status, search, view, limit = 50, offset = 0 } = req.query;
        const today = new Date().toISOString().split('T')[0];

        let q = supabase.from('jobs').select('*', { count: 'exact' });

        if (status && status !== 'all') q = q.eq('status', status);
        if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);

        if (view === 'upcoming')     { q = q.in('status', ['scheduled', 'in_progress']).or(`move_date.gte.${today},move_date.is.null`); }
        else if (view === 'past')    { q = q.in('status', ['completed', 'cancelled']).lt('move_date', today); }
        else if (view === 'archived'){ q = q.eq('status', 'archived'); }

        q = q.order('move_date', { ascending: false })
             .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        const { data, error, count } = await q;
        if (error) {
            console.error('Jobs Query Error:', error);
            throw error;
        }

        console.log(`[JOBS] Fetched view='${view}', found ${count} jobs.`);
        
        res.json({ success: true, data, pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) } });
    } catch (error) { next(error); }
}

// GET /api/jobs/:id
async function getById(req, res, next) {
    try {
        const { data, error } = await supabase.from('jobs').select('*').eq('id', req.params.id).single();
        if (error) return res.status(404).json({ success: false, error: 'Job not found.' });
        res.json({ success: true, data });
    } catch (error) { next(error); }
}

// POST /api/jobs
async function create(req, res, next) {
    try {
        const { first_name, last_name, phone, email, team, contractor, extras, deposit,
                invoice, move_out, second_stop, move_in, on_way_sms, last_sms,
                time_sheet, move_date, brand, status, price_point, notes } = req.body;

        const { data, error } = await supabase.from('jobs').insert({
            first_name, last_name,
            phone: phone || null, email: email || null,
            team: team || null, contractor: contractor || null,
            extras: extras || null, deposit: parseFloat(deposit) || 0,
            invoice: invoice || null, move_out: move_out || null,
            second_stop: second_stop || null, move_in: move_in || null,
            on_way_sms: on_way_sms || 'not_sent', last_sms: last_sms || 'not_sent',
            time_sheet: time_sheet || null, move_date: move_date || null,
            brand: brand || null, status: status || 'scheduled',
            price_point: price_point || null, notes: notes || null,
        }).select().single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
}

// PUT /api/jobs/:id
async function update(req, res, next) {
    try {
        const numericFields = ['deposit'];
        const fields = ['first_name','last_name','phone','email','team','contractor','extras',
                        'deposit','invoice','move_out','second_stop','move_in','on_way_sms',
                        'last_sms','time_sheet','move_date','brand','status','price_point','notes'];

        const updates = { updated_at: new Date().toISOString() };
        for (const f of fields) {
            if (req.body[f] !== undefined) {
                updates[f] = numericFields.includes(f) ? (parseFloat(req.body[f]) || 0)
                                                       : (req.body[f] === '' ? null : req.body[f]);
            }
        }

        const { data, error } = await supabase.from('jobs').update(updates).eq('id', req.params.id).select().single();
        if (error) return res.status(404).json({ success: false, error: 'Job not found.' });
        res.json({ success: true, data });
    } catch (error) { next(error); }
}

// DELETE /api/jobs/:id
async function remove(req, res, next) {
    try {
        const { error } = await supabase.from('jobs').delete().eq('id', req.params.id);
        if (error) return res.status(404).json({ success: false, error: 'Job not found.' });
        res.json({ success: true, message: 'Job deleted.' });
    } catch (error) { next(error); }
}

module.exports = { getAll, getById, create, update, delete: remove };
