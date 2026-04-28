// MoveHome CRM – Jobs Module (API-connected)

let currentJobsView = 'upcoming';
let currentJobsPage = 1;
const JOBS_PER_PAGE = 10;

// Calendar state
let calYear, calMonth;
let allJobsCache = [];
let contractorsCache = [];

async function loadContractorsForJobs() {
    try {
        const res = await api.get('/contractors', { limit: 200 });
        if (res.success) {
            contractorsCache = res.data || [];
            // Populate contractor filter
            const filterSel = document.getElementById('jobs-contractor-filter');
            if (filterSel) {
                filterSel.innerHTML = '<option value="all">All Contractors</option>' +
                    contractorsCache.map(c => `<option value="${escapeHtml(c.company)}">${escapeHtml(c.company)}</option>`).join('');
            }
        }
    } catch(e) { console.warn('Could not load contractors', e); }
}

function populateContractorDropdown() {
    const sel = document.getElementById('job-contractor');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="">— Select Contractor —</option>' +
        contractorsCache.map(c => `<option value="${escapeHtml(c.company)}" style="background:#111827;color:#fff;">${escapeHtml(c.company)}</option>`).join('') +
        '<option value="New TBC" style="background:#111827;color:#f59e0b;">⚠ New TBC</option>';
    if (current) sel.value = current;
}

let calendarRefreshInterval = null;
(function initCalDate() {
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();
})();

// Helper: get/set form values by element ID
function getJobVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function setJobVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }

// ─── Brand Picker ─────────────────────────────────────────────────────────────
let _selectedBrand = '';
let _jobIsEdit = false;

const BRAND_BANNERS = {
    MoveAll: {
        bg: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
        html: `<div style="font-size:2rem;font-weight:900;letter-spacing:2px;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.5)">
                    <span style="color:#4fc3f7">move</span><span style="color:#fff">all</span>
               </div>
               <div style="font-size:0.75rem;color:rgba(255,255,255,.6);letter-spacing:4px;margin-top:4px">MOVING SERVICES</div>`
    },
    TBMI: {
        bg: 'linear-gradient(135deg,#0d0d0d,#1a1200,#2a1e00)',
        html: `<div style="font-size:1.5rem;font-weight:900;letter-spacing:3px;color:#f5c842;text-shadow:0 2px 12px rgba(0,0,0,.7)">THE BUTLER</div>
               <div style="font-size:1.6rem;font-weight:900;letter-spacing:4px;color:#fff;margin-top:2px">VALET</div>
               <div style="font-size:0.65rem;color:rgba(245,200,66,.6);letter-spacing:5px;margin-top:4px">MOVE ASSIST SERVICES</div>`
    }
};

function applyBrandBanner(brand) {
    const banner = document.getElementById('job-brand-banner');
    const inner  = document.getElementById('job-brand-logo-inner');
    if (!banner || !inner) return;
    const cfg = BRAND_BANNERS[brand] || BRAND_BANNERS['MoveAll'];
    banner.style.background = cfg.bg;
    inner.innerHTML = cfg.html;
    // Auto-prefix job name input if empty
    const nameInput = document.getElementById('job-first-name');
    if (nameInput && !nameInput.value) {
        nameInput.value = brand + ' - ';
        setTimeout(() => { nameInput.focus(); nameInput.setSelectionRange(nameInput.value.length, nameInput.value.length); }, 100);
    }
}

// openJobBrandPicker(brand?) — if brand passed, skip picker and open form directly
function openJobBrandPicker(brand) {
    if (brand) {
        // Direct open — skip picker, go straight to form
        _selectedBrand = brand;
        _jobIsEdit = false;
        document.getElementById('job-id').value = '';
        document.getElementById('job-brand').value = brand;
        document.getElementById('job-form').reset();
        document.getElementById('job-brand').value = brand;
        document.getElementById('job-cust-last').value = '';
        document.getElementById('job-start-time').value = '09:00';
        const prevBtn = document.getElementById('job-prev-btn');
        if (prevBtn) prevBtn.style.display = 'inline-flex';
        applyBrandBanner(brand);
        populateContractorDropdown();
        openModal('job-modal');
        return;
    }
    // Show picker
    _selectedBrand = '';
    document.querySelectorAll('.brand-pick-btn').forEach(b => {
        b.style.borderColor = 'var(--border-color)';
        b.style.background = '';
        b.style.color = '';
        b.style.fontWeight = '';
    });
    openModal('job-brand-picker');
}

function selectBrandPick(brand) {
    _selectedBrand = brand;
    document.querySelectorAll('.brand-pick-btn').forEach(b => {
        const btnBrand = b.textContent.trim();
        const isSelected = btnBrand === brand;
        const brandColor = BRAND_COLORS[btnBrand] || { bg: 'var(--primary-500)', text: '#fff' };
        
        b.style.borderColor   = isSelected ? brandColor.bg : 'var(--border-color)';
        b.style.background    = isSelected ? brandColor.bg : '';
        b.style.color         = isSelected ? brandColor.text : '';
        b.style.fontWeight    = isSelected ? '700' : '';
    });
}

function confirmBrandPick() {
    if (!_selectedBrand) {
        showToast('Select Brand', 'Please choose MoveAll or TBMI first.', 'error');
        return;
    }
    closeModal('job-brand-picker');
    _jobIsEdit = false;
    document.getElementById('job-id').value = '';
    document.getElementById('job-brand').value = _selectedBrand;
    document.getElementById('job-form').reset();
    document.getElementById('job-brand').value = _selectedBrand;
    document.getElementById('job-cust-last').value = '';
    document.getElementById('job-start-time').value = '09:00';
    const prevBtn = document.getElementById('job-prev-btn');
    if (prevBtn) prevBtn.style.display = 'inline-flex';
    applyBrandBanner(_selectedBrand);
    populateContractorDropdown();
    openModal('job-modal');
}

