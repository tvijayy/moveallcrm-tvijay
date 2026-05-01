// MoveHome CRM – Contractors Module (API-connected)

let currentContractorsPage = 1;
const CONTRACTORS_PER_PAGE = 10;

// Helper: get/set form values by element ID
function getContractorVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function setContractorVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }

async function loadContractorsData() {
    try {
        const catFilter = document.getElementById('contractors-category-filter')?.value;
        const res = await api.get('/contractors', { limit: 200 });
        if (!res.success) { showToast('Error', res.error || 'Failed to load contractors', 'error'); return; }

        let data = res.data || [];
        
        if (catFilter && catFilter !== 'all') {
            data = data.filter(c => c.category === catFilter);
        }

        // Apply global search
        const q = (document.getElementById('global-search')?.value || '').toLowerCase().trim();
        if (q) {
            data = data.filter(c =>
                (c.company || '').toLowerCase().includes(q) ||
                (c.first_name || '').toLowerCase().includes(q) ||
                (c.last_name || '').toLowerCase().includes(q) ||
                (c.email || '').toLowerCase().includes(q) ||
                (c.phone || '').toLowerCase().includes(q) ||
                (c.tag || '').toLowerCase().includes(q)
            );
        }

        renderContractorsTable(data);
    } catch (err) {
        console.error('Load contractors error:', err);
        showToast('Error', 'Failed to load contractors', 'error');
    }
}

function renderContractorsTable(contractors) {
    const tbody = document.getElementById('contractors-tbody');
    if (!tbody) { console.error('contractors-tbody not found'); return; }
    const totalPages = Math.ceil(contractors.length / CONTRACTORS_PER_PAGE);
    const start = (currentContractorsPage - 1) * CONTRACTORS_PER_PAGE;
    const page = contractors.slice(start, start + CONTRACTORS_PER_PAGE);

    // Update count
    const countEl = document.getElementById('contractors-count');
    if (countEl) countEl.textContent = contractors.length;

    if (page.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" class="text-center">No contractors found.</td></tr>';
        renderPagination('contractors-pagination', 1, 0, () => { });
        return;
    }

    tbody.innerHTML = page.map(c => `
        <tr data-id="${c.id}">
            <td>
                <div style="display:flex;align-items:center;gap:6px;justify-content:space-between;">
                    ${escapeHtml(c.company || '—')}
                    <button class="btn btn-ghost" style="padding:4px;min-width:auto;height:auto;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-base);color:var(--text-muted);" onclick="editContractor(${c.id})" title="Expand Contractor Details">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                    </button>
                </div>
            </td>
            <td><span class="category-badge cat-${c.category}">${c.category || '—'}</span></td>
            <td><span class="tag-badge">${escapeHtml(c.tag || '—')}</span></td>
            <td>${escapeHtml(c.rates || '—')}</td>
            <td>${escapeHtml(c.trucks || '—')}</td>
            <td>${escapeHtml(c.first_name || '—')}</td>
            <td>${escapeHtml(c.last_name || '—')}</td>
            <td>${escapeHtml(c.phone || '—')}</td>
            <td>${escapeHtml(c.email || '—')}</td>
            <td>${c.linkedin ? `<a href="${escapeHtml(c.linkedin)}" target="_blank" rel="noopener">View</a>` : '—'}</td>
            <td class="actions-cell">
                <button class="btn btn-sm btn-outline" onclick="editContractor(${c.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteContractor(${c.id})">Delete</button>
            </td>
        </tr>
    `).join('');

    renderPagination('contractors-pagination', currentContractorsPage, totalPages, (p) => { currentContractorsPage = p; loadContractorsData(); });
}

async function editContractor(id) {
    try {
        const res = await api.get(`/contractors/${id}`);
        if (!res.success) { showToast('Error', 'Contractor not found', 'error'); return; }
        const c = res.data;
        document.getElementById('contractor-modal-title').textContent = 'Edit Contractor';
        document.getElementById('contractor-id').value = id;
        setContractorVal('contractor-company', c.company);
        setContractorVal('contractor-category', c.category);
        setContractorVal('contractor-tag', c.tag);
        setContractorVal('contractor-rates', c.rates);
        setContractorVal('contractor-trucks', c.trucks);
        setContractorVal('contractor-first-name', c.first_name);
        setContractorVal('contractor-last-name', c.last_name);
        setContractorVal('contractor-phone', c.phone);
        setContractorVal('contractor-email', c.email);
        setContractorVal('contractor-linkedin', c.linkedin);
        openModal('contractor-modal');
    } catch (err) {
        showToast('Error', 'Failed to load contractor', 'error');
    }
}

async function saveContractor(e) {
    e.preventDefault();
    const editId = getContractorVal('contractor-id');
    const data = {
        company: getContractorVal('contractor-company'),
        category: getContractorVal('contractor-category'),
        tag: getContractorVal('contractor-tag'),
        rates: getContractorVal('contractor-rates'),
        trucks: getContractorVal('contractor-trucks'),
        first_name: getContractorVal('contractor-first-name'),
        last_name: getContractorVal('contractor-last-name'),
        phone: getContractorVal('contractor-phone'),
        email: getContractorVal('contractor-email'),
        linkedin: getContractorVal('contractor-linkedin')
    };

    try {
        const res = editId ? await api.put(`/contractors/${editId}`, data) : await api.post('/contractors', data);
        if (res.success) {
            showToast('Success', editId ? 'Contractor updated' : 'Contractor created', 'success');
            closeModal('contractor-modal');
            loadContractorsData();
        } else {
            showToast('Error', res.error || 'Failed to save', 'error');
        }
    } catch (err) {
        showToast('Error', 'Failed to save contractor', 'error');
    }
}

async function deleteContractor(id) {
    if (!confirm('Delete this contractor?')) return;
    try {
        const res = await api.del(`/contractors/${id}`);
        if (res.success) { showToast('Deleted', 'Contractor removed', 'success'); loadContractorsData(); }
        else showToast('Error', res.error || 'Delete failed', 'error');
    } catch (err) {
        showToast('Error', 'Failed to delete contractor', 'error');
    }
}
