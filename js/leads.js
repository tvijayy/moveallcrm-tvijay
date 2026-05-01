// MoveHome CRM – Leads Module V3

let currentLeadsPage = 1;
const LEADS_PER_PAGE = 15;
let currentLeadsTab = 'active';
let allLeadsCache = [];
let dropdownOptions = { heavy_items: [], extra_requests: [], access_issues: [] };
let activeCtxMenu = null;

// ─── Comments state ───────────────────────────────────────────────────────────
let currentCommentLeadId   = null;
let currentCommentLeadName = '';

function openCommentsPanel(leadId, leadName) {
    try {
        currentCommentLeadId   = leadId;
        currentCommentLeadName = leadName;
        document.getElementById('comments-panel-title').textContent = `Comments — ${leadName}`;
        document.getElementById('comments-panel-sub').textContent   = 'All comments for this lead';
        document.getElementById('comment-input').value = '';
        
        const panel = document.getElementById('comments-panel');
        const overlay = document.getElementById('comments-overlay');
        
        panel.classList.add('open');
        overlay.classList.add('open');
        
        loadComments(leadId);
    } catch (e) {
        alert("CRITICAL UI ERROR: " + e.message);
    }
}

function closeCommentsPanel() {
    document.getElementById('comments-panel').classList.remove('open');
    document.getElementById('comments-overlay').classList.remove('open');
    currentCommentLeadId = null;
}

async function loadComments(leadId) {
    const list = document.getElementById('comments-list');
    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted)">Loading…</div>';
    try {
        const res = await fetch(`${db._url}/rest/v1/lead_comments?lead_id=eq.${leadId}&order=created_at.desc`, {
            headers: db._headers()
        });
        if (!res.ok) {
            const errTxt = await res.text();
            console.error('API Error:', errTxt);
            throw new Error(errTxt);
        }
        const data = await res.json();
        renderComments(data || []);
    } catch (err) {
        console.error("Comments fetch error:", err);
        list.innerHTML = `<div style="padding:24px;color:var(--danger)">Error loading: ${escapeHtml(err.message)}</div>`;
    }
}