function jobGoBack() {
    closeModal('job-modal');
    if (!_jobIsEdit) openModal('job-brand-picker');
}

async function loadJobsData() {
    const params = { limit: 200 };
    if (currentJobsView === 'upcoming' || currentJobsView === 'team') params.view = 'upcoming';
    else if (currentJobsView === 'past') params.view = 'past';
    else if (currentJobsView === 'archived') params.view = 'archived';

    try {
        const brandGroup = document.getElementById('jobs-brand-filter')?.closest('.filter-group');
        const priceGroup = document.getElementById('jobs-price-filter')?.closest('.filter-group');
        const statusGroup = document.getElementById('jobs-status-filter')?.closest('.filter-group');
        const contractorFilter = document.getElementById('jobs-contractor-filter');
        const contractorLabel = contractorFilter?.parentElement.querySelector('label');

        if (currentJobsView === 'team') {
            if (brandGroup) brandGroup.style.display = 'none';
            if (priceGroup) priceGroup.style.display = 'none';
            if (statusGroup) statusGroup.style.display = 'none';
            if (contractorLabel) contractorLabel.textContent = 'Filter by team:';
        } else {
            if (brandGroup) brandGroup.style.display = '';
            if (priceGroup) priceGroup.style.display = '';
            if (contractorLabel) contractorLabel.textContent = 'Contractor:';
            if (statusGroup) {
                statusGroup.style.display = currentJobsView === 'archived' ? 'none' : '';
            }
        }
    } catch(e) {}

    const statusFilter = document.getElementById('jobs-status-filter')?.value;
    if (statusFilter && statusFilter !== 'all' && currentJobsView !== 'team') params.status = statusFilter;

    const brandFilter = document.getElementById('jobs-brand-filter')?.value;
    const priceFilter = document.getElementById('jobs-price-filter')?.value;
    const contractorFilter = document.getElementById('jobs-contractor-filter')?.value;

    try {
        const res = await api.get('/jobs', params);
        if (!res.success) { showToast('Error', res.error || 'Failed to load jobs', 'error'); return; }
        let jobs = res.data || [];

        // Apply client-side filters
        if (brandFilter && brandFilter !== 'all') jobs = jobs.filter(j => j.brand === brandFilter);
        if (priceFilter && priceFilter !== 'all') jobs = jobs.filter(j => j.price_point === priceFilter);
        if (contractorFilter && contractorFilter !== 'all') jobs = jobs.filter(j => j.contractor === contractorFilter);

        // Apply global search
        const q2 = (document.getElementById('global-search')?.value || '').toLowerCase().trim();
        if (q2) {
            jobs = jobs.filter(j =>
                (`${j.first_name || ''} ${j.last_name || ''}`).toLowerCase().includes(q2) ||
                (j.phone || '').toLowerCase().includes(q2) ||
                (j.email || '').toLowerCase().includes(q2) ||
                (j.contractor || '').toLowerCase().includes(q2) ||
                (j.invoice || '').toLowerCase().includes(q2)
            );
        }

        allJobsCache = jobs;

        // Update count
        const countEl = document.getElementById('jobs-count');
        if (countEl) countEl.textContent = jobs.length;

        // Show/hide the correct view container
        const masterView = document.getElementById('jobs-master-view');
        const calView = document.getElementById('jobs-calendar-view');

        if (masterView) masterView.classList.toggle('hidden', currentJobsView === 'calendar');
        if (calView) calView.classList.toggle('hidden', currentJobsView !== 'calendar');

        if (currentJobsView === 'calendar') renderCalendarView(jobs);
        else renderMasterView(jobs);

        // Start/stop auto-refresh for calendar
        if (currentJobsView === 'calendar') startCalendarRefresh();
        else stopCalendarRefresh();
    } catch (err) {
        console.error('Load jobs error:', err);
        showToast('Error', 'Failed to load jobs', 'error');
    }
}

// Auto-refresh calendar every 30 seconds
function startCalendarRefresh() {
    stopCalendarRefresh();
    calendarRefreshInterval = setInterval(async () => {
        if (currentJobsView !== 'calendar') { stopCalendarRefresh(); return; }
        try {
            const res = await api.get('/jobs', { limit: 200 });
            if (res.success) {
                allJobsCache = res.data || [];
                renderCalendarView(allJobsCache);
            }
        } catch (e) { /* silent refresh */ }
    }, 30000);
}

function stopCalendarRefresh() {
    if (calendarRefreshInterval) { clearInterval(calendarRefreshInterval); calendarRefreshInterval = null; }
}

// Price point badge colors
const PRICE_COLORS = {
    '$199ph (2M+T Eco)':              { bg:'#16a34a', text:'#fff' },
    '$220ph (2M+T Prem)':             { bg:'#15803d', text:'#fff' },
    '$270ph (3M+T Eco)':              { bg:'#0369a1', text:'#fff' },
    '$299ph (3M+T Prem)':             { bg:'#1d4ed8', text:'#fff' },
    '$154ph (Butler Rates)':          { bg:'#dc2626', text:'#fff' },
    '$159.50ph (Styling Rates)':      { bg:'#7c3aed', text:'#fff' },
    'Interstate Fixed Price':         { bg:'#2563eb', text:'#fff' },
    '$225.50ph (3M Butler Rates)':    { bg:'#b45309', text:'#fff' },
    '$264ph (3M + 2 Truck Butler Rate)': { bg:'#92400e', text:'#fff' },
};

const BRAND_COLORS = {
    'MoveAll': { bg:'#16a34a', text:'#fff' },
    'TBMI':    { bg:'#dc2626', text:'#fff' },
};

function priceBadge(pp) {
    if (!pp) return '<span style="color:var(--text-muted)">—</span>';
    const c = PRICE_COLORS[pp] || { bg:'#6b7280', text:'#fff' };
    return `<span style="display:inline-block;padding:3px 8px;border-radius:6px;font-size:0.75rem;font-weight:700;background:${c.bg};color:${c.text};white-space:nowrap">${escapeHtml(pp)}</span>`;
}

