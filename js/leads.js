// MoveHome CRM – Leads Module (API-connected)

let currentLeadsPage = 1;
const LEADS_PER_PAGE = 10;
let currentLeadsTab = 'active';

async function loadLeadsData() {
    const statusFilter = currentLeadsTab === 'active'
        ? ['new', 'contacted', 'quoted']
        : ['won', 'lost'];

    try {
        const res = await api.get('/leads', { limit: 200 });
        if (!res.success) { showToast('Error', res.error || 'Failed to load leads', 'error'); return; }

        let leads = res.data || [];
        leads = leads.filter(l => statusFilter.includes(l.status));

        // Apply global search
        const q = (document.getElementById('global-search')?.value || '').toLowerCase().trim();
        if (q) {
            leads = leads.filter(l =>
                (l.customer_name || '').toLowerCase().includes(q) ||
                (l.phone || '').toLowerCase().includes(q) ||
                (l.email || '').toLowerCase().includes(q) ||
                (l.extra_request || '').toLowerCase().includes(q)
            );
        }

        renderLeadsTable(leads);
    } catch (err) {
        console.error('Load leads error:', err);
        showToast('Error', 'Failed to load leads', 'error');
    }
}

function renderLeadsTable(leads) {
    const tbody = document.getElementById('leads-tbody');
    if (!tbody) { console.error('leads-tbody not found'); return; }

    const totalPages = Math.ceil(leads.length / LEADS_PER_PAGE);
    const start = (currentLeadsPage - 1) * LEADS_PER_PAGE;
    const page = leads.slice(start, start + LEADS_PER_PAGE);

    // Update count
    const countEl = document.getElementById('leads-count');
    if (countEl) countEl.textContent = leads.length;

    if (page.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">No leads found.</td></tr>';
        renderPagination('leads-pagination', 1, 0, () => { });
        return;
    }

    tbody.innerHTML = page.map(l => {
        const smsTag = l.last_sms_action
            ? `<span class="tag tag-sms" title="${l.last_sms_at ? 'Sent: ' + formatDate(l.last_sms_at) : ''}">${escapeHtml(l.last_sms_action)}</span>`
            : '<span class="tag tag-none">—</span>';
        const emailTag = l.last_email_action
            ? `<span class="tag tag-email" title="${l.last_email_at ? 'Sent: ' + formatDate(l.last_email_at) : ''}">${escapeHtml(l.last_email_action)}</span>`
            : '<span class="tag tag-none">—</span>';

        return `
        <tr data-id="${l.id}">
            <td>${escapeHtml(l.customer_name || '')}</td>
            <td>${l.updated_at ? formatDate(l.updated_at) : '—'}</td>
            <td><span class="status-badge status-${l.status}">${l.status}</span></td>
            <td>${escapeHtml(l.extra_request || '—')}</td>
            <td>${escapeHtml(l.phone || '—')}</td>
            <td>${escapeHtml(l.email || '—')}</td>
            <td>${l.move_date ? formatDate(l.move_date) : '—'}</td>
            <td>${smsTag}</td>
            <td>${emailTag}</td>
            <td class="actions-cell">
                <button class="btn btn-sm btn-outline" onclick="editLead(${l.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteLead(${l.id})">Delete</button>
            </td>
        </tr>`;
    }).join('');

    renderPagination('leads-pagination', currentLeadsPage, totalPages, (p) => { currentLeadsPage = p; loadLeadsData(); });
}

// Tab switching – HTML uses data-view attribute
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#page-leads .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#page-leads .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.dataset.view || 'active';
            currentLeadsTab = view === 'completed' ? 'completed' : 'active';
            currentLeadsPage = 1;
            loadLeadsData();
        });
    });
});

// Helper: get/set form values by element ID
function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }

async function editLead(id) {
    try {
        const res = await api.get(`/leads/${id}`);
        if (!res.success) { showToast('Error', 'Lead not found', 'error'); return; }
        const lead = res.data;
        document.getElementById('lead-modal-title').textContent = 'Edit Lead';
        document.getElementById('lead-id').value = id;
        setVal('lead-customer-name', lead.customer_name);
        setVal('lead-phone', lead.phone);
        setVal('lead-email', lead.email);
        setVal('lead-move-date', lead.move_date ? lead.move_date.split('T')[0] : '');
        setVal('lead-status', lead.status);
        setVal('lead-extra-request', lead.extra_request);

        // Show SMS/Email actions panel
        const actionsPanel = document.getElementById('lead-actions-panel');
        if (actionsPanel) {
            actionsPanel.classList.remove('hidden');
            const phoneEl = document.getElementById('lead-sms-phone');
            if (phoneEl) phoneEl.textContent = lead.phone || 'No phone number';
            const emailEl = document.getElementById('lead-email-address');
            if (emailEl) emailEl.textContent = lead.email || 'No email';
        }

        openModal('lead-modal');
    } catch (err) {
        showToast('Error', 'Failed to load lead', 'error');
    }
}

