const { supabase } = require('../config/database');

// GET /api/logs
async function getAll(req, res, next) {
    try {
        const { limit = 50, offset = 0, entity_type, action } = req.query;

        let q = supabase
            .from('activity_logs')
            .select('*, users(name)', { count: 'exact' });

        if (entity_type) q = q.eq('entity_type', entity_type);
        if (action)      q = q.eq('action', action);

        q = q.order('created_at', { ascending: false })
             .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        const { data, error, count } = await q;
        if (error) throw error;

        // Flatten user_name for compatibility
        const rows = (data || []).map(row => ({
            ...row,
            user_name: row.users?.name || null,
            users: undefined
        }));

        res.json({ success: true, data: rows, pagination: { total: count, limit: parseInt(limit), offset: parseInt(offset) } });
    } catch (error) { next(error); }
}

module.exports = { getAll };