function brandBadge(b) {
    if (!b) return '<span style="color:var(--text-muted)">—</span>';
    const c = BRAND_COLORS[b] || { bg:'#6b7280', text:'#fff' };
    return `<span style="display:inline-block;padding:3px 10px;border-radius:6px;font-size:0.78rem;font-weight:800;background:${c.bg};color:${c.text}">${escapeHtml(b)}</span>`;
}

function teamBadge(t) {
    if (!t) return '<span style="color:var(--text-muted)">—</span>';
    // Color based on hash
    const colors = ['#7c3aed','#0369a1','#15803d','#b45309','#be123c','#0f766e'];
    let hash = 0; for (let i = 0; i < t.length; i++) hash = t.charCodeAt(i) + ((hash << 5) - hash);
    const col = colors[Math.abs(hash) % colors.length];
    return `<span style="display:inline-block;padding:3px 10px;border-radius:6px;font-size:0.75rem;font-weight:700;background:${col};color:#fff;white-space:nowrap">${escapeHtml(t)}</span>`;
}

// ─── Inline job save ─────────────────────────────────────────────────────────
async function inlineJobSave(id, field, value) {
    try {
        const res = await api.put(`/jobs/${id}`, { [field]: value === '' ? null : value });
        if (!res.success) showToast('Error', res.error || 'Save failed', 'error');
        else showToast('Saved', '', 'success');
    } catch(e) { showToast('Error', 'Failed to save', 'error'); }
}

// Editable text cell (click to edit inline)
function jobEditCell(id, field, value, maxW = '130px') {
    const display = value ? escapeHtml(String(value)) : '<span style="color:var(--text-muted);font-size:0.8rem">—</span>';
    const safeVal = escapeHtml(String(value || ''));
    return `<span class="editable-cell" style="max-width:${maxW};display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;min-width:40px"
        title="${safeVal}" onclick="startJobInlineEdit(this,${id},'${field}','${safeVal}')">${display}</span>`;
}

function startJobInlineEdit(el, id, field, currentVal) {
    if (el.dataset.editing) return;
    el.dataset.editing = '1';
    const orig = el.innerHTML;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentVal;
    input.className = 'inline-edit-input';
    input.style.cssText = 'width:120px;min-width:80px';
    el.style.overflow = 'visible';
    el.innerHTML = '';
    el.appendChild(input);
    input.focus(); input.select();
    const save = async () => {
        if (!el.dataset.editing) return;
        delete el.dataset.editing;
        el.style.overflow = 'hidden';
        const v = input.value.trim();
        el.innerHTML = v ? escapeHtml(v) : '<span style="color:var(--text-muted);font-size:0.8rem">—</span>';
        if (v !== currentVal) await inlineJobSave(id, field, v);
    };
    const cancel = () => {
        if (!el.dataset.editing) return;
        delete el.dataset.editing;
        el.style.overflow = 'hidden';
        el.innerHTML = orig;
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { input.removeEventListener('blur', save); cancel(); }
    });
}

// Inline price point select (badge click → select)
function jobPriceCell(id, current) {
    const opts = Object.keys(PRICE_COLORS).map(p =>
        `<option value="${escapeHtml(p)}" style="background:#111827;color:#fff;" ${p === current ? 'selected' : ''}>${escapeHtml(p)}</option>`
    ).join('');
    const c = current ? (PRICE_COLORS[current] || { bg:'#6b7280', text:'#fff' }) : null;
    const style = c ? `background:${c.bg};color:${c.text};border:none;font-weight:700;font-size:0.75rem;border-radius:6px;padding:3px 24px 3px 8px;cursor:pointer;max-width:180px;appearance:none;-webkit-appearance:none;min-width:140px;text-align:center;`
                    : `font-size:0.82rem;max-width:180px;min-width:140px;padding:3px 24px 3px 8px;appearance:none;-webkit-appearance:none;`;
    return `<select class="inline-select" style="${style}" onchange="inlineJobSave(${id},'price_point',this.value);updateJobPriceColor(this)">
        <option value="" style="background:#111827;color:#fff;">— Select —</option>${opts}
    </select>`;
}
function updateJobPriceColor(sel) {
    const c = PRICE_COLORS[sel.value] || { bg:'#6b7280', text:'#fff' };
    sel.style.background = c.bg; sel.style.color = c.text;
}

// Inline brand select (badge click → select)
function jobBrandCell(id, current) {
    const brands = ['MoveAll','TBMI'];
    const opts = brands.map(b => `<option value="${b}" style="background:#111827;color:#fff;" ${b === current ? 'selected' : ''}>${b}</option>`).join('');
    const c = current ? (BRAND_COLORS[current] || { bg:'#6b7280', text:'#fff' }) : { bg:'#6b7280', text:'#fff' };
    return `<select class="inline-select" style="background:${c.bg};color:${c.text};border:none;font-weight:800;font-size:0.78rem;border-radius:6px;padding:3px 22px 3px 10px;cursor:pointer;appearance:none;-webkit-appearance:none;text-align:center;min-width:95px;width:max-content;"
        onchange="inlineJobSave(${id},'brand',this.value);updateJobBrandColor(this)">
        <option value="" style="background:#111827;color:#fff;">— Select —</option>${opts}
    </select>`;
}
function updateJobBrandColor(sel) {
    const c = BRAND_COLORS[sel.value] || { bg:'#6b7280', text:'#fff' };
    sel.style.background = c.bg; sel.style.color = c.text;
}

