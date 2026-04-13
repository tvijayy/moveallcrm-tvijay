// MoveHome CRM - SPA Router

let currentPage = 'dashboard';

const pageConfig = {
    dashboard: { title: 'Dashboard', subtitle: 'Overview of your moving operations', action: null },
    leads: { title: 'Leads', subtitle: 'Manage your sales pipeline', action: { text: 'Add New Lead', modal: 'lead-modal' } },
    jobs: { title: 'Job Schedule', subtitle: 'Manage moving jobs', action: { text: 'Add New Job', modal: 'job-modal' } },
    storage: { title: 'Storage Masterlist', subtitle: 'Manage storage plans', action: { text: 'Add Storage Plan', modal: 'storage-modal' } },
    contacts: { title: 'Contacts', subtitle: 'Your contact directory', action: { text: 'Add New Contact', modal: 'contact-modal' } },
    contractors: { title: 'Contractor Directory', subtitle: 'Manage contractors & teams', action: { text: 'Add New Contractor', modal: 'contractor-modal' } },
    users: { title: 'App Users', subtitle: 'Manage system users', action: { text: 'Add New App User', modal: 'user-modal' } }
};

function navigateTo(page) {
    if (!pageConfig[page]) return;

    // RBAC: admin-only pages
    const adminOnlyPages = ['storage', 'contacts', 'contractors', 'users'];
    if (adminOnlyPages.includes(page) && !isAdmin()) {
        showToast('Access Denied', 'You don\'t have permission to view this page.', 'error');
        return;
    }

    currentPage = page;
    const config = pageConfig[page];

    // Update header
    document.getElementById('page-title').textContent = config.title;
    document.getElementById('page-subtitle').textContent = config.subtitle;

    // Update action button
    const actionBtn = document.getElementById('page-action-btn');
    if (config.action) {
        actionBtn.style.display = 'inline-flex';
        document.getElementById('page-action-text').textContent = config.action.text;
        if (page === 'jobs') {
            actionBtn.onclick = () => openJobBrandPicker();
        } else {
            actionBtn.onclick = () => openCreateModal(config.action.modal);
        }
    } else {
        actionBtn.style.display = 'none';
    }

    // Toggle page containers
    document.querySelectorAll('.page-container').forEach(el => el.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    // Toggle active nav item
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });

    // Toggle search box visibility (hidden on dashboard)
    const searchBox = document.getElementById('global-search-box');
    const header = document.querySelector('.main-header');
    if (searchBox) {
        const isDashboard = page === 'dashboard';
        searchBox.style.display = isDashboard ? 'none' : 'flex';
        if (header) {
            header.classList.toggle('header-dashboard', isDashboard);
        }
    }

    // Load page data
    loadPageData(page);
}

function loadPageData(page) {
    switch (page) {
        case 'dashboard': loadDashboardData(); break;
        case 'leads': loadLeadsData(); break;
        case 'jobs': loadContractorsForJobs(); loadJobsData(); break;
        case 'storage': loadStorageData(); break;
        case 'contacts': loadContactsData(); break;
        case 'contractors': loadContractorsData(); break;
        case 'users': loadUsersData(); break;
    }
}
