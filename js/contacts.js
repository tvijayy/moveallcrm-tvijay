// MoveHome CRM – Contacts Module (API-connected)

let currentContactsPage = 1;
const CONTACTS_PER_PAGE = 10;

// Helper: get/set form values by element ID
function getContactVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function setContactVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }

async function loadContactsData() {
    try {
        const catFilter = document.getElementById('contacts-category-filter');
        const category = catFilter ? catFilter.value : '';
        const params = { limit: 200 };
        if (category && category !== 'all') params.category = category;
        const res = await api.get('/contacts', params);
        if (!res.success) { showToast('Error', res.error || 'Failed to load contacts', 'error'); return; }

        let data = res.data || [];

        // Apply global search
        const q = (document.getElementById('global-search')?.value || '').toLowerCase().trim();
        if (q) {
            data = data.filter(c =>
                (c.client_name || '').toLowerCase().includes(q) ||
                (c.first_name || '').toLowerCase().includes(q) ||
                (c.last_name || '').toLowerCase().includes(q) ||
                (c.email || '').toLowerCase().includes(q) ||
                (c.mobile || '').toLowerCase().includes(q) ||
                (c.address || '').toLowerCase().includes(q)
            );
        }

        renderContactsTable(data);
    } catch (err) {
        console.error('Load contacts error:', err);
        showToast('Error', 'Failed to load contacts', 'error');
    }
}

function renderContactsTable(contacts) {
    const tbody = document.getElementById('contacts-tbody');
    if (!tbody) { console.error('contacts-tbody not found'); return; }
    const totalPages = Math.ceil(contacts.length / CONTACTS_PER_PAGE);
    const start = (currentContactsPage - 1) * CONTACTS_PER_PAGE;
    const page = contacts.slice(start, start + CONTACTS_PER_PAGE);

    // Update count
    const countEl = document.getElementById('contacts-count');
    if (countEl) countEl.textContent = contacts.length;

    if (page.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="text-center">No contacts found.</td></tr>';
        renderPagination('contacts-pagination', 1, 0, () => { });
        return;
    }

    tbody.innerHTML = page.map(c => `
        <tr data-id="${c.id}">
            <td>${escapeHtml(c.client_name || '—')}</td>
            <td title="${escapeHtml(c.address || '')}">${truncate(c.address || '—', 25)}</td>
            <td>${escapeHtml(c.first_name || '—')}</td>
            <td>${escapeHtml(c.last_name || '—')}</td>
            <td>${escapeHtml(c.email || '—')}</td>
            <td>${escapeHtml(c.mobile || '—')}</td>
            <td><span class="category-badge cat-${c.category}">${c.category || '—'}</span></td>
            <td>${escapeHtml(c.related_jobs || '—')}</td>
            <td>${c.last_move_date ? formatDate(c.last_move_date) : '—'}</td>
            <td title="${escapeHtml(c.last_move_in || '')}">${truncate(c.last_move_in || '—', 20)}</td>
            <td>${escapeHtml(c.last_team || '—')}</td>
            <td class="actions-cell">
                <button class="btn btn-sm btn-outline" onclick="editContact(${c.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteContact(${c.id})">Delete</button>
            </td>
        </tr>
    `).join('');

    renderPagination('contacts-pagination', currentContactsPage, totalPages, (p) => { currentContactsPage = p; loadContactsData(); });
}

async function editContact(id) {
    try {
        const res = await api.get(`/contacts/${id}`);
        if (!res.success) { showToast('Error', 'Contact not found', 'error'); return; }
        const c = res.data;
        document.getElementById('contact-modal-title').textContent = 'Edit Contact';
        document.getElementById('contact-id').value = id;
        setContactVal('contact-client-name', c.client_name);
        setContactVal('contact-address', c.address);
        setContactVal('contact-first-name', c.first_name);
        setContactVal('contact-last-name', c.last_name);
        setContactVal('contact-email', c.email);
        setContactVal('contact-mobile', c.mobile);
        setContactVal('contact-category', c.category);
        setContactVal('contact-related-jobs', c.related_jobs);
        setContactVal('contact-last-move-date', c.last_move_date ? c.last_move_date.split('T')[0] : '');
        setContactVal('contact-last-move-in', c.last_move_in);
        setContactVal('contact-last-team', c.last_team);
        openModal('contact-modal');
    } catch (err) {
        showToast('Error', 'Failed to load contact', 'error');
    }
}

async function saveContact(e) {
    e.preventDefault();
    const editId = getContactVal('contact-id');
    const data = {
        client_name: getContactVal('contact-client-name'),
        address: getContactVal('contact-address'),
        first_name: getContactVal('contact-first-name'),
        last_name: getContactVal('contact-last-name'),
        email: getContactVal('contact-email'),
        mobile: getContactVal('contact-mobile'),
        category: getContactVal('contact-category'),
        related_jobs: getContactVal('contact-related-jobs'),
        last_move_date: getContactVal('contact-last-move-date') || null,
        last_move_in: getContactVal('contact-last-move-in'),
        last_team: getContactVal('contact-last-team')
    };

    try {
        const res = editId ? await api.put(`/contacts/${editId}`, data) : await api.post('/contacts', data);
        if (res.success) {
            showToast('Success', editId ? 'Contact updated' : 'Contact created', 'success');
            closeModal('contact-modal');
            loadContactsData();
        } else {
            showToast('Error', res.error || 'Failed to save', 'error');
        }
    } catch (err) {
        showToast('Error', 'Failed to save contact', 'error');
    }
}

async function deleteContact(id) {
    if (!confirm('Delete this contact?')) return;
    try {
        const res = await api.del(`/contacts/${id}`);
        if (res.success) { showToast('Deleted', 'Contact removed', 'success'); loadContactsData(); }
        else showToast('Error', res.error || 'Delete failed', 'error');
    } catch (err) {
        showToast('Error', 'Failed to delete contact', 'error');
    }
}