const INVOICE_OPTIONS = [
    { label: 'Done', color: '#10b981' },
    { label: 'Waiting Times', color: '#f59e0b' },
    { label: 'Afterpay Required', color: '#8b5cf6' },
    { label: 'Paid inAdvance (Interstate)', color: '#3b82f6' },
    { label: 'Add storage Costs', color: '#ef4444' },
    { label: 'Times In', color: '#6366f1' },
    { label: 'Invoiced in Advance (Interstate)', color: '#ec4899' },
    { label: 'Discount Required', color: '#f97316' },
    { label: 'To Do', color: '#6b7280' }
];

function jobInvoiceCell(id, current) {
    const opts = INVOICE_OPTIONS.map(o => 
        `<option value="${o.label}" style="background:#111827;color:#fff;" ${o.label === current ? 'selected' : ''}>${o.label}</option>`
    ).join('');
    const c = INVOICE_OPTIONS.find(o => o.label === current) || { color: '#6b7280' };
    return `<select class="inline-select" style="background:${c.color};color:#fff;border:none;font-weight:700;font-size:0.75rem;border-radius:6px;padding:3px 22px 3px 10px;cursor:pointer;appearance:none;-webkit-appearance:none;text-align:center;min-width:110px;width:max-content;"
        onchange="inlineInvoiceSave(${id}, this.value)">
        <option value="" style="background:#111827;color:#fff;">— Invoice —</option>${opts}
    </select>`;
}

async function inlineInvoiceSave(id, value) {
    if (value === 'Done') {
        await api.put(`/jobs/${id}`, { invoice: value, status: 'completed' });
        showToast('Job Completed', 'Job moved to Past Jobs', 'success');
        loadJobsData();
    } else {
        await inlineJobSave(id, 'invoice', value);
    }
}

function toggleJobMenu(id, e) {
    e.stopPropagation();
    document.querySelectorAll('.job-action-menu').forEach(el => {
        if (el.id !== `job-menu-${id}`) el.classList.add('hidden');
    });
    const menu = document.getElementById(`job-menu-${id}`);
    if (menu) menu.classList.toggle('hidden');
}
document.addEventListener('click', () => {
    document.querySelectorAll('.job-action-menu').forEach(el => el.classList.add('hidden'));
});

async function openPublicComment(id) {
    document.getElementById('job-comment-id').value = id;
    const job = allJobsCache.find(j => j.id === id);
    document.getElementById('job-public-comment').value = job?.public_comment || '';
    openModal('job-comment-modal');
}
async function savePublicComment() {
    const id = document.getElementById('job-comment-id').value;
    const comment = document.getElementById('job-public-comment').value;
    const res = await api.put(`/jobs/${id}`, { public_comment: comment });
    if (res.success) {
        showToast('Saved', 'Public comment saved', 'success');
        closeModal('job-comment-modal');
        loadJobsData();
    } else {
        showToast('Error', res.error || 'Failed to save', 'error');
    }
}
async function markJobCompleted(id) {
    const res = await api.put(`/jobs/${id}`, { status: 'completed' });
    if (res.success) {
        showToast('Success', 'Job marked as completed', 'success');
        loadJobsData();
    } else {
        showToast('Error', res.error || 'Failed to complete job', 'error');
    }
}

// ─── Searchable contractor dropdown ──────────────────────────────────────────
let _activeContractorDrop = null;

function closeContractorDrop() {
    if (_activeContractorDrop) { _activeContractorDrop.remove(); _activeContractorDrop = null; }
}

function jobContractorCell(jobId, current) {
    const display = current
        ? `<span style="font-size:0.85rem;cursor:pointer">${escapeHtml(current)}</span>`
        : `<span style="color:var(--text-muted);font-size:0.82rem;cursor:pointer">— Assign —</span>`;
    return `<div class="job-contractor-cell" onclick="openContractorDrop(event,${jobId},this)" style="min-width:140px;max-width:200px;cursor:pointer;user-select:none">${display}</div>`;
}

function openContractorDrop(e, jobId, triggerEl) {
    e.stopPropagation();
    closeContractorDrop();

    const drop = document.createElement('div');
    drop.style.cssText = `position:fixed;z-index:9999;background:var(--bg-surface,#111827);border:1px solid var(--border-color,#374151);
        border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,.5);width:240px;overflow:hidden;`;

    const currentVal = triggerEl.querySelector('span')?.textContent?.trim() || '';
    // Build HTML
    drop.innerHTML = `
        <div style="padding:8px">
            <input type="text" placeholder="Search..." id="ctr-search-${jobId}"
                style="width:100%;padding:6px 10px;border-radius:6px;border:1.5px solid var(--border-color,#374151);
                    background:var(--bg-base,#0B1121);color:var(--text-primary,#F9FAFB);font-size:0.85rem;box-sizing:border-box"
                oninput="filterContractorDrop(this,${jobId})" onclick="event.stopPropagation()">
        </div>
        <div id="ctr-list-${jobId}" style="max-height:220px;overflow-y:auto;padding:4px 0">
            ${buildContractorDropList(jobId, currentVal, '')}
        </div>`;

    // Position below trigger
    const rect = triggerEl.getBoundingClientRect();
    drop.style.top  = `${Math.min(rect.bottom + 4, window.innerHeight - 280)}px`;
    drop.style.left = `${Math.min(rect.left, window.innerWidth - 260)}px`;
    document.body.appendChild(drop);
    _activeContractorDrop = drop;

    // Focus search
    setTimeout(() => document.getElementById(`ctr-search-${jobId}`)?.focus(), 50);
    // Close on outside click
    setTimeout(() => document.addEventListener('click', closeContractorDrop, { once: true }), 50);
}

