// MoveHome CRM – Dashboard Module

// Dashboard calendar state (separate from Jobs page calendar)
let dashCalYear, dashCalMonth;
let dashJobsCache = [];
(function initDashCalDate() {
    const now = new Date();
    dashCalYear  = now.getFullYear();
    dashCalMonth = now.getMonth();
})();

async function loadDashboardData() {
    try {
        // ── 1. Populate logged-in user card ──────────────────
        const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
        if (user) {
            const avatarEl = document.getElementById('dash-user-avatar');
            const nameEl   = document.getElementById('dash-user-name');
            const roleEl   = document.getElementById('dash-user-role');
            const phoneEl  = document.getElementById('dash-user-phone');

            if (avatarEl) avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();
            if (nameEl)   nameEl.textContent   = user.name  || '—';
            if (roleEl)   roleEl.textContent   = user.role === 'admin' ? 'Administrator' : (user.role || 'Staff');
            if (phoneEl)  phoneEl.textContent  = user.phone ? '📞 ' + user.phone : '';
        }

        // ── 2. Fetch all jobs for the calendar ────────────────
        const res = await api.get('/jobs', { limit: 500 });
        dashJobsCache = res.success ? (res.data || []) : [];

        // ── 3. Render the dashboard calendar ─────────────────
        renderDashCalendar(dashJobsCache);

    } catch (err) {
        console.error('Dashboard load error:', err);
    }
}

// ─── Dashboard Calendar Renderer ──────────────────────────────────────────────
function renderDashCalendar(jobs) {
    const grid = document.getElementById('dash-calendar-grid');
    if (!grid) return;

    const today    = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const firstDay    = new Date(dashCalYear, dashCalMonth, 1).getDay();
    const daysInMonth = new Date(dashCalYear, dashCalMonth + 1, 0).getDate();
    const monthNames  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    // Update label
    const label = document.getElementById('dash-cal-month-label');
    if (label) label.textContent = `${monthNames[dashCalMonth]} ${dashCalYear}`;

    // Group jobs by date
    const jobsByDate = {};
    jobs.forEach(j => {
        if (j.move_date) {
            const d = j.move_date.split('T')[0];
            if (!jobsByDate[d]) jobsByDate[d] = [];
            jobsByDate[d].push(j);
        }
    });

    const statusColors = {
        scheduled:   { bg: 'rgba(99,102,241,0.15)',  border: '#6366f1', text: '#a5b4fc' },
        in_progress: { bg: 'rgba(245,158,11,0.15)',  border: '#f59e0b', text: '#fbbf24' },
        completed:   { bg: 'rgba(16,185,129,0.15)',  border: '#10b981', text: '#6ee7b7' },
        cancelled:   { bg: 'rgba(239,68,68,0.15)',   border: '#ef4444', text: '#fca5a5' }
    };

    let html = '';

    // Day-of-week headers
    ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(day => {
        html += `<div class="cal-header">${day}</div>`;
    });

    // Empty cells before 1st
    for (let i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${dashCalYear}-${String(dashCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const dayJobs = jobsByDate[dateStr] || [];
        const isToday = dateStr === todayStr;

        html += `<div class="cal-day ${isToday ? 'today' : ''} ${dayJobs.length ? 'has-jobs' : ''}" data-date="${dateStr}">`;
        html += `<div class="cal-date ${isToday ? 'today-date' : ''}">${d}${dayJobs.length ? ` <span class="cal-job-count">${dayJobs.length}</span>` : ''}</div>`;

        dayJobs.slice(0, 3).forEach(j => {
            const sc   = statusColors[j.status] || statusColors.scheduled;
            const name = `${j.first_name||''} ${j.last_name||''}`.trim() || 'Unnamed';
            const time = j.time_sheet || '';
            html += `<div class="cal-event"
                style="background:${sc.bg}; border-left:3px solid ${sc.border}; color:${sc.text};"
                onclick="editJob(${j.id})"
                title="${escapeHtml(name)} | ${time} | ${j.status}">
                <div class="cal-event-name">${escapeHtml(name)}</div>
                ${time ? `<div class="cal-event-time">🕐 ${escapeHtml(time)}</div>` : ''}
            </div>`;
        });

        if (dayJobs.length > 3) {
            html += `<div class="cal-event-more" onclick="dashShowDayDetail('${dateStr}')">+${dayJobs.length - 3} more</div>`;
        }

        // Add job button
        html += `<div class="cal-add-btn" onclick="addJobForDate('${dateStr}')" title="Add job for ${monthNames[dashCalMonth]} ${d}">+</div>`;
        html += '</div>';
    }

    // Trailing empty cells
    const totalCells = firstDay + daysInMonth;
    const remainder  = totalCells % 7;
    if (remainder > 0) {
        for (let i = 0; i < 7 - remainder; i++) html += '<div class="cal-day empty"></div>';
    }

    grid.innerHTML = html;
}

function dashCalPrev() {
    dashCalMonth--;
    if (dashCalMonth < 0) { dashCalMonth = 11; dashCalYear--; }
    renderDashCalendar(dashJobsCache);
}

function dashCalNext() {
    dashCalMonth++;
    if (dashCalMonth > 11) { dashCalMonth = 0; dashCalYear++; }
    renderDashCalendar(dashJobsCache);
}

function dashShowDayDetail(dateStr) {
    const dayJobs = dashJobsCache.filter(j => j.move_date && j.move_date.split('T')[0] === dateStr);
    if (!dayJobs.length) return;
    const dateObj   = new Date(dateStr + 'T12:00:00');
    const dateLabel = dateObj.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    let msg = `Jobs on ${dateLabel}:\n\n`;
    dayJobs.forEach((j, i) => {
        const name = `${j.first_name||''} ${j.last_name||''}`.trim();
        msg += `${i+1}. ${name} — ${j.time_sheet||'No time'} — ${j.status}\n`;
    });
    alert(msg);
}

// Wire up prev/next buttons after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const prevBtn = document.getElementById('dash-cal-prev');
    const nextBtn = document.getElementById('dash-cal-next');
    if (prevBtn) prevBtn.addEventListener('click', dashCalPrev);
    if (nextBtn) nextBtn.addEventListener('click', dashCalNext);
});
