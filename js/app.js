// MoveHome CRM - Main Application
window.addEventListener('error', function(event) {
    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:red;color:white;z-index:999999;padding:20px;font-size:16px;white-space:pre-wrap;text-align:left;height:100vh;overflow:auto;';
    errorMsg.innerHTML = `<strong>CRITICAL ERROR DETECTED</strong><br><br>${event.message}<br>File: ${event.filename}<br>Line: ${event.lineno}:${event.colno}<br><br>${event.error?.stack || ''}`;
    document.body.appendChild(errorMsg);
});
window.addEventListener('unhandledrejection', function(event) {
    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = 'position:fixed;top:0;left:0;width:100%;background:red;color:white;z-index:999999;padding:20px;font-size:16px;white-space:pre-wrap;text-align:left;height:100vh;overflow:auto;';
    errorMsg.innerHTML = `<strong>UNHANDLED PROMISE REJECTION</strong><br><br>${event.reason?.message || event.reason}<br><br>${event.reason?.stack || ''}`;
    document.body.appendChild(errorMsg);
});

// =============================================
// UTILITY FUNCTIONS
// =============================================

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Safely escape strings for inline JS handlers inside HTML template literals
function escapeJsAttr(str) {
    if (!str) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;');
}

function truncate(str, len) {
    if (!str) return '–';
    return str.length > len ? str.substring(0, len) + '…' : str;
}

function formatDate(dateStr) {
    if (!dateStr) return '–';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return dateStr; }
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const d = new Date(dateStr);
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
}

// =============================================
// TOAST NOTIFICATIONS
// =============================================

function showToast(title, message, type, duration) {
    // Support simple 1-arg call: showToast('message')
    if (!message && !type) {
        message = '';
        type = 'success';
    }
    if (!type) type = 'success';
    if (!duration) duration = 4000;

    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</div>
        <div class="toast-content">
            <strong>${escapeHtml(title)}</strong>
            ${message ? `<p>${escapeHtml(message)}</p>` : ''}
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// =============================================
// PAGINATION
// =============================================

function renderPagination(containerId, currentPage, totalPages, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    html += `<button class="pagination-btn ${currentPage <= 1 ? 'disabled' : ''}" ${currentPage <= 1 ? 'disabled' : ''} data-action="prev">← Prev</button>`;

    for (let i = 1; i <= totalPages && i <= 7; i++) {
        html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    html += `<button class="pagination-btn ${currentPage >= totalPages ? 'disabled' : ''}" ${currentPage >= totalPages ? 'disabled' : ''} data-action="next">Next →</button>`;

    container.innerHTML = html;

    // Wire events
    container.querySelectorAll('.pagination-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', () => onPageChange(parseInt(btn.dataset.page)));
    });
    container.querySelector('[data-action="prev"]')?.addEventListener('click', () => {
        if (currentPage > 1) onPageChange(currentPage - 1);
    });
    container.querySelector('[data-action="next"]')?.addEventListener('click', () => {
        if (currentPage < totalPages) onPageChange(currentPage + 1);
    });
}

// =============================================
// MODAL HELPERS
// =============================================

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
    // Reset form
    const form = modal?.querySelector('form');
    if (form) form.reset();
}

function openCreateModal(id) {
    // Reset the title to "Add" mode
    const titleMap = {
        'lead-modal': 'Add New Lead',
        'job-modal': 'Add New Job',
        'storage-modal': 'Add Storage Plan',
        'contact-modal': 'Add New Contact',
        'contractor-modal': 'Add New Contractor',
        'user-modal': 'Add New App User',
    };
    const titleEl = document.querySelector(`#${id} .modal-header h2`);
    if (titleEl && titleMap[id]) titleEl.textContent = titleMap[id];
    // Clear hidden id
    const hiddenId = document.querySelector(`#${id} input[type="hidden"]`);
    if (hiddenId) hiddenId.value = '';
    // Hide lead actions panel for new leads
    if (id === 'lead-modal') {
        const actionsPanel = document.getElementById('lead-actions-panel');
        if (actionsPanel) actionsPanel.classList.add('hidden');
    }
    openModal(id);
}