// Webhook URLs — map action key → n8n URL (set in your .env / supabase.js)
const WEBHOOK_URLS = {
    sms_no_answer:    'https://n8n.n8k5q.space/webhook/08c85a0c-178d-4957-a5db-b4a4ffbc9b7a',
    sms_after_hours:  'https://n8n.n8k5q.space/webhook/08c85a0c-178d-4957-a5db-b4a4ffbc9b',
    sms_1st_checkin:  'https://n8n.n8k5q.space/webhook/08c85a0c-178d-4957-a5db-b4a4ffbc',
    sms_2nd_nudge:    'https://n8n.n8k5q.space/webhook/08c85a0c-178d-4957-a5db-b4a4',
    sms_3rd_final:    'https://n8n.n8k5q.space/webhook/08c85a0c-178d-4957-a5db-b4',
    email_2m_booking: 'https://n8n.n8k5q.space/webhook/0600069f-3d23-4284-92cf-1b18a1ee0a74',
    email_3m_booking: 'https://n8n.n8k5q.space/webhook/b49d5d57-6fdc-4a00-a171-de12a60f2fd0'
};

const ACTION_LABELS = {
    sms_no_answer:    'SMS No Answer',
    sms_after_hours:  'SMS After Hours',
    sms_1st_checkin:  'SMS 1st Check-in',
    sms_2nd_nudge:    'SMS 2nd Nudge',
    sms_3rd_final:    'SMS 3rd & Final',
    email_2m_booking: 'Email 2M Booking',
    email_3m_booking: 'Email 3M Booking'
};

// Trigger a webhook action for the currently-open lead
async function triggerLeadWebhook(action) {
    const leadId = getVal('lead-id');
    if (!leadId) { showToast('Error', 'No lead selected', 'error'); return; }

    const label = ACTION_LABELS[action] || action;
    const webhookUrl = WEBHOOK_URLS[action];

    if (!confirm(`Send "${label}" to this lead?`)) return;

    showToast('Sending...', `Triggering ${label}...`, 'info');

    const phone = document.getElementById('lead-sms-phone')?.textContent || '';
    const emailAddr = document.getElementById('lead-email-address')?.textContent || '';
    const user = supabaseAuth.getUser();

    const payload = {
        action_key:         action,
        action_label:       label,
        lead_id:            leadId,
        phone,
        email:              emailAddr,
        triggered_by:       user?.name || 'Staff',
        triggered_by_email: user?.email || '',
        timestamp:          new Date().toISOString(),
        source:             'movehome-crm'
    };

    try {
        const user = supabaseAuth.getUser();

        // Call backend proxy → backend calls n8n server-side (avoids CORS)
        const res = await fetch('/api/webhooks/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action,
                leadId,
                triggered_by:       user?.name  || 'Staff',
                triggered_by_email: user?.email || '',
                triggered_by_role:  user?.role  || 'staff'
            })
        });

        const result = await res.json();

        if (result.success) {
            showToast('Sent!', result.message || `"${label}" triggered successfully.`, 'success');
            loadLeadsData();
        } else {
            showToast('Failed', result.error || `${label} failed`, 'error');
        }
    } catch (err) {
        console.error('Webhook error:', err);
        showToast('Error', 'Failed to trigger webhook', 'error');
    }
}

async function saveLead(e) {
    e.preventDefault();
    const editId = getVal('lead-id');
    const data = {
        customer_name: getVal('lead-customer-name'),
        phone: getVal('lead-phone'),
        email: getVal('lead-email'),
        move_date: getVal('lead-move-date') || null,
        status: getVal('lead-status'),
        extra_request: getVal('lead-extra-request') || null
    };

    try {
        let res;
        if (editId) {
            res = await api.put(`/leads/${editId}`, data);
        } else {
            res = await api.post('/leads', data);
        }
        if (res.success) {
            showToast('Success', editId ? 'Lead updated' : 'Lead created', 'success');
            closeModal('lead-modal');
            loadLeadsData();
        } else {
            showToast('Error', res.error || 'Failed to save lead', 'error');
        }
    } catch (err) {
        console.error('Save lead error:', err);
        showToast('Error', 'Failed to save lead', 'error');
    }
}

async function deleteLead(id) {
    if (!confirm('Delete this lead?')) return;
    try {
        const res = await api.del(`/leads/${id}`);
        if (res.success) { showToast('Deleted', 'Lead removed', 'success'); loadLeadsData(); }
        else showToast('Error', res.error || 'Delete failed', 'error');
    } catch (err) {
        showToast('Error', 'Failed to delete lead', 'error');
    }
}
