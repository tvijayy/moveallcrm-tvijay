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
            <td>${escapeHtml(s.storage_location || '—')}</td>
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
            <td class="actions-cell">
                <button class="btn btn-sm btn-outline" onclick="editStorage(${s.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteStorage(${s.id})">Delete</button>
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
