// MoveHome CRM - API compatibility shim
// Proxies old api.get/post/put/del calls → Supabase db client
// All existing modules (leads.js, jobs.js etc.) work unchanged

const api = {
    // ── LEADS ──────────────────────────────────────────────
    async get(path, params) {
        const parts   = path.split('/').filter(Boolean); // e.g. ['leads'] or ['leads','5']
        const table   = this._tableFor(parts[0]);
        const id      = parts[1];

        if (id) {
            const data = await db.selectOne(table, id);
            return data ? { success: true, data } : { success: false, error: 'Not found.' };
        }

        const { status, search, category, limit = 50, offset = 0, view, entity_type, action } = params || {};

        const opts = {
            columns: table === 'users' ? 'id,name,phone,email,role,created_at,updated_at' : '*',
            filters: {},
            search,
            searchCols: this._searchCols(parts[0]),
            order: this._orderFor(parts[0]),
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        if (status   && status   !== 'all') opts.filters.status   = status;
        if (category && category !== 'all') opts.filters.category = category;

        // Jobs view filtering — add to URL manually
        if (view || entity_type || action) {
            return this._customQuery(table, parts[0], params);
        }

        try {
            const { data, total } = await db.select(table, opts);
            return { success: true, data, pagination: { total, limit: parseInt(limit), offset: parseInt(offset) } };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async post(path, data) {
        const parts = path.split('/').filter(Boolean);
        const table = this._tableFor(parts[0]);

        // Auth login — handled separately
        if (parts[0] === 'auth' && parts[1] === 'login') {
            try {
                const user = await supabaseAuth.login(data.email, data.password);
                return { success: true, data: { user } };
            } catch (err) {
                return { success: false, error: err.message };
            }
        }

        try {
            const row = await db.insert(table, data);
            return { success: true, data: row };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async put(path, data) {
        const parts = path.split('/').filter(Boolean);
        const table = this._tableFor(parts[0]);
        const id    = parts[1];
        try {
            const row = await db.update(table, id, data);
            return { success: true, data: row };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async patch(path, data) { return this.put(path, data); },

    async del(path) {
        const parts = path.split('/').filter(Boolean);
        const table = this._tableFor(parts[0]);
        const id    = parts[1];
        try {
            await db.delete(table, id);
            return { success: true, message: 'Deleted.' };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    // ── Helpers ─────────────────────────────────────────────
    _tableFor(segment) {
        const map = {
            leads:       'leads',
            jobs:        'jobs',
            storage:     'storage_masterlist',
            contacts:    'contacts',
            contractors: 'contractors',
            users:       'users',
            logs:        'activity_logs',
            auth:        'users'
        };
        return map[segment] || segment;
    },

    _searchCols(segment) {
        const map = {
            leads:       ['customer_name', 'phone', 'email'],
            jobs:        ['first_name', 'last_name', 'phone', 'email'],
            storage:     ['client_name', 'storage_location', 'email'],
            contacts:    ['client_name', 'first_name', 'last_name', 'email'],
            contractors: ['company', 'first_name', 'last_name', 'email'],
            users:       ['name', 'email', 'phone']
        };
        return map[segment] || [];
    },

    _orderFor(segment) {
        return segment === 'jobs' ? 'move_date.desc' : 'updated_at.desc,created_at.desc';
    },

    async _customQuery(table, segment, params) {
        const { status, view, entity_type, action, limit = 50, offset = 0 } = params || {};
        const today = new Date().toISOString().split('T')[0];
        let qs = `limit=${limit}&offset=${offset}`;

        if (status && status !== 'all') qs += `&status=eq.${status}`;
        if (segment === 'jobs') {
            if (!status || status === 'all') {
                if (view === 'upcoming') qs += `&status=in.(scheduled,in_progress)`;
                else if (view === 'past') qs += `&status=in.(completed,cancelled)`;
                else if (view === 'archived') qs += `&status=eq.archived`;
            }
            qs += '&order=move_date.desc';
        }
        if (entity_type) qs += `&entity_type=eq.${entity_type}`;
        if (action)      qs += `&action=eq.${action}`;

        try {
            const data = await db.query(table, qs);
            return { success: true, data, pagination: { total: data.length, limit: parseInt(limit), offset: parseInt(offset) } };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    // Keep token-related stubs so nothing breaks
    setToken() {}, getToken() { return null; }
};