function buildContractorDropList(jobId, currentVal, search) {
    const s = search.toLowerCase();
    let items = contractorsCache.filter(c => !s || c.company.toLowerCase().includes(s));
    let html = items.map(c => {
        const isSel = c.company === currentVal;
        return `<div onclick="selectContractorInline(${jobId},'${escapeJsAttr(c.company)}',this)"
            style="padding:8px 14px;cursor:pointer;font-size:0.88rem;display:flex;align-items:center;justify-content:space-between;
                background:${isSel ? 'rgba(99,102,241,.12)' : 'transparent'}"
            onmouseenter="this.style.background='rgba(99,102,241,.08)'"
            onmouseleave="this.style.background='${isSel ? 'rgba(99,102,241,.12)' : 'transparent'}'">
            <span>${escapeHtml(c.company)}</span>
            ${isSel ? '<span style="color:#6366f1;font-weight:700">✓</span>' : ''}
        </div>`;
    }).join('');
    // New TBC option
    const tbcMatch = !s || 'new tbc'.includes(s);
    if (tbcMatch) html += `<div onclick="selectContractorInline(${jobId},'New TBC',this)"
        style="padding:8px 14px;cursor:pointer;font-size:0.88rem;color:#f59e0b;border-top:1px solid var(--border-color,#374151)"
        onmouseenter="this.style.background='rgba(245,158,11,.08)'" onmouseleave="this.style.background='transparent'">
        ⚠ New TBC
    </div>`;
    return html || '<div style="padding:12px 14px;color:var(--text-muted);font-size:0.85rem">No results</div>';
}

function filterContractorDrop(input, jobId) {
    const list = document.getElementById(`ctr-list-${jobId}`);
    if (list) list.innerHTML = buildContractorDropList(jobId, '', input.value);
}

async function selectContractorInline(jobId, company, el) {
    closeContractorDrop();
    // Update the cell in the DOM
    const cell = document.querySelector(`tr[data-id="${jobId}"] .job-contractor-cell`);
    if (cell) cell.innerHTML = `<span style="font-size:0.85rem;cursor:pointer">${escapeHtml(company)}</span>`;
    await inlineJobSave(jobId, 'contractor', company);
}

