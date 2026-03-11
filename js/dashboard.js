// MoveHome CRM – Dashboard Module (API-connected)

async function loadDashboardData() {
    try {
        const admin = isAdmin();

        // Fetch data — staff only gets leads + jobs
        const promises = [
            api.get('/leads', { limit: 200 }),
            api.get('/jobs', { limit: 200 })
        ];
        if (admin) {
            promises.push(api.get('/storage', { limit: 200 }));
            promises.push(api.get('/contacts', { limit: 200 }));
        }

        const results = await Promise.all(promises);
        const leads = results[0].success ? results[0].data : [];
        const jobs = results[1].success ? results[1].data : [];
        const storage = admin && results[2]?.success ? results[2].data : [];
        const contacts = admin && results[3]?.success ? results[3].data : [];

        // --- Stat Cards ---
        const statCards = document.getElementById('stats-grid');
        if (statCards) {
            let html = `
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${leads.length}</div>
                        <div class="stat-label">Total Leads</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #06b6d4, #0891b2);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    </div>
                    <div class="stat-info">
                        <div class="stat-value">${jobs.length}</div>
                        <div class="stat-label">Total Jobs</div>
                    </div>
                </div>
            `;

            // Admin-only stat cards
            if (admin) {
                html += `
                    <div class="stat-card">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${storage.filter(s => s.status === 'active').length}</div>
                            <div class="stat-label">Active Storage</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${contacts.length}</div>
                            <div class="stat-label">Contacts</div>
                        </div>
                    </div>
                `;
            }

            statCards.innerHTML = html;
        }

        // --- Recent Leads ---
        const recentLeads = document.getElementById('recent-leads-list');
        if (recentLeads) {
            const latest = leads.slice(0, 5);
            recentLeads.innerHTML = latest.length === 0
                ? '<p class="text-center">No leads yet.</p>'
                : latest.map(l => `
                    <div class="activity-item">
                        <div class="activity-dot status-dot-${l.status}"></div>
                        <div class="activity-content">
                            <strong>${escapeHtml(l.customer_name)}</strong>
                            <span class="status-badge status-${l.status}">${l.status}</span>
                            <div class="activity-meta">${l.move_date ? 'Move: ' + formatDate(l.move_date) : 'No date set'}</div>
                        </div>
                    </div>
                `).join('');
        }

        // --- Upcoming Jobs ---
        const upcomingJobs = document.getElementById('upcoming-jobs-list');
        if (upcomingJobs) {
            const today = new Date().toISOString().split('T')[0];
            const upcoming = jobs.filter(j => j.move_date && j.move_date.split('T')[0] >= today && j.status !== 'completed').slice(0, 5);
            upcomingJobs.innerHTML = upcoming.length === 0
                ? '<p class="text-center">No upcoming jobs.</p>'
                : upcoming.map(j => `
                    <div class="activity-item">
                        <div class="activity-dot"></div>
                        <div class="activity-content">
                            <strong>${escapeHtml(j.first_name || '')} ${escapeHtml(j.last_name || '')}</strong>
                            <span class="tag-badge">${escapeHtml(j.team || 'Unassigned')}</span>
                            <div class="activity-meta">${formatDate(j.move_date)} · ${escapeHtml(j.time_sheet || 'TBD')}</div>
                        </div>
                    </div>
                `).join('');
        }

    } catch (err) {
        console.error('Dashboard load error:', err);
    }
}
