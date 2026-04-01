const { supabase } = require('../config/database');

const ALLOWED_FIELDS = ['heavy_items', 'extra_requests', 'access_issues'];

// GET /api/dropdown-options?field=heavy_items
async function getOptions(req, res, next) {
    try {
        const { field } = req.query;
        let q = supabase.from('lead_dropdown_options').select('*').order('option_value');
        if (field && ALLOWED_FIELDS.includes(field)) q = q.eq('field_name', field);
        const { data, error } = await q;
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) { next(error); }
}

// POST /api/dropdown-options  { field_name, option_value }  — admin only
async function addOption(req, res, next) {
    try {
        const { field_name, option_value } = req.body;
        if (!ALLOWED_FIELDS.includes(field_name)) {
            return res.status(400).json({ success: false, error: 'Invalid field_name.' });
        }
        if (!option_value?.trim()) {
            return res.status(400).json({ success: false, error: 'option_value is required.' });
        }
        const { data, error } = await supabase
            .from('lead_dropdown_options')
            .insert({ field_name, option_value: option_value.trim() })
            .select().single();
        if (error) {
            if (error.code === '23505') return res.status(409).json({ success: false, error: 'Option already exists.' });
            throw error;
        }
        res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
}

// DELETE /api/dropdown-options/:id  — admin only
async function deleteOption(req, res, next) {
    try {
        const { error } = await supabase.from('lead_dropdown_options').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true, message: 'Option deleted.' });
    } catch (error) { next(error); }
}

module.exports = { getOptions, addOption, deleteOption };
