// MoveHome CRM – Storage Module (API-connected)

let currentStoragePage = 1;
const STORAGE_PER_PAGE = 10;
let currentStorageTab = 'active';

// Helper: get/set form values by element ID
function getStorageVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function setStorageVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }

async function loadStorageData() {
    try {
        const res = await api.get('/storage', { status: currentStorageTab, limit: 200 });
        if (!res.success) { showToast('Error', res.error || 'Failed to load storage', 'error'); return; }

        let data = res.data || [];

        // Apply global search
        const q = (document.getElementById('global-search')?.value || '').toLowerCase().trim();
        if (q) {
            data = data.filter(s =>
                (s.client_name || '').toLowerCase().includes(q) ||
                (s.storage_location || '').toLowerCase().includes(q) ||
                (s.email || '').toLowerCase().includes(q) ||
                (s.mobile || '').toLowerCase().includes(q) ||
                (s.unit_numbers || '').toLowerCase().includes(q)
            );
        }

        renderStorageTable(data);
    } catch (err) {
        console.error('Load storage error:', err);
        showToast('Error', 'Failed to load storage', 'error');
    }
}

function renderStorageTable(entries) {
    const tbody = document.getElementById('storage-tbody');
    if (!tbody) { console.error('storage-tbody not found'); return; }
    const totalPages = Math.ceil(entries.length / STORAGE_PER_PAGE);
    const start = (currentStoragePage - 1) * STORAGE_PER_PAGE;
    const page = entries.slice(start, start + STORAGE_PER_PAGE);

    // Update count
    const countEl = document.getElementById('storage-count');
    if (countEl) countEl.textContent = entries.length;

    if (page.length === 0) {
        tbody.innerHTML = '<tr><td colspan="14" class="text-center">No storage plans found.</td></tr>';
        renderPagination('storage-pagination', 1, 0, () => { });
        return;
    }

    tbody.innerHTML = page.map(s => {
        const sell = parseFloat(s.sell_price) || 0;
        const buy = parseFloat(s.buy_price) || 0;
        const margin = sell - buy;
        return `
        <tr data-id="${s.id}">
            <td style="position:sticky;left:0;z-index:10;background:var(--bg-surface);min-width:140px;">${escapeHtml(s.storage_location || '—')}</td>
            <td>${s.move_in_date ? formatDate(s.move_in_date) : '—'}</td>
            <td>${escapeHtml(s.unit_numbers || '—')}</td>
            <td>${escapeHtml(s.padlock_code || '—')}</td>
            <td>${escapeHtml(s.client_name || '—')}</td>
            <td>${escapeHtml(s.mobile || '—')}</td>
            <td>${escapeHtml(s.email || '—')}</td>
            <td>${escapeHtml(s.phone || '—')}</td>
            <td>${escapeHtml(s.repeated_invoice || '—')}</td>
            <td>${escapeHtml(s.stripe_sub || '—')}</td>
            <td class="text-success">$${sell.toFixed(2)}</td>
            <td class="text-danger">$${buy.toFixed(2)}</td>
            <td class="${margin >= 0 ? 'text-success' : 'text-danger'}">$${margin.toFixed(2)}</td>
            <td style="max-width:180px;white-space:normal;font-size:0.75rem;color:var(--text-secondary);">${escapeHtml(s.comments || '—')}</td>
            <td>
                <button class="ctx-dots-btn" onclick="event.stopPropagation();showStorageMenu(this,${s.id},'${escapeJsAttr(s.comments || '')}')">⋮</button>
            </td>
        </tr>`;
    }).join('');

    renderPagination('storage-pagination', currentStoragePage, totalPages, (p) => { currentStoragePage = p; loadStorageData(); });
}

// Tab switching – HTML uses data-view attribute
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#page-storage .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#page-storage .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.dataset.view || 'active';
            currentStorageTab = view;
            currentStoragePage = 1;
            loadStorageData();
        });
    });
});

async function editStorage(id) {
    try {
        const res = await api.get(`/storage/${id}`);
        if (!res.success) { showToast('Error', 'Storage plan not found', 'error'); return; }
        const s = res.data;
        document.getElementById('storage-modal-title').textContent = 'Edit Storage Plan';
        document.getElementById('storage-id').value = id;
        setStorageVal('storage-client-name', s.client_name);
        setStorageVal('storage-location', s.storage_location);
        setStorageVal('storage-move-in-date', s.move_in_date ? s.move_in_date.split('T')[0] : '');
        setStorageVal('storage-unit-numbers', s.unit_numbers);
        setStorageVal('storage-padlock-code', s.padlock_code);
        setStorageVal('storage-mobile', s.mobile);
        setStorageVal('storage-email', s.email);
        setStorageVal('storage-phone', s.phone);
        setStorageVal('storage-repeated-invoice', s.repeated_invoice);
        setStorageVal('storage-stripe', s.stripe_sub);
        setStorageVal('storage-sell-price', s.sell_price);
        setStorageVal('storage-buy-price', s.buy_price);
        setStorageVal('storage-status', s.status);
        openModal('storage-modal');
    } catch (err) {
        showToast('Error', 'Failed to load storage plan', 'error');
    }
}