// Global hook to strip spaces from any mobile or phone inputs instantly as the user types/pastes
document.addEventListener('input', function (e) {
    if (e.target && e.target.tagName === 'INPUT') {
        const type = e.target.type || '';
        const id = e.target.id ? e.target.id.toLowerCase() : '';
        const name = e.target.name ? e.target.name.toLowerCase() : '';

        // If it's a phone input
        if (type === 'tel' || id.includes('phone') || id.includes('mobile') || name.includes('phone') || name.includes('mobile')) {
            // Remove everything except digits and the plus sign
            let rawVal = e.target.value;
            let strippedVal = rawVal.replace(/[^\d+]/g, '');
            if (rawVal !== strippedVal) {
                // Keep the cursor position from jumping if possible
                const start = e.target.selectionStart;
                e.target.value = strippedVal;
                // Cursor position will shift slightly but value is clean
            }
        }
    }
});

document.addEventListener('DOMContentLoaded', function () {
    // Login form
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);

    // Nav items
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(item.dataset.page);
        });
    });

    // Quick Actions
    document.querySelectorAll('[data-quick]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const action = item.dataset.quick;
            switch (action) {
                case 'add-lead': navigateTo('leads'); setTimeout(() => openCreateModal('lead-modal'), 100); break;
                case 'add-job': navigateTo('jobs'); setTimeout(() => openJobBrandPicker(), 100); break;
                case 'add-contact': navigateTo('contacts'); setTimeout(() => openCreateModal('contact-modal'), 100); break;
                case 'add-storage': navigateTo('storage'); setTimeout(() => openCreateModal('storage-modal'), 100); break;
                case 'add-contractor': navigateTo('contractors'); setTimeout(() => openCreateModal('contractor-modal'), 100); break;
                case 'add-user': navigateTo('users'); setTimeout(() => openCreateModal('user-modal'), 100); break;
            }
        });
    });

    // Sidebar toggle
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    
    toggleBtn?.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar?.classList.toggle('open');
        } else {
            sidebar?.classList.toggle('collapsed');
        }
    });

    // Close sidebar on mobile when clicking a nav item or outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar?.classList.contains('open')) {
            const isClickInsideSidebar = sidebar.contains(e.target);
            const isClickOnToggle = toggleBtn.contains(e.target);
            const isClickOnNavItem = e.target.closest('.nav-item');
            
            if (isClickOnNavItem || (!isClickInsideSidebar && !isClickOnToggle)) {
                sidebar.classList.remove('open');
            }
        }
    });

    // Form submissions are handled via inline onsubmit="..." in index.html

    // Filter changes
    document.getElementById('leads-status-filter')?.addEventListener('change', () => { currentLeadsPage = 1; loadLeadsData(); });
    document.getElementById('jobs-status-filter')?.addEventListener('change', () => { currentJobsPage = 1; loadJobsData(); });
    document.getElementById('jobs-brand-filter')?.addEventListener('change', () => { currentJobsPage = 1; loadJobsData(); });
    document.getElementById('jobs-price-filter')?.addEventListener('change', () => { currentJobsPage = 1; loadJobsData(); });
    document.getElementById('jobs-contractor-filter')?.addEventListener('change', () => { currentJobsPage = 1; loadJobsData(); });
    document.getElementById('contacts-category-filter')?.addEventListener('change', () => { currentContactsPage = 1; loadContactsData(); });
    document.getElementById('contractors-category-filter')?.addEventListener('change', () => { currentContractorsPage = 1; loadContractorsData(); });

    // Global search (debounced)
    let searchTimeout;
    document.getElementById('global-search')?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => loadPageData(currentPage), 400);
    });

    // Modal close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.add('hidden');
        });
    });

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
        }
    });

    // Check Authentication
    if (checkAuth()) {
        showDashboard();
    } else {
        showLoginScreen();
    }
});