function renderMasterView(jobs) {
    const tbody = document.getElementById('jobs-tbody');
    if (!tbody) { console.error('jobs-tbody not found'); return; }
    const totalPages = Math.ceil(jobs.length / JOBS_PER_PAGE);
    const start = (currentJobsPage - 1) * JOBS_PER_PAGE;
    const page = jobs.slice(start, start + JOBS_PER_PAGE);

    if (page.length === 0) {
        tbody.innerHTML = '<tr><td colspan="15" class="text-center" style="padding:32px;color:var(--text-muted)">No jobs found.</td></tr>';
        return;
    }

    tbody.innerHTML = page.map(j => {
        const dateStr = j.move_date ? new Date(j.move_date).toLocaleString('en-AU', {
            day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
        }) : '—';
        return `<tr data-id="${j.id}">
            <td style="font-weight:600;white-space:nowrap;min-width:140px;position:sticky;left:0;z-index:10;background:var(--bg-surface);border-right:1px solid var(--border-color);">
                <div style="display:flex;align-items:center;gap:6px;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span style="color:var(--danger);font-size:0.8rem;">🔴</span>
                        ${jobEditCell(j.id,'first_name',j.first_name,'130px')}
                    </div>
                    <button class="btn btn-ghost" style="padding:4px;min-width:auto;height:auto;border:1px solid var(--border-color);border-radius:4px;background:var(--bg-base);color:var(--text-muted);" onclick="openJobExpandModal(${j.id})" title="Expand Job Details">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                    </button>
                </div>
            </td>
            ${isAdmin() ? `<td style="min-width:160px">${jobPriceCell(j.id, j.price_point)}</td>` : ''}
            <td>${isAdmin() ? jobBrandCell(j.id, j.brand) : brandBadge(j.brand)}</td>
            <td style="white-space:nowrap;color:var(--text-muted);font-size:0.82rem">${dateStr}</td>
            ${isAdmin() ? `<td style="min-width:120px">${jobEditCell(j.id,'notes',j.notes,'160px')}</td>` : ''}
            ${isAdmin() ? `<td style="min-width:100px">${jobEditCell(j.id,'team',j.team,'120px')}</td>` : ''}
            ${isAdmin() ? `<td style="min-width:140px">${jobContractorCell(j.id, j.contractor)}</td>` : ''}
            ${isAdmin() ? `<td style="min-width:120px">${jobInvoiceCell(j.id, j.invoice)}</td>` : ''}
            <td style="min-width:90px">${jobEditCell(j.id,'extras',j.extras,'110px')}</td>
            ${isAdmin() ? `<td style="min-width:70px">${jobEditCell(j.id,'deposit',j.deposit,'70px')}</td>` : ''}
            <td style="min-width:120px">${jobEditCell(j.id,'move_out',j.move_out,'150px')}</td>
            <td style="min-width:120px">${jobEditCell(j.id,'move_in',j.move_in,'150px')}</td>
            <td style="min-width:90px">${jobEditCell(j.id,'phone',j.phone,'100px')}</td>
            <td><span class="sms-badge sms-${j.on_way_sms}">${j.on_way_sms === 'sent' ? '✓ Sent' : '✗ Not Sent'}</span></td>
            <td><span class="sms-badge sms-${j.last_sms}">${j.last_sms === 'sent' ? '✓ Sent' : '✗ Not Sent'}</span></td>
            ${isAdmin() ? `<td style="min-width:100px">${escapeHtml(j.time_sheet || '—')}</td>` : ''}
            ${isAdmin() ? `<td style="min-width:90px">$${parseFloat(j.sell_price || 0).toFixed(0)}</td>` : ''}
            ${isAdmin() ? `<td style="min-width:90px">$${parseFloat(j.buy_price || 0).toFixed(0)}</td>` : ''}
            ${isAdmin() ? `<td style="min-width:90px;font-weight:bold" class="${((parseFloat(j.sell_price)||0) - (parseFloat(j.buy_price)||0)) >= 0 ? 'text-success' : 'text-danger'}">
                $${((parseFloat(j.sell_price)||0) - (parseFloat(j.buy_price)||0)).toFixed(0)}
            </td>` : ''}
            ${isAdmin() ? `<td style="max-width:180px;white-space:normal;font-size:0.75rem;color:var(--text-secondary);">${escapeHtml(j.public_comment || '—')}</td>` : ''}
            <td class="actions-cell" style="white-space:nowrap; position:relative;">
                <button class="btn btn-sm btn-ghost" onclick="toggleJobMenu(${j.id}, event)" style="font-size:1.2rem;padding:4px 8px;">⋮</button>
                <div id="job-menu-${j.id}" class="job-action-menu hidden" style="position:absolute;right:10px;top:100%;background:var(--bg-elevated);border:1px solid var(--border-color);border-radius:6px;z-index:99;display:flex;flex-direction:column;min-width:160px;box-shadow:var(--shadow-md);">
                    ${isAdmin() ? `<button class="btn btn-ghost" style="justify-content:flex-start;border-radius:0;border-bottom:1px solid var(--border-color);padding:10px 16px;" onclick="editJob(${j.id})">Edit Job</button>` : ''}
                    ${currentJobsView !== 'archived' && isAdmin() ? `<button class="btn btn-ghost" style="justify-content:flex-start;border-radius:0;border-bottom:1px solid var(--border-color);padding:10px 16px;" onclick="archiveJob(${j.id})">Archive Job</button>` : ''}
                    ${isAdmin() ? `<button class="btn btn-ghost" style="justify-content:flex-start;border-radius:0;border-bottom:1px solid var(--border-color);padding:10px 16px;" onclick="openPublicComment(${j.id})">Public Comment</button>` : ''}
                    <button class="btn btn-ghost" style="justify-content:flex-start;border-radius:0;border-bottom:1px solid var(--border-color);padding:10px 16px;" onclick="markJobCompleted(${j.id})">Mark as Completed</button>
                    ${isAdmin() ? `<button class="btn btn-ghost text-danger" style="justify-content:flex-start;border-radius:0;padding:10px 16px;color:var(--danger);" onclick="deleteJob(${j.id})">Delete Job</button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');

    renderPagination('jobs-pagination', currentJobsPage, totalPages, (p) => { currentJobsPage = p; loadJobsData(); });
}



// ─── Full Calendar View ──────────────────────────────
function renderCalendarView(jobs) {
    const grid = document.getElementById('calendar-grid');
    if (!grid) { console.error('calendar-grid not found'); return; }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Update month label
    const label = document.getElementById('cal-month-label');
    if (label) label.textContent = `${monthNames[calMonth]} ${calYear}`;

    // Group ALL jobs by date (not just current month — so we can show count from DB)
    const jobsByDate = {};
    jobs.forEach(j => {
        if (j.move_date) {
            const d = j.move_date.split('T')[0];
            if (!jobsByDate[d]) jobsByDate[d] = [];
            jobsByDate[d].push(j);
        }
    });

    // Status color map
    const statusColors = {
        scheduled: { bg: 'rgba(99, 102, 241, 0.15)', border: '#6366f1', text: '#a5b4fc' },
        in_progress: { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', text: '#fbbf24' },
        completed: { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', text: '#6ee7b7' },
        cancelled: { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', text: '#fca5a5' }
    };

    let html = '';

    // Day-of-week headers
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        html += `<div class="cal-header">${day}</div>`;
    });

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="cal-day empty"></div>';
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayJobs = jobsByDate[dateStr] || [];
        const isToday = dateStr === todayStr;
        const hasJobs = dayJobs.length > 0;

        html += `<div class="cal-day ${isToday ? 'today' : ''} ${hasJobs ? 'has-jobs' : ''}" data-date="${dateStr}">`;
        html += `<div class="cal-date ${isToday ? 'today-date' : ''}">${d}${hasJobs ? ` <span class="cal-job-count">${dayJobs.length}</span>` : ''}</div>`;

        // Show up to 3 jobs, then "+N more"
        const displayJobs = dayJobs.slice(0, 3);
        displayJobs.forEach(j => {
            const sc = statusColors[j.status] || statusColors.scheduled;
            const name = `${j.first_name || ''} ${j.last_name || ''}`.trim() || 'Unnamed';
            const time = j.time_sheet || '';

            html += `<div class="cal-event" 
                style="background:${sc.bg}; border-left: 3px solid ${sc.border}; color:${sc.text};"
                onclick="editJob(${j.id})"
                title="${escapeHtml(name)} | ${time} | Status: ${j.status}">
                <div class="cal-event-name">${escapeHtml(name)}</div>
                ${time ? `<div class="cal-event-time">🕐 ${escapeHtml(time)}</div>` : ''}
            </div>`;
        });

        if (dayJobs.length > 3) {
            html += `<div class="cal-event-more" onclick="showDayDetail('${dateStr}')">+${dayJobs.length - 3} more</div>`;
        }

        // Add job button (only for admin or if they have permission)
        html += `<div class="cal-add-btn" onclick="addJobForDate('${dateStr}')" title="Add job for ${monthNames[calMonth]} ${d}">+</div>`;
        html += '</div>';
    }

    // Fill remaining cells to complete the last row
    const totalCells = firstDay + daysInMonth;
    const remainder = totalCells % 7;
    if (remainder > 0) {
        for (let i = 0; i < 7 - remainder; i++) {
            html += '<div class="cal-day empty"></div>';
        }
    }

    grid.innerHTML = html;
}

// Calendar navigation
function calPrev() {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendarView(allJobsCache);
}

function calNext() {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendarView(allJobsCache);
}

function calToday() {
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();
    renderCalendarView(allJobsCache);
}

// Add a job pre-filled with a specific date
function addJobForDate(dateStr) {
    document.getElementById('job-modal-title').textContent = 'Add New Job';
    document.getElementById('job-id').value = '';
    // Reset form
    document.querySelectorAll('#job-modal input, #job-modal select, #job-modal textarea').forEach(el => {
        if (el.type !== 'hidden') el.value = '';
    });
    // Pre-fill move date
    setJobVal('job-move-date', dateStr);
    openModal('job-modal');
}

// Show all jobs for a specific day
function showDayDetail(dateStr) {
    const dayJobs = allJobsCache.filter(j => j.move_date && j.move_date.split('T')[0] === dateStr);
    if (dayJobs.length === 0) return;

    const dateObj = new Date(dateStr + 'T12:00:00');
    const dateLabel = dateObj.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    let msg = `Jobs on ${dateLabel}:\n\n`;
    dayJobs.forEach((j, i) => {
        const name = `${j.first_name || ''} ${j.last_name || ''}`.trim();
        msg += `${i + 1}. ${name} — ${j.time_sheet || 'No time'} — ${j.status}\n`;
    });
    alert(msg);
}

// Tab switching – HTML uses data-view attribute
document.addEventListener('DOMContentLoaded', () => {
    // Initial filter setup
    const initialFilter = document.getElementById('jobs-status-filter');
    if (initialFilter) {
        initialFilter.innerHTML = `<option value="all">All Status</option>
                                   <option value="scheduled">Scheduled</option>
                                   <option value="in_progress">In Progress</option>`;
    }

    document.querySelectorAll('#page-jobs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#page-jobs .tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentJobsView = btn.dataset.view || 'upcoming';
            currentJobsPage = 1;

            const filter = document.getElementById('jobs-status-filter');
            if (filter) {
                if (currentJobsView === 'upcoming' || currentJobsView === 'team') {
                    filter.innerHTML = `<option value="all">All Status</option>
                                      <option value="scheduled">Scheduled</option>
                                      <option value="in_progress">In Progress</option>`;
                } else if (currentJobsView === 'past') {
                    filter.innerHTML = `<option value="all">All Status</option>
                                      <option value="completed">Completed</option>
                                      <option value="cancelled">Cancelled</option>`;
                } else if (currentJobsView !== 'archived') {
                    filter.innerHTML = `<option value="all">All Status</option>
                                      <option value="scheduled">Scheduled</option>
                                      <option value="in_progress">In Progress</option>
                                      <option value="completed">Completed</option>
                                      <option value="cancelled">Cancelled</option>`;
                }
                filter.value = 'all';
            }

            loadJobsData();
        });
    });

    // Calendar prev/next buttons
    const prevBtn = document.getElementById('cal-prev');
    const nextBtn = document.getElementById('cal-next');
    if (prevBtn) prevBtn.addEventListener('click', calPrev);
    if (nextBtn) nextBtn.addEventListener('click', calNext);

    // Make month label clickable to go to today
    const monthLabel = document.getElementById('cal-month-label');
    if (monthLabel) {
        monthLabel.style.cursor = 'pointer';
        monthLabel.title = 'Click to go to current month';
        monthLabel.addEventListener('click', calToday);
    }
});

