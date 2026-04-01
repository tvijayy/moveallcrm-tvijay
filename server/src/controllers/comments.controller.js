const { supabase } = require('../config/database');

// GET /api/leads/:leadId/comments
async function getByLead(req, res, next) {
    try {
        const { leadId } = req.params;
        const { data, error } = await supabase
            .from('lead_comments')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) { next(err); }
}

// POST /api/leads/:leadId/comments
async function create(req, res, next) {
    try {
        const { leadId } = req.params;
        const { comment, author_name, author_email } = req.body;
        if (!comment?.trim()) return res.status(400).json({ success: false, error: 'Comment is required' });
        const { data, error } = await supabase
            .from('lead_comments')
            .insert({ lead_id: leadId, comment: comment.trim(), author_name: author_name || 'Staff', author_email: author_email || null })
            .select()
            .single();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) { next(err); }
}

// DELETE /api/comments/:id
async function remove(req, res, next) {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('lead_comments').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) { next(err); }
}

module.exports = { getByLead, create, remove };