function renderComments(comments) {
    const list = document.getElementById('comments-list');
    if (comments.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">
            <div style="font-size:2rem;margin-bottom:8px">💬</div>
            <div>No comments yet. Be the first!</div>
        </div>`;
        return;
    }
    const user = supabaseAuth?.getUser?.() || null;
    list.innerHTML = comments.map(c => {
        const canDelete = isAdmin() || (user && user.email === c.author_email);
        const ago = timeAgo(c.created_at);
        const initials = (c.author_name || 'S').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
        
        // Safely pass the text to the edit prompt
        const safeComment = escapeJsAttr(c.comment);

        return `<div class="comment-item" id="comment-${c.id}">
            <div class="comment-avatar">${initials}</div>
            <div class="comment-body">
                <div class="comment-meta">
                    <strong>${escapeHtml(c.author_name || 'Staff')}</strong>
                    <span class="comment-time">${ago}</span>
                    <div style="margin-left:auto; display:flex; gap:6px;">
                        ${canDelete ? `<button class="comment-delete-btn" onclick="editSingleComment(${c.id}, '${safeComment}')" title="Edit">✏️</button>` : ''}
                        ${canDelete ? `<button class="comment-delete-btn" onclick="deleteComment(${c.id})" title="Delete">🗑</button>` : ''}
                    </div>
                </div>
                <div class="comment-text">${escapeHtml(c.comment).replace(/\n/g,'<br>')}</div>
            </div>
        </div>`;
    }).join('');
}

async function addComment() {
    const input = document.getElementById('comment-input');
    const text  = input.value.trim();
    if (!text) { input.focus(); return; }
    if (!currentCommentLeadId) return;

    const btn = document.querySelector('.comments-input-area .btn-primary');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    try {
        const user = supabaseAuth?.getUser?.() || null;
        const res = await fetch(`${db._url}/rest/v1/lead_comments`, {
            method: 'POST',
            headers: db._headers(),
            body: JSON.stringify({
                lead_id:      currentCommentLeadId,
                comment:      text,
                author_name:  user?.name  || user?.email || 'Staff',
                author_email: user?.email || null,
            })
        });
        if (res.ok) {
            input.value = '';
            loadComments(currentCommentLeadId);
            alert("Success! Your comment has been saved to the database. You should see it in the list now.");
        } else {
            const errTxt = await res.text();
            console.error('Failed to add comment:', errTxt);
            alert("Database Error: " + errTxt);
        }
    } catch (err) {
        alert("Network Error: " + err.message);
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<span>💬</span> Add Comment'; }
    }
}

async function deleteComment(id) {
    if (!confirm('Delete this comment?')) return;
    try {
        const res = await fetch(`${db._url}/rest/v1/lead_comments?id=eq.${id}`, {
            method: 'DELETE',
            headers: db._headers()
        });
        if (res.ok) {
            document.getElementById(`comment-${id}`)?.remove();
            showToast('Deleted', 'Comment removed', 'success');
            // Check if list is now empty
            const list = document.getElementById('comments-list');
            if (list && !list.querySelector('.comment-item')) {
                renderComments([]);
            }
        } else {
            showToast('Error', 'Failed to delete', 'error');
        }
    } catch (err) {
        showToast('Error', 'Failed to delete comment', 'error');
    }
}

async function editSingleComment(id, currentText) {
    const newText = prompt("Edit your comment:", currentText);
    if (newText === null || newText.trim() === currentText || !newText.trim()) return;
    
    try {
        const res = await fetch(`${db._url}/rest/v1/lead_comments?id=eq.${id}`, {
            method: 'PATCH',
            headers: db._headers(),
            body: JSON.stringify({ comment: newText.trim() })
        });
        if (res.ok) {
            if (currentCommentLeadId) loadComments(currentCommentLeadId);
        } else {
            alert('Failed to save edited comment.');
        }
    } catch(err) {
        alert('Network error while editing comment.');
    }
}

// Submit on Ctrl+Enter in the textarea
document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter' && document.activeElement?.id === 'comment-input') {
        addComment();
    }
});

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    // ── Active statuses ────────────────────────────────────────────
    new_to_call:            { label: 'New to call',              color: '#f59e0b' },   // amber
    booking_form_sent:      { label: 'Booking Form Sent',        color: '#3b82f6' },   // blue
    no_ans_sms_sent:        { label: 'No Ans SMS Sent',          color: '#ef4444' },   // red
    checkin_sms_sent:       { label: 'Checkin SMS Sent',         color: '#14b8a6' },   // teal
    email_sent:             { label: 'Email Sent',               color: '#06b6d4' },   // cyan
    left_vm:                { label: 'Left VM',                  color: '#8b5cf6' },   // violet
    sms_sent:               { label: 'SMS Sent',                 color: '#84cc16' },   // lime
    discussing_considering: { label: 'Discussing / Considering', color: '#a855f7' },   // purple
    to_be_scheduled:        { label: 'To Be Scheduled',          color: '#f97316' },   // orange
    awaiting_quote:         { label: 'Awaiting Quote',           color: '#ec4899' },   // hot pink
    ready_to_book:          { label: 'Ready to Book',            color: '#10b981' },   // emerald
    still_deciding:         { label: 'Still Deciding',           color: '#eab308' },   // yellow
    need_better_price:      { label: 'Need Better Price',        color: '#f43f5e' },   // rose
    check_reply:            { label: 'Check Reply',              color: '#38bdf8' },   // sky
    // ── Terminal statuses ─────────────────────────────────────────
    quoted:                 { label: 'Quoted',                   color: '#fb923c' },   // orange-amber
    won:                    { label: 'Won',                      color: '#22c55e' },   // bright green
    lost:                   { label: 'Lost',                     color: '#94a3b8' },   // slate
    archive:                { label: 'Archive',                  color: '#6b7280' },   // grey
    // ── Legacy ───────────────────────────────────────────────────
    new:                    { label: 'New',                      color: '#60a5fa' },   // light blue
    contacted:              { label: 'Contacted',                color: '#818cf8' },   // indigo
};


const ALL_STATUS_OPTIONS = [
    'booking_form_sent','new_to_call','no_ans_sms_sent','checkin_sms_sent',
    'ready_to_book','still_deciding','need_better_price','check_reply',
    'sms_sent','left_vm','quoted','email_sent','discussing_considering',
    'to_be_scheduled','awaiting_quote','won','lost','archive'
];


const ARCHIVE_STATUSES = ['archive'];

const ACTION_LABELS = {
    sms_no_answer:    'SMS No Ans',
    sms_after_hours:  'SMS After Hours',
    sms_1st_checkin:  'SMS 1st Check-In',
    sms_2nd_nudge:    'SMS 2nd Nudge',
    sms_3rd_final:    'SMS 3rd Final Try',
    email_2m_booking: 'Send 2M Booking Form',
    email_3m_booking: 'Send 3M Booking Form'
};

// Maps webhook action → leads table column to mark 'sent'
const SMS_FIELD_MAP = {
    sms_no_answer:    'sms_no_ans',
    sms_after_hours:  'sms_after_hours',
    sms_1st_checkin:  'sms_1st_checkin',
    sms_2nd_nudge:    'sms_2nd_nudge',
    sms_3rd_final:    'sms_3rd_final',
    email_2m_booking: { field: 'email_booking_sent', val: 'email_2m' },
    email_3m_booking: { field: 'email_booking_sent', val: 'email_3m' }
};

// ─── Load dropdown options ──────────────────────────────────────────────────
async function loadDropdownOptions() {
    try {
        const res = await fetch('/api/dropdown-options');
        const json = await res.json();
        if (json.success) {
            dropdownOptions.heavy_items    = json.data.filter(o => o.field_name === 'heavy_items');
            dropdownOptions.extra_requests = json.data.filter(o => o.field_name === 'extra_requests');
            dropdownOptions.access_issues  = json.data.filter(o => o.field_name === 'access_issues');
        }
    } catch (e) { console.warn('Could not load dropdown options', e); }
}

// ─── Inline save ────────────────────────────────────────────────────────────
async function inlineSave(id, field, value) {
    try {
        const safe = (value === '' || value === undefined) ? null : value;
        const res = await api.put(`/leads/${id}`, { [field]: safe });
        if (!res.success) {
            showToast('Error', res.error || 'Save failed', 'error');
            return false;
        }
        if (field === 'status') {
            const sc = STATUS_CONFIG[value] || { color: '#6b7280' };
            const sel = document.querySelector(`tr[data-id="${id}"] .inline-status-sel`);
            if (sel) {
                sel.style.background  = sc.color + '22';
                sel.style.color       = sc.color;
                sel.style.borderColor = sc.color + '60';
            }
            if (value === 'lost') {
                const completeRes = await api.put(`/leads/${id}`, { is_completed: true });
                if (completeRes.success) {
                    showToast('Moved', 'Lead moved to Completed tab', 'success');
                    loadLeadsData();
                }
            }
        }
        return true;
    } catch (err) {
        showToast('Error', 'Failed to save', 'error');
        return false;
    }
}


// ─── Mark as complete (only sets is_completed flag, status stays as-is) ──────
async function markLeadComplete(id) {
    const ok = await inlineSave(id, 'is_completed', true);
    if (ok) {
        showToast('Completed', 'Lead moved to Completed tab ✓', 'success');
        loadLeadsData();
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    return formatDate(dateStr);
}

function truncate(str, n) { if (!str) return '—'; return str.length > n ? str.slice(0, n) + '…' : str; }

function smsBadge(value) {
    const sent = value === 'sent';
    return `<span class="sms-inline-badge ${sent ? 'sms-ib-sent' : 'sms-ib-not'}">${sent ? '✓ Sent' : 'Not Sent'}</span>`;
}

function leadSourceBadge(src) {
    if (!src) return '—';
    const colors = {
        'Inbound Email':      '#3b82f6',
        'Inbound Phone Call': '#8b5cf6',
        'Manually Added':     '#f59e0b',
        'Referral':           '#10b981',
        'Google Ads':         '#ef4444',
        'Butler Lead':        '#f97316',
    };
    const c = colors[src] || '#6b7280';
    return `<span class="inline-pill" style="background:${c}20;color:${c};border:1px solid ${c}50">${escapeHtml(src)}</span>`;
}

// ─── Context menu (3-dots) ───────────────────────────────────────────────────
function closeCtxMenu() {
    if (activeCtxMenu) { activeCtxMenu.remove(); activeCtxMenu = null; }
}

function showLeadMenu(btn, leadId, phone, email, leadName) {
    closeCtxMenu();

    const menu = document.createElement('div');
    menu.className = 'lead-ctx-menu';
    
    // We are generating HTML *inside* JS, so we must safely encode these strings AGAIN
    // so they don't break the onclick=".." attributes being created.
    const safeNm = escapeJsAttr(leadName || 'Lead');
    const safePh = escapeJsAttr(phone || '');
    const safeEm = escapeJsAttr(email || '');

    menu.innerHTML = `
        <div class="ctx-item" onclick="editLead(${leadId});closeCtxMenu()">
            ✏️ Edit Lead
        </div>
        <div class="ctx-divider"></div>
        <div class="ctx-item" onclick="triggerFromMenu(${leadId},'sms_no_answer','${safePh}','${safeEm}')">
            📵 SMS No Ans
        </div>
        <div class="ctx-item" onclick="triggerFromMenu(${leadId},'sms_after_hours','${safePh}','${safeEm}')">
            🌙 SMS After Hours
        </div>
        <div class="ctx-item" onclick="triggerFromMenu(${leadId},'sms_1st_checkin','${safePh}','${safeEm}')">
            🔔 SMS 1st Check-In
        </div>
        <div class="ctx-item" onclick="triggerFromMenu(${leadId},'sms_2nd_nudge','${safePh}','${safeEm}')">
            🔔 SMS 2nd Nudge
        </div>
        <div class="ctx-item" onclick="triggerFromMenu(${leadId},'sms_3rd_final','${safePh}','${safeEm}')">
            🏳️ SMS 3rd Final Try
        </div>
        <div class="ctx-divider"></div>
        <div class="ctx-item" onclick="triggerFromMenu(${leadId},'email_2m_booking','${safePh}','${safeEm}')">
            ✉️ Send 2M Booking Form
        </div>
        <div class="ctx-item" onclick="triggerFromMenu(${leadId},'email_3m_booking','${safePh}','${safeEm}')">
            ✉️ Send 3M Booking Form
        </div>
        <div class="ctx-divider"></div>
        ${currentLeadsTab === 'completed' ? `
        <div class="ctx-item" onclick="moveToActiveLeads(${leadId});closeCtxMenu()">
            ↩️ Move to Active Leads
        </div>
        <div class="ctx-divider"></div>
        ` : ''}
        <div class="ctx-item ctx-item-danger" onclick="deleteLead(${leadId});closeCtxMenu()">
            🗑️ Delete Lead
        </div>
    `;

    const rect = btn.getBoundingClientRect();
    menu.style.top  = `${rect.bottom + window.scrollY + 4}px`;
    menu.style.left = `${rect.left + window.scrollX - 180}px`;
    document.body.appendChild(menu);
    activeCtxMenu = menu;

    setTimeout(() => document.addEventListener('click', closeCtxMenu, { once: true }), 50);
}

// ─── Trigger webhook from context menu ───────────────────────────────────────
async function triggerFromMenu(leadId, action, phone, email) {
    closeCtxMenu();
    const label = ACTION_LABELS[action] || action;
    if (!confirm(`Send "${label}" ?`)) return;
    showToast('Sending…', `Triggering ${label}…`, 'info');
    try {
        const user = supabaseAuth.getUser();
        const res = await fetch('/api/webhooks/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action, leadId,
                triggered_by:       user?.name  || 'Staff',
                triggered_by_email: user?.email || '',
                triggered_by_role:  user?.role  || 'staff'
            })
        });
        const result = await res.json();
        if (result.success) {
            showToast('Sent!', `"${label}" triggered.`, 'success');
            // Mark SMS/Email field in DB
            const mapping = SMS_FIELD_MAP[action];
            if (mapping) {
                if (typeof mapping === 'string') {
                    await inlineSave(leadId, mapping, 'sent');
                } else {
                    await inlineSave(leadId, mapping.field, mapping.val);
                }
            }
            loadLeadsData();
        } else {
            showToast('Failed', result.error || `${label} failed`, 'error');
        }
    } catch (err) {
        showToast('Error', 'Failed to trigger action', 'error');
    }
}

async function moveToActiveLeads(id) {
    try {
        const res = await api.put(`/leads/${id}`, { is_completed: false });
        if (res.success) {
            showToast('Success', 'Lead moved to Active tab', 'success');
            loadLeadsData();
        } else {
            showToast('Error', res.error || 'Failed to move lead', 'error');
        }
    } catch (err) {
        showToast('Error', 'Failed to move lead', 'error');
    }
}

// ─── Build inline selects ────────────────────────────────────────────────────
function buildStatusSelect(leadId, currentStatus) {
    const sc = STATUS_CONFIG[currentStatus] || { label: currentStatus, color: '#6b7280' };
    const opts = ALL_STATUS_OPTIONS.map(s => {
        const c = STATUS_CONFIG[s] || { label: s };
        return `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${c.label}</option>`;
    }).join('');
    return `<select class="inline-select inline-status-sel"
        style="background:${sc.color}22;color:${sc.color};border:1px solid ${sc.color}60"
        onchange="inlineSave(${leadId},'status',this.value)">
        ${opts}
    </select>`;
}

function buildFieldSelect(leadId, field, currentValue, options, adminOnly = false) {
    if (adminOnly && !isAdmin()) {
        return currentValue ? `<span class="inline-pill">${escapeHtml(currentValue)}</span>` : '<span style="color:var(--text-muted)">—</span>';
    }
    const opts = options.map(o =>
        `<option value="${escapeHtml(o.option_value)}" ${o.option_value === currentValue ? 'selected' : ''}>${escapeHtml(o.option_value)}</option>`
    ).join('');
    return `<select class="inline-select" onchange="inlineSave(${leadId},'${field}',this.value)">
        <option value="">—</option>${opts}
    </select>`;
}

// ─── Category inline select ───────────────────────────────────────────────────
const CATEGORY_OPTIONS = ['Local Move', 'Interstate Move', 'Regional Move', 'On-Site / Internal Move'];

const CATEGORY_CONFIG = {
    'Local Move':              '#3b82f6',   // blue
    'Interstate Move':         '#f59e0b',   // amber
    'Regional Move':           '#10b981',   // emerald
    'On-Site / Internal Move': '#a855f7',   // purple
};

function buildCategorySelect(leadId, currentCategory) {
    const color = CATEGORY_CONFIG[currentCategory] || '#6b7280';
    const opts = CATEGORY_OPTIONS.map(cat =>
        `<option value="${cat}" ${cat === currentCategory ? 'selected' : ''}>${cat}</option>`
    ).join('');
    return `<select class="inline-select inline-cat-sel"
        style="background:${color}33;color:${color};border:1.5px solid ${color}90;font-weight:600;max-width:160px"
        onchange="inlineSave(${leadId},'category',this.value);updateCatSelectColor(this)">
        <option value="" style="color:#111;font-weight:400">— Category —</option>${opts}
    </select>`;
}

// Live-update the category select colour when user changes it
function updateCatSelectColor(sel) {
    const color = CATEGORY_CONFIG[sel.value] || '#6b7280';
    sel.style.background  = color + '33';
    sel.style.color       = color;
    sel.style.borderColor = color + '90';
}

// ─── Lead Source inline select ──────────────────────────────────────────────
const LEAD_SOURCE_OPTIONS = [
    'Inbound Email', 'Inbound Phone Call', 'Manually Added',
    'Referral', 'Google Ads', 'Butler Lead'
];
const LEAD_SOURCE_COLORS = {
    'Inbound Email':      '#3b82f6',
    'Inbound Phone Call': '#8b5cf6',
    'Manually Added':     '#f59e0b',
    'Referral':           '#10b981',
    'Google Ads':         '#ef4444',
    'Butler Lead':        '#f97316',
};
function buildLeadSourceSelect(leadId, currentSource) {
    const color = LEAD_SOURCE_COLORS[currentSource] || '#6b7280';
    const opts = LEAD_SOURCE_OPTIONS.map(s =>
        `<option value="${s}" ${s === currentSource ? 'selected' : ''}>${s}</option>`
    ).join('');
    return `<select class="inline-select"
        style="background:${color}33;color:${color};border:1.5px solid ${color}90;font-weight:600;max-width:155px"
        onchange="inlineSave(${leadId},'lead_source',this.value);updateLeadSourceColor(this)">
        <option value="" style="color:#111;font-weight:400">— Source —</option>${opts}
    </select>`;
}
function updateLeadSourceColor(sel) {
    const color = LEAD_SOURCE_COLORS[sel.value] || '#6b7280';
    sel.style.background  = color + '33';
    sel.style.color       = color;
    sel.style.borderColor = color + '90';
}

// ─── Email Sent inline select ──────────────────────────────────────────────────
const EMAIL_SENT_OPTIONS = [
    { value: 'not_sent', label: 'Not Sent' },
    { value: 'email_2m', label: '2M Booking Form' },
    { value: 'email_3m', label: '3M Booking Form' }
];

function buildEmailSentSelect(leadId, currentValue) {
    const val = currentValue || 'not_sent';
    let color = '#6b7280'; // grey
    if (val === 'email_2m') color = '#3b82f6'; // blue
    if (val === 'email_3m') color = '#a855f7'; // purple

    const opts = EMAIL_SENT_OPTIONS.map(opt => 
        `<option value="${opt.value}" ${opt.value === val ? 'selected' : ''}>${opt.label}</option>`
    ).join('');
    return `<select class="inline-select"
        style="background:${color}22;color:${color};border:1px solid ${color}60;font-size:0.75rem;max-width:130px;min-width:115px;text-align:center"
        onchange="inlineSave(${leadId},'email_booking_sent',this.value);updateEmailColor(this)">
        ${opts}
    </select>`;
}
function updateEmailColor(sel) {
    let color = '#6b7280';
    if (sel.value === 'email_2m') color = '#3b82f6';
    if (sel.value === 'email_3m') color = '#a855f7';
    sel.style.background = color + '22';
    sel.style.color = color;
    sel.style.borderColor = color + '60';
}





// ─── Editable text cell (click to edit) ──────────────────────────────────────
function editableCell(leadId, field, value, inputType = 'text', maxW = '140px') {
    const display = value ? escapeHtml(String(value)) : '<span style="color:var(--text-muted)">—</span>';
    const safeVal = escapeHtml(String(value || ''));
    return `<span class="editable-cell" style="max-width:${maxW};display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:text"
        title="${safeVal}"
        onclick="startInlineEdit(this,${leadId},'${field}','${safeVal}','${inputType}')">${display}</span>`;
}

// Called from inline cells — replaces span with input on click
function startInlineEdit(el, leadId, field, currentValue, inputType) {
    if (el.dataset.editing) return;
    el.dataset.editing = '1';
    const origHtml = el.innerHTML;
    const input = document.createElement('input');
    input.type = inputType === 'date' ? 'date' : 'text';
    input.value = currentValue;
    input.className = 'inline-edit-input';
    el.style.overflow = 'visible';
    el.style.whiteSpace = 'normal';
    el.innerHTML = '';
    el.appendChild(input);
    input.focus();
    input.select();

    const save = async () => {
        if (!el.dataset.editing) return;
        delete el.dataset.editing;
        const newVal = input.value.trim();
        el.style.overflow = 'hidden';
        el.style.whiteSpace = 'nowrap';
        el.innerHTML = newVal ? escapeHtml(newVal) : '<span style="color:var(--text-muted)">—</span>';
        if (newVal !== currentValue) await inlineSave(leadId, field, newVal || null);
    };
    const cancel = () => {
        if (!el.dataset.editing) return;
        delete el.dataset.editing;
        el.style.overflow = 'hidden';
        el.style.whiteSpace = 'nowrap';
        el.innerHTML = origHtml;
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { input.removeEventListener('blur', save); cancel(); }
    });
}


// ─── Main load ───────────────────────────────────────────────────────────────
async function loadLeadsData() {
    try {
        const res = await api.get('/leads', { limit: 500 });
        if (!res.success) { showToast('Error', res.error || 'Failed to load leads', 'error'); return; }

        let leads = res.data || [];

        if      (currentLeadsTab === 'active')    leads = leads.filter(l => !l.is_completed && !ARCHIVE_STATUSES.includes(l.status));
        else if (currentLeadsTab === 'completed') leads = leads.filter(l => !!l.is_completed);
        else if (currentLeadsTab === 'archive')   leads = leads.filter(l => ARCHIVE_STATUSES.includes(l.status));

        const statusFilter = document.getElementById('leads-status-filter')?.value;
        if (statusFilter && statusFilter !== 'all') leads = leads.filter(l => l.status === statusFilter);

        const catFilter = document.getElementById('leads-cat-filter')?.value;
        if (catFilter && catFilter !== 'all') leads = leads.filter(l => l.category === catFilter);

        const srcFilter = document.getElementById('leads-source-filter')?.value;
        if (srcFilter && srcFilter !== 'all') leads = leads.filter(l => l.lead_source === srcFilter);

        const q = (document.getElementById('global-search')?.value || '').toLowerCase().trim();
        if (q) leads = leads.filter(l =>
            (l.customer_name||'').toLowerCase().includes(q) ||
            (l.phone||'').toLowerCase().includes(q) ||
            (l.email||'').toLowerCase().includes(q)
        );

        allLeadsCache = leads;
        renderLeadsTable(leads);
    } catch (err) {
        showToast('Error', 'Failed to load leads', 'error');
    }
}

function renderLeadsTable(leads) {
    const tbody = document.getElementById('leads-tbody');
    if (!tbody) return;
    const countEl = document.getElementById('leads-count');
    if (countEl) countEl.textContent = leads.length;

    const totalPages = Math.ceil(leads.length / LEADS_PER_PAGE);
    const page = leads.slice((currentLeadsPage - 1) * LEADS_PER_PAGE, currentLeadsPage * LEADS_PER_PAGE);

    if (page.length === 0) {
        tbody.innerHTML = `<tr><td colspan="25" style="padding:32px;text-align:center;color:var(--text-muted)">No leads found.</td></tr>`;
        renderPagination('leads-pagination', 1, 0, () => {});
        return;
    }

    tbody.innerHTML = page.map(l => {
        const leadMonth   = l.created_at ? new Date(l.created_at).toLocaleString('en-AU', { month: 'long' }) : '—';
        const leadCreated = l.created_at ? new Date(l.created_at).toLocaleString('en-AU', {
            day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
        }) : '—';
        const isComplete = !!l.is_completed;
        const safeName   = escapeJsAttr(l.customer_name || 'Lead');
        const safePhone  = escapeJsAttr(l.phone || '');
        const safeEmail  = escapeJsAttr(l.email || '');

        return `<tr data-id="${l.id}">
            <td style="min-width:130px;position:sticky;left:0;z-index:10;background:var(--bg-surface);">
                <div style="display:flex;align-items:center;gap:6px;justify-content:space-between;">
                    ${editableCell(l.id,'customer_name',l.customer_name,'text','130px')}
                    <button class="btn btn-ghost" style="padding:4px;min-width:auto;height:auto;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-base);color:var(--text-muted);" onclick="editLead(${l.id})" title="Expand Lead Details">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                    </button>
                </div>
            </td>
            <td class="text-muted" style="font-size:0.78rem;white-space:nowrap">${l.updated_at ? timeAgo(l.updated_at) : '—'}</td>
            <td style="min-width:168px">${buildStatusSelect(l.id, l.status)}</td>
            <td style="min-width:155px">${buildCategorySelect(l.id, l.category)}</td>
            <td style="min-width:150px">${buildFieldSelect(l.id, 'extra_request', l.extra_request, dropdownOptions.extra_requests)}</td>
            <td>${editableCell(l.id,'phone',l.phone,'text','110px')}</td>
            <td>${editableCell(l.id,'email',l.email,'text','150px')}</td>
            <td>${editableCell(l.id,'move_date',l.move_date ? l.move_date.split('T')[0] : '','date','100px')}</td>
            <td>${editableCell(l.id,'preferred_start_time',l.preferred_start_time,'text','90px')}</td>
            <td>${editableCell(l.id,'move_out_address',l.move_out_address,'text','150px')}</td>
            <td>${editableCell(l.id,'move_in_address',l.move_in_address,'text','150px')}</td>
            <td>${editableCell(l.id,'rough_size',l.rough_size,'text','90px')}</td>
            <td style="min-width:140px">${buildFieldSelect(l.id, 'access_issues', l.access_issues, dropdownOptions.access_issues, true)}</td>
            <td style="min-width:140px">${buildFieldSelect(l.id, 'heavy_items', l.heavy_items, dropdownOptions.heavy_items, true)}</td>
            <td>${smsBadge(l.sms_no_ans)}</td>
            <td>${smsBadge(l.sms_after_hours)}</td>
            <td>${smsBadge(l.sms_1st_checkin)}</td>
            <td>${smsBadge(l.sms_2nd_nudge)}</td>
            <td>${smsBadge(l.sms_3rd_final)}</td>
            <td>${editableCell(l.id,'sms_replies',l.sms_replies,'text','110px')}</td>
            <td>${buildEmailSentSelect(l.id, l.email_booking_sent)}</td>
            <td style="white-space:nowrap;color:var(--text-muted);font-size:0.78rem">${leadMonth}</td>
            <td style="white-space:nowrap;color:var(--text-muted);font-size:0.75rem">${leadCreated}</td>
            <td style="text-align:center; position:relative;">
                <button type="button" class="btn btn-primary" style="padding:4px 8px;font-size:0.75rem;cursor:pointer;position:relative;z-index:50;" 
                        onclick="event.preventDefault(); event.stopPropagation(); openCommentsPanel(${l.id},'${safeName}');">
                    💬 Comments
                </button>
            </td>
            <td style="min-width:150px">${buildLeadSourceSelect(l.id, l.lead_source)}</td>
            <td style="text-align:center">
                <button class="mark-complete-btn ${isComplete ? 'marked' : ''}"
                    onclick="markLeadComplete(${l.id})"
                    title="${isComplete ? 'Already complete' : 'Mark as complete'}"
                    ${isComplete ? 'disabled' : ''}>
                    ${isComplete ? '✓' : '○'}
                </button>
            </td>
            <td>
                <button class="ctx-dots-btn" onclick="event.stopPropagation();showLeadMenu(this,${l.id},'${safePhone}','${safeEmail}','${safeName}')">⋮</button>
            </td>
        </tr>`;

    }).join('');

    renderPagination('leads-pagination', currentLeadsPage, totalPages, p => { currentLeadsPage = p; loadLeadsData(); });
}

// ─── Button-group helpers ─────────────────────────────────────────────────────
function initButtonGroup(groupId, hiddenInputId) {
    const group  = document.getElementById(groupId);
    const hidden = document.getElementById(hiddenInputId);
    if (!group || !hidden) return;
    group.querySelectorAll('.btn-group-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            group.querySelectorAll('.btn-group-opt').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            hidden.value = btn.dataset.value;
        });
    });
}
function setButtonGroup(groupId, hiddenInputId, value) {
    const group  = document.getElementById(groupId);
    const hidden = document.getElementById(hiddenInputId);
    if (!group) return;
    group.querySelectorAll('.btn-group-opt').forEach(b => b.classList.toggle('selected', b.dataset.value === value));
    if (hidden) hidden.value = value || '';
}
function buildDropdownSelect(selectId, fieldKey) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = `<option value="">— Select —</option>` +
        (dropdownOptions[fieldKey]||[]).map(o =>
            `<option value="${escapeHtml(o.option_value)}">${escapeHtml(o.option_value)}</option>`).join('');
    if (current) sel.value = current;
}

// ─── Lead modal ───────────────────────────────────────────────────────────────
function openLeadModal(lead = null) {
    const isEdit = !!lead;
    document.getElementById('lead-modal-title').textContent = isEdit ? 'Edit Lead' : 'Add New Lead';
    document.getElementById('lead-id').value = isEdit ? lead.id : '';

    if (isEdit) {
        setVal('lead-customer-name',        lead.customer_name);
        setVal('lead-phone',                lead.phone);
        setVal('lead-email',                lead.email);
        setVal('lead-move-date',            lead.move_date ? lead.move_date.split('T')[0] : '');
        setVal('lead-preferred-start',      lead.preferred_start_time);
        setVal('lead-move-out',             lead.move_out_address);
        setVal('lead-move-in',              lead.move_in_address);
        setVal('lead-rough-size',           lead.rough_size);
        setVal('lead-heavy-items',          lead.heavy_items);
        setVal('lead-extra-request-select', lead.extra_request);
        setVal('lead-access-issues',        lead.access_issues);
        setButtonGroup('lead-source-group',   'lead-source-hidden',   lead.lead_source);
        setButtonGroup('lead-status-group',   'lead-status-hidden',   lead.status);
        setButtonGroup('lead-category-group', 'lead-category-hidden', lead.category);
    } else {
        ['lead-customer-name','lead-phone','lead-email','lead-move-date',
         'lead-preferred-start','lead-move-out','lead-move-in','lead-rough-size',
         'lead-heavy-items','lead-extra-request-select','lead-access-issues'].forEach(id => setVal(id, ''));
        setButtonGroup('lead-source-group',   'lead-source-hidden',   '');
        setButtonGroup('lead-status-group',   'lead-status-hidden',   '');
        setButtonGroup('lead-category-group', 'lead-category-hidden', '');
    }

    buildDropdownSelect('lead-heavy-items',          'heavy_items');
    buildDropdownSelect('lead-extra-request-select', 'extra_requests');
    buildDropdownSelect('lead-access-issues',        'access_issues');

    if (isEdit) {
        setVal('lead-heavy-items',          lead.heavy_items);
        setVal('lead-extra-request-select', lead.extra_request);
        setVal('lead-access-issues',        lead.access_issues);
    }

    document.querySelectorAll('.add-option-btn').forEach(b => b.style.display = isAdmin() ? 'inline-flex' : 'none');

    const actionsPanel = document.getElementById('lead-actions-panel');
    if (actionsPanel) {
        actionsPanel.classList.toggle('hidden', !isEdit);
        if (isEdit) {
            const phoneEl = document.getElementById('lead-sms-phone');
            const emailEl = document.getElementById('lead-email-address');
            if (phoneEl) phoneEl.textContent = lead.phone || 'No phone';
            if (emailEl) emailEl.textContent = lead.email || 'No email';
        }
    }
    openModal('lead-modal');
}

async function editLead(id) {
    try {
        const res = await api.get(`/leads/${id}`);
        if (!res.success) { showToast('Error', 'Lead not found', 'error'); return; }
        openLeadModal(res.data);
    } catch (err) { showToast('Error', 'Failed to load lead', 'error'); }
}

async function saveLead(e) {
    e.preventDefault();
    const editId = getVal('lead-id');
    const btn = document.getElementById('lead-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

    const data = {
        customer_name:        getVal('lead-customer-name'),
        phone:                getVal('lead-phone')              || null,
        email:                getVal('lead-email')              || null,
        move_date:            getVal('lead-move-date')          || null,
        status:               getVal('lead-status-hidden')      || 'new',
        lead_source:          getVal('lead-source-hidden')      || null,
        category:             getVal('lead-category-hidden')    || null,
        preferred_start_time: getVal('lead-preferred-start')    || null,
        move_out_address:     getVal('lead-move-out')           || null,
        move_in_address:      getVal('lead-move-in')            || null,
        rough_size:           getVal('lead-rough-size')         || null,
        heavy_items:          getVal('lead-heavy-items')        || null,
        extra_request:        getVal('lead-extra-request-select') || null,
        access_issues:        getVal('lead-access-issues')      || null,
    };

    try {
        const res = editId ? await api.put(`/leads/${editId}`, data) : await api.post('/leads', data);
        if (res.success) {
            showToast('Success', editId ? 'Lead updated' : 'Lead created', 'success');
            closeModal('lead-modal');
            loadLeadsData();
        } else {
            showToast('Error', res.error || 'Failed to save lead', 'error');
        }
    } catch (err) { showToast('Error', 'Failed to save lead', 'error'); }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'Save Lead'; } }
}

async function deleteLead(id) {
    if (!confirm('Delete this lead?')) return;
    try {
        const res = await api.del(`/leads/${id}`);
        if (res.success) { showToast('Deleted', 'Lead removed', 'success'); loadLeadsData(); }
        else showToast('Error', res.error || 'Delete failed', 'error');
    } catch (err) { showToast('Error', 'Failed to delete lead', 'error'); }
}

// ─── Admin: add dropdown option ───────────────────────────────────────────────
async function addDropdownOption(fieldName) {
    const value = prompt(`Add new option for "${fieldName.replace(/_/g,' ')}":`);
    if (!value?.trim()) return;
    try {
        const res = await fetch('/api/dropdown-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field_name: fieldName, option_value: value.trim() })
        });
        const json = await res.json();
        if (json.success) {
            showToast('Added', `"${value.trim()}" added`, 'success');
            await loadDropdownOptions();
            buildDropdownSelect('lead-heavy-items',          'heavy_items');
            buildDropdownSelect('lead-extra-request-select', 'extra_requests');
            buildDropdownSelect('lead-access-issues',        'access_issues');
            loadLeadsData();
        } else { showToast('Error', json.error || 'Failed to add option', 'error'); }
    } catch (err) { showToast('Error', 'Failed to add option', 'error'); }
}

// ─── Modal webhooks (from edit form) ─────────────────────────────────────────
async function triggerLeadWebhook(action) {
    const leadId = getVal('lead-id');
    if (!leadId) { showToast('Error', 'No lead selected', 'error'); return; }
    const label = ACTION_LABELS[action] || action;
    if (!confirm(`Send "${label}" to this lead?`)) return;
    showToast('Sending…', `Triggering ${label}…`, 'info');
    try {
        const user = supabaseAuth.getUser();
        const res = await fetch('/api/webhooks/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, leadId, triggered_by: user?.name||'Staff', triggered_by_email: user?.email||'', triggered_by_role: user?.role||'staff' })
        });
        const result = await res.json();
        if (result.success) {
            showToast('Sent!', result.message || `"${label}" triggered.`, 'success');
            const field = SMS_FIELD_MAP[action];
            if (field) await inlineSave(leadId, field, 'sent');
            loadLeadsData();
        } else { showToast('Failed', result.error || `${label} failed`, 'error'); }
    } catch (err) { showToast('Error', 'Failed to trigger webhook', 'error'); }
}

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    await loadDropdownOptions();
    initButtonGroup('lead-source-group',   'lead-source-hidden');
    initButtonGroup('lead-status-group',   'lead-status-hidden');
    initButtonGroup('lead-category-group', 'lead-category-hidden');

    document.querySelectorAll('#page-leads .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#page-leads .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLeadsTab = btn.dataset.view || 'active';
            currentLeadsPage = 1;
            loadLeadsData();
        });
    });
});
