// ============================================================
// MoveHome CRM — Supabase Client (replaces Express server)
// ============================================================

const SUPABASE_URL = 'https://fbcmldzculgqddmnepxw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiY21sZHpjdWxncWRkbW5lcHh3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg2MzQzMCwiZXhwIjoyMDg2NDM5NDMwfQ.7JZtOSbA27_kSFLR-xvyjzxYRr8h0rQGcOomk85PkRE';

// Lightweight Supabase REST client (no npm needed — pure fetch)
const db = {
    _url: SUPABASE_URL,
    _key: SUPABASE_ANON_KEY,

    _headers() {
        return {
            'apikey': this._key,
            'Authorization': `Bearer ${this._key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    },

    // ── SELECT ──────────────────────────────────────────────
    async select(table, { columns = '*', filters = {}, search = null, searchCols = [], order = null, limit = 50, offset = 0 } = {}) {
        let url = `${this._url}/rest/v1/${table}?select=${columns}&limit=${limit}&offset=${offset}`;

        for (const [col, val] of Object.entries(filters)) {
            if (val !== null && val !== undefined && val !== 'all') {
                url += `&${col}=eq.${encodeURIComponent(val)}`;
            }
        }

        if (search && searchCols.length > 0) {
            const orParts = searchCols.map(c => `${c}.ilike.*${search}*`).join(',');
            url += `&or=(${encodeURIComponent(orParts)})`;
        }

        if (order) url += `&order=${order}`;

        // Get count
        const countRes = await fetch(url.split('&limit=')[0] + '&limit=0', {
            headers: { ...this._headers(), 'Prefer': 'count=exact' }
        });
        const total = parseInt(countRes.headers.get('Content-Range')?.split('/')[1] || '0');

        const res = await fetch(url, { headers: this._headers() });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Fetch error'); }
        const data = await res.json();
        return { data, total };
    },

    // ── SELECT ONE ──────────────────────────────────────────
    async selectOne(table, id) {
        const res = await fetch(`${this._url}/rest/v1/${table}?id=eq.${id}&limit=1`, {
            headers: this._headers()
        });
        if (!res.ok) throw new Error('Not found');
        const rows = await res.json();
        return rows[0] || null;
    },

    // ── INSERT ──────────────────────────────────────────────
    async insert(table, payload) {
        const res = await fetch(`${this._url}/rest/v1/${table}`, {
            method: 'POST',
            headers: this._headers(),
            body: JSON.stringify(payload)
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Insert error'); }
        const rows = await res.json();
        return Array.isArray(rows) ? rows[0] : rows;
    },

    // ── UPDATE ──────────────────────────────────────────────
    async update(table, id, payload) {
        payload.updated_at = new Date().toISOString();
        const res = await fetch(`${this._url}/rest/v1/${table}?id=eq.${id}`, {
            method: 'PATCH',
            headers: this._headers(),
            body: JSON.stringify(payload)
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Update error'); }
        const rows = await res.json();
        return Array.isArray(rows) ? rows[0] : rows;
    },

    // ── DELETE ──────────────────────────────────────────────
    async delete(table, id) {
        const res = await fetch(`${this._url}/rest/v1/${table}?id=eq.${id}`, {
            method: 'DELETE',
            headers: this._headers()
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Delete error'); }
        return true;
    },

    // ── CUSTOM FILTER ───────────────────────────────────────
    async query(table, params = '') {
        const res = await fetch(`${this._url}/rest/v1/${table}?${params}`, {
            headers: this._headers()
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Query error'); }
        return await res.json();
    }
};

// ============================================================
// AUTH — Login via users table + bcrypt
// ============================================================
const supabaseAuth = {
    async login(email, password) {
        // Fetch user by email
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id,name,email,role,phone,password_hash&limit=1`,
            { headers: db._headers() }
        );
        if (!res.ok) throw new Error('Login failed');
        const users = await res.json();
        if (!users || users.length === 0) throw new Error('Invalid email or password.');

        const user = users[0];

        // Verify bcrypt password via Edge Function (or RPC if available)
        // Since we can't run bcrypt in browser, we use Supabase RPC
        const verifyRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_password`, {
            method: 'POST',
            headers: db._headers(),
            body: JSON.stringify({ p_email: email, p_password: password })
        });

        if (!verifyRes.ok) throw new Error('Auth service error.');
        const verified = await verifyRes.json();
        if (!verified) throw new Error('Invalid email or password.');

        // Store session
        const sessionUser = { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone || null };
        localStorage.setItem('movehome_user', JSON.stringify(sessionUser));
        return sessionUser;
    },

    logout() {
        localStorage.removeItem('movehome_user');
    },

    getUser() {
        return JSON.parse(localStorage.getItem('movehome_user') || 'null');
    },

    isLoggedIn() {
        const u = this.getUser();
        return !!(u && u.id && u.name && u.role);
    }
};