async function editJob(id) {
    try {
        const res = await api.get(`/jobs/${id}`);
        if (!res.success) { showToast('Error', 'Job not found', 'error'); return; }
        const j = res.data;
        _jobIsEdit = true;
        _selectedBrand = j.brand || 'MoveAll';
        document.getElementById('job-id').value = id;
        setJobVal('job-first-name', j.first_name);
        setJobVal('job-last-name', j.last_name);
        setJobVal('job-cust-last', j.extras);   // extras repurposed for customer last name display
        setJobVal('job-phone', j.phone);
        setJobVal('job-email', j.email);
        setJobVal('job-extras', j.extras);
        setJobVal('job-deposit', j.deposit);
        setJobVal('job-invoice', j.invoice);
        setJobVal('job-time-sheet', j.time_sheet);
        setJobVal('job-move-out', j.move_out);
        setJobVal('job-second-stop', j.second_stop);
        setJobVal('job-move-in', j.move_in);
        // Split datetime into date + time
        if (j.move_date) {
            const dt = new Date(j.move_date);
            setJobVal('job-move-date', j.move_date.split('T')[0]);
            const hh = String(dt.getHours()).padStart(2, '0');
            const mm = String(dt.getMinutes()).padStart(2, '0');
            setJobVal('job-start-time', `${hh}:${mm}`);
        } else {
            setJobVal('job-move-date', '');
            setJobVal('job-start-time', '09:00');
        }
        setJobVal('job-on-way-sms', j.on_way_sms);
        setJobVal('job-last-sms', j.last_sms);
        setJobVal('job-status', j.status);
        setJobVal('job-brand', j.brand);
        setJobVal('job-price-point', j.price_point);
        setJobVal('job-notes', j.notes);
        setJobVal('job-sell-price', j.sell_price);
        setJobVal('job-buy-price', j.buy_price);
        if (j.sell_price !== undefined && j.buy_price !== undefined) {
            setJobVal('job-margin', ((parseFloat(j.sell_price)||0) - (parseFloat(j.buy_price)||0)).toFixed(2));
        }
        populateContractorDropdown();
        // Set contractor after dropdown is populated
        setTimeout(() => setJobVal('job-contractor', j.contractor), 50);
        // Hide Previous button on edit
        const prevBtn = document.getElementById('job-prev-btn');
        if (prevBtn) prevBtn.style.display = 'none';
        applyBrandBanner(j.brand || 'MoveAll');
        openModal('job-modal');
    } catch (err) {
        showToast('Error', 'Failed to load job', 'error');
    }
}

