// MoveHome CRM – Jobs Module (API-connected)

let currentJobsView = 'upcoming';
let currentJobsPage = 1;
const JOBS_PER_PAGE = 10;

// Calendar state
let calYear, calMonth;
let allJobsCache = [];
let calendarRefreshInterval = null;
(function initCalDate() {
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();
})();

// Helper: get/set form values by element ID
function getJobVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function setJobVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }

async function loadJobsData() {
    const params = { limit: 200 };
    if (currentJobsView === 'upcoming') params.view = 'upcoming';
    else if (currentJobsView === 'past') params.view = 'past';
    else if (currentJobsView === 'archived') params.view = 'archived';

    const statusFilter = document.getElementById('jobs-status-filter')?.value;
    if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
    }

    try {
        const res = await api.get('/jobs', params);
        if (!res.success) { showToast('Error', res.error || 'Failed to load jobs', 'error'); return; }
        let jobs = res.data || [];

        // Apply global search
        const q = (document.getElementById('global-search')?.value || '').toLowerCase().trim();
        if (q) {
            jobs = jobs.filter(j =>
                (`${j.first_name || ''} ${j.last_name || ''}`).toLowerCase().includes(q) ||
                (j.phone || '').toLowerCase().includes(q) ||
                (j.email || '').toLowerCase().includes(q) ||
                (j.contractor || '').toLowerCase().includes(q) ||
                (j.invoice || '').toLowerCase().includes(q)
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

function renderMasterView(jobs) {
    const tbody = document.getElementById('jobs-tbody');
    if (!tbody) { console.error('jobs-tbody not found'); return; }
    const totalPages = Math.ceil(jobs.length / JOBS_PER_PAGE);
    const start = (currentJobsPage - 1) * JOBS_PER_PAGE;
    const page = jobs.slice(start, start + JOBS_PER_PAGE);

    if (page.length === 0) {
        tbody.innerHTML = '<tr><td colspan="18" class="text-center">No jobs found.</td></tr>';
        return;
    }

    tbody.innerHTML = page.map(j => `
        <tr data-id="${j.id}">
            <td>${j.move_date ? formatDate(j.move_date) : '—'}</td>
            <td>${escapeHtml(j.first_name || '')} ${escapeHtml(j.last_name || '')}</td>
            <td><span class="status-badge status-${j.status}">${j.status || '—'}</span></td>
            <td>${escapeHtml(j.contractor || '—')}</td>
            <td>${escapeHtml(j.extras || '—')}</td>
            <td>$${(parseFloat(j.deposit) || 0).toFixed(0)}</td>
            <td>${escapeHtml(j.invoice || '—')}</td>
            <td>${escapeHtml(j.phone || '—')}</td>
            <td>${escapeHtml(j.email || '—')}</td>
            <td>${escapeHtml(j.first_name || '—')}</td>
            <td>${escapeHtml(j.last_name || '—')}</td>
            <td title="${escapeHtml(j.move_out || '')}">${truncate(j.move_out || '—', 20)}</td>
            <td title="${escapeHtml(j.second_stop || '')}">${truncate(j.second_stop || '—', 20)}</td>
            <td title="${escapeHtml(j.move_in || '')}">${truncate(j.move_in || '—', 20)}</td>
            <td><span class="sms-badge sms-${j.on_way_sms}">${j.on_way_sms === 'sent' ? '✓ Sent' : '✗ Not Sent'}</span></td>
            <td><span class="sms-badge sms-${j.last_sms}">${j.last_sms === 'sent' ? '✓ Sent' : '✗ Not Sent'}</span></td>
            <td>${escapeHtml(j.time_sheet || '—')}</td>
            <td class="actions-cell">
                <button class="btn btn-sm btn-outline" onclick="editJob(${j.id})">Edit</button>
                ${currentJobsView !== 'archived' ? `<button class="btn btn-sm btn-ghost" onclick="archiveJob(${j.id})">Archive</button>` : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteJob(${j.id})">Delete</button>
            </td>
        </tr>
    `).join('');

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
            const filterGroup = filter?.closest('.filter-group');
            if (filter) {
                if (currentJobsView === 'upcoming') {
                    filter.innerHTML = `<option value="all">All Status</option>
                                      <option value="scheduled">Scheduled</option>
                                      <option value="in_progress">In Progress</option>`;
                    if (filterGroup) filterGroup.classList.remove('hidden');
                } else if (currentJobsView === 'past') {
                    filter.innerHTML = `<option value="all">All Status</option>
                                      <option value="completed">Completed</option>
                                      <option value="cancelled">Cancelled</option>`;
                    if (filterGroup) filterGroup.classList.remove('hidden');
                } else if (currentJobsView === 'archived') {
                    if (filterGroup) filterGroup.classList.add('hidden');
                } else {
                    filter.innerHTML = `<option value="all">All Status</option>
                                      <option value="scheduled">Scheduled</option>
                                      <option value="in_progress">In Progress</option>
                                      <option value="completed">Completed</option>
                                      <option value="cancelled">Cancelled</option>`;
                    if (filterGroup) filterGroup.classList.remove('hidden');
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
        document.getElementById('job-modal-title').textContent = 'Edit Job';
        document.getElementById('job-id').value = id;
        setJobVal('job-first-name', j.first_name);
        setJobVal('job-last-name', j.last_name);
        setJobVal('job-phone', j.phone);
        setJobVal('job-email', j.email);
        setJobVal('job-contractor', j.contractor);
        setJobVal('job-extras', j.extras);
        setJobVal('job-deposit', j.deposit);
        setJobVal('job-invoice', j.invoice);
        setJobVal('job-time-sheet', j.time_sheet);
        setJobVal('job-move-out', j.move_out);
        setJobVal('job-second-stop', j.second_stop);
        setJobVal('job-move-in', j.move_in);
        setJobVal('job-move-date', j.move_date ? j.move_date.split('T')[0] : '');
        setJobVal('job-on-way-sms', j.on_way_sms);
        setJobVal('job-last-sms', j.last_sms);
        setJobVal('job-status', j.status);
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
        move_date: getJobVal('job-move-date') || null,
        on_way_sms: getJobVal('job-on-way-sms'),
        last_sms: getJobVal('job-last-sms'),
        status: getJobVal('job-status') || 'scheduled'
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