async function saveStorage(e) {
    e.preventDefault();
    const editId = getStorageVal('storage-id');
    const sellPrice = parseFloat(getStorageVal('storage-sell-price')) || 0;
    const buyPrice = parseFloat(getStorageVal('storage-buy-price')) || 0;
    const data = {
        client_name: getStorageVal('storage-client-name'),
        storage_location: getStorageVal('storage-location'),
        move_in_date: getStorageVal('storage-move-in-date') || null,
        unit_numbers: getStorageVal('storage-unit-numbers'),
        padlock_code: getStorageVal('storage-padlock-code'),
        mobile: getStorageVal('storage-mobile'),
        email: getStorageVal('storage-email'),
        phone: getStorageVal('storage-phone'),
        repeated_invoice: getStorageVal('storage-repeated-invoice'),
        stripe_sub: getStorageVal('storage-stripe'),
        sell_price: sellPrice,
        buy_price: buyPrice,
        margin: sellPrice - buyPrice,
        status: getStorageVal('storage-status') || 'active'
    };

    try {
        const res = editId ? await api.put(`/storage/${editId}`, data) : await api.post('/storage', data);
        if (res.success) {
            showToast('Success', editId ? 'Storage updated' : 'Storage created', 'success');
            closeModal('storage-modal');
            loadStorageData();
        } else {
            showToast('Error', res.error || 'Failed to save', 'error');
        }
    } catch (err) {
        showToast('Error', 'Failed to save storage plan', 'error');
    }
}

async function deleteStorage(id) {
    if (!confirm('Delete this storage plan?')) return;
    try {
        const res = await api.del(`/storage/${id}`);
        if (res.success) { showToast('Deleted', 'Storage plan removed', 'success'); loadStorageData(); }
        else showToast('Error', res.error || 'Delete failed', 'error');
    } catch (err) {
        showToast('Error', 'Failed to delete', 'error');
    }
}

async function archiveStorage(id) {
    if (!confirm('Move this storage plan to archive?')) return;
    try {
        const res = await api.put(`/storage/${id}`, { status: 'archived' });
        if (res.success) { showToast('Archived', 'Storage plan archived', 'success'); loadStorageData(); }
        else showToast('Error', res.error || 'Archive failed', 'error');
    } catch (err) {
        showToast('Error', 'Failed to archive', 'error');
    }
}

let activeStorageCtxMenu = null;
function closeStorageCtxMenu() {
    if (activeStorageCtxMenu) { activeStorageCtxMenu.remove(); activeStorageCtxMenu = null; }
}
function showStorageMenu(btn, id, comments) {
    closeStorageCtxMenu();
    const menu = document.createElement('div');
    menu.className = 'job-ctx-menu'; // reuse existing menu styles
    const safeComments = escapeJsAttr(comments || '');
    menu.innerHTML = `
        <div class="ctx-item" onclick="editStorage(${id});closeStorageCtxMenu()">✏️ Edit</div>
        <div class="ctx-divider"></div>
        <div class="ctx-item" onclick="openStorageComment(${id}, '${safeComments}');closeStorageCtxMenu()">💬 Comment</div>
        <div class="ctx-divider"></div>
        <div class="ctx-item" onclick="archiveStorage(${id});closeStorageCtxMenu()">📦 Move to Archive</div>
        <div class="ctx-divider"></div>
        <div class="ctx-item ctx-item-danger" onclick="deleteStorage(${id});closeStorageCtxMenu()">🗑️ Delete</div>
    `;
    const rect = btn.getBoundingClientRect();
    menu.style.top  = \`\${rect.bottom + window.scrollY + 4}px\`;
    menu.style.left = \`\${rect.left + window.scrollX - 120}px\`;
    document.body.appendChild(menu);
    activeStorageCtxMenu = menu;
    setTimeout(() => document.addEventListener('click', closeStorageCtxMenu, { once: true }), 50);
}

function openStorageComment(id, currentComment) {
    document.getElementById('storage-comment-id').value = id;
    document.getElementById('storage-public-comment').value = currentComment || '';
    openModal('storage-comment-modal');
}

async function saveStorageComment() {
    const id = document.getElementById('storage-comment-id').value;
    const comment = document.getElementById('storage-public-comment').value.trim();
    
    if (!id) return;
    
    try {
        const res = await api.put(\`/storage/\${id}\`, { comments: comment });
        if (res.success) {
            showToast('Success', 'Comment saved', 'success');
            closeModal('storage-comment-modal');
            loadStorageData();
        } else {
            showToast('Error', res.error || 'Failed to save comment', 'error');
        }
    } catch (err) {
        showToast('Error', 'Network error', 'error');
    }
}