async function saveJob(e) {
    e.preventDefault();
    const editId = getJobVal('job-id');
    const submitBtn = document.getElementById('job-save-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
    }

    // Combine date + time into a datetime string
    const dateVal = getJobVal('job-move-date');
    const timeVal = getJobVal('job-start-time') || '09:00';
    const moveDatetime = dateVal ? `${dateVal}T${timeVal}:00` : null;

    const data = {
        first_name: getJobVal('job-first-name'),
        last_name: getJobVal('job-last-name'),
        phone: getJobVal('job-phone'),
        email: getJobVal('job-email'),
        team: null,
        contractor: getJobVal('job-contractor'),
        extras: getJobVal('job-extras'),
        deposit: getJobVal('job-deposit'),
        invoice: getJobVal('job-invoice'),
        time_sheet: getJobVal('job-time-sheet'),
        move_out: getJobVal('job-move-out'),
        second_stop: getJobVal('job-second-stop'),
        move_in: getJobVal('job-move-in'),
        move_date: moveDatetime,
        on_way_sms: getJobVal('job-on-way-sms'),
        last_sms: getJobVal('job-last-sms'),
        status: getJobVal('job-status') || 'scheduled',
        brand: getJobVal('job-brand') || null,
        price_point: getJobVal('job-price-point') || null,
        notes: getJobVal('job-notes') || null,
        sell_price: parseFloat(getJobVal('job-sell-price')) || null,
        buy_price: parseFloat(getJobVal('job-buy-price')) || null,
    };

    try {
        const res = editId ? await api.put(`/jobs/${editId}`, data) : await api.post('/jobs', data);
        if (res.success) {
            showToast('Success', editId ? 'Job updated' : 'Job created', 'success');
            closeModal('job-modal');
            loadJobsData();
        } else {
            showToast('Error', res.error || 'Failed to save job', 'error');
        }
    } catch (err) {
        showToast('Error', 'Failed to save job', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Job';
        }
    }
}

async function deleteJob(id) {
    if (!confirm('Delete this job?')) return;
    try {
        const res = await api.del(`/jobs/${id}`);
        if (res.success) { showToast('Deleted', 'Job removed', 'success'); loadJobsData(); }
        else showToast('Error', res.error || 'Delete failed', 'error');
    } catch (err) {
        showToast('Error', 'Failed to delete job', 'error');
    }
}

async function archiveJob(id) {
    if (!confirm('Archive this job?')) return;
    try {
        const res = await api.put(`/jobs/${id}`, { status: 'archived' });
        if (res.success) {
            showToast('Archived', 'Job moved to Archive', 'success');
            loadJobsData();
        } else {
            showToast('Error', res.error || 'Archive failed', 'error');
        }
    } catch (err) {
        showToast('Error', 'Failed to archive job', 'error');
    }
}

function openJobExpandModal(id) {
    const job = allJobsCache.find(j => j.id === id);
    if (!job) return;

    document.getElementById('expand-modal-id').value = id;
    const name = escapeHtml((job.first_name || '') + ' ' + (job.last_name || '')).trim();
    
    const titleNameEl = document.getElementById('expand-modal-title-name');
    if(titleNameEl) titleNameEl.innerHTML = `🔴 ${name}`;
    
    const phoneEl = document.getElementById('expand-modal-phone');
    if(phoneEl) phoneEl.textContent = job.phone || '—';
    const phone2El = document.getElementById('expand-modal-phone2');
    if(phone2El) phone2El.textContent = job.phone || '—';
    
    const dateStr = job.move_date ? new Date(job.move_date).toLocaleString('en-AU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
    const dateEl = document.getElementById('expand-modal-date');
    if(dateEl) dateEl.textContent = dateStr;
    
    const fnameEl = document.getElementById('expand-modal-fullname');
    if(fnameEl) fnameEl.innerHTML = `🔴 ${name}`;
    
    const brandBadgeHTML = job.brand === 'MoveAll' ? '<span style="background:#16a34a;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;">MoveAll</span>' : 
                          job.brand === 'TBMI' ? '<span style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;">TBMI</span>' : 
                          `<span style="background:#6b7280;color:#fff;padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;">${escapeHtml(job.brand||'—')}</span>`;
    const brandEl = document.getElementById('expand-modal-brand');
    if(brandEl) brandEl.innerHTML = brandBadgeHTML;
    
    const exEl = document.getElementById('expand-modal-extras');
    if(exEl) exEl.textContent = job.extras || '—';
    const tmEl = document.getElementById('expand-modal-team');
    if(tmEl) tmEl.textContent = job.team || '—';
    const moEl = document.getElementById('expand-modal-moveout');
    if(moEl) moEl.textContent = job.move_out || '—';
    const miEl = document.getElementById('expand-modal-movein');
    if(miEl) miEl.textContent = job.move_in || '—';
    
    const inpEl = document.getElementById('expand-modal-comment-input');
    if(inpEl) inpEl.value = '';
    
    if (typeof applyRBAC === 'function') applyRBAC();

    openModal('job-expand-modal');
}

function sendQuickSMS(id, type) {
    showToast('SMS Request', `Twilio integration pending. Preparing to send ${type} SMS.`, 'success');
}

function addJobCommentFromModal() {
    const id = document.getElementById('expand-modal-id').value;
    const input = document.getElementById('expand-modal-comment-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text || !id) return;

    const list = document.getElementById('expand-modal-comments-list');
    const user = getCurrentUser();
    
    const div = document.createElement('div');
    div.style.cssText = 'margin-bottom:8px; border-bottom:1px solid var(--border-color); padding-bottom:4px;';
    
    const roleColor = user?.role === 'admin' ? 'var(--primary-400)' : 'var(--success)';
    const userName = user?.name || 'Unknown';
    
    div.innerHTML = `
        <strong style="color:${roleColor};">${escapeHtml(userName)}</strong> <span style="font-size:0.7rem;">(Just now)</span><br>
        ${escapeHtml(text)}
    `;
    
    if (list && list.innerHTML.includes('No comments yet')) {
        list.innerHTML = '';
    }
    
    if (list) {
        list.appendChild(div);
        list.scrollTop = list.scrollHeight;
    }
    input.value = '';
    
    showToast('Comment added', '', 'success');
}
