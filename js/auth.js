// MoveHome CRM - Authentication via Supabase (no server needed)

let currentUser = supabaseAuth.getUser();

function getCurrentUser() { return currentUser; }
function isAdmin() { return currentUser && currentUser.role === 'admin'; }

function fillDemoCredentials(email, password) {
    const emailEl = document.getElementById('login-email');
    const passEl  = document.getElementById('login-password');
    if (emailEl) emailEl.value = email;
    if (passEl)  passEl.value  = password;
}

async function handleLogin(e) {
    e.preventDefault();
    const email    = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    const errorEl  = document.getElementById('login-error');

    if (!email || !password) {
        if (errorEl) { errorEl.textContent = 'Please enter email and password.'; errorEl.classList.remove('hidden'); }
        return;
    }

    const btn = document.getElementById('login-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }

    try {
        currentUser = await supabaseAuth.login(email, password);
        if (errorEl) errorEl.classList.add('hidden');
        showToast('Welcome!', `Signed in as ${currentUser.name}`, 'success');
        showDashboard();
    } catch (err) {
        console.error('Login error:', err);
        if (errorEl) { errorEl.textContent = err.message || 'Invalid email or password.'; errorEl.classList.remove('hidden'); }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    }
}

function checkAuth() {
    currentUser = supabaseAuth.getUser();
    return supabaseAuth.isLoggedIn();
}

function logout() {
    currentUser = null;
    supabaseAuth.logout();
    showLoginScreen();
    showToast('Signed Out', 'You have been logged out.', 'success');
}

function showLoginScreen() {
    const login = document.getElementById('login-screen');
    const app   = document.getElementById('dashboard-screen');
    if (login) login.classList.remove('hidden');
    if (app)   app.classList.add('hidden');
}

function showDashboard() {
    const login = document.getElementById('login-screen');
    const app   = document.getElementById('dashboard-screen');
    if (login) login.classList.add('hidden');
    if (app)   app.classList.remove('hidden');
    updateUserInfo();
    applyRBAC();
    navigateTo('dashboard');
}

function updateUserInfo() {
    if (!currentUser) return;
    // Sidebar footer
    const nameEl   = document.getElementById('user-name');
    const roleEl   = document.getElementById('user-role');
    const avatarEl = document.getElementById('user-avatar');
    if (nameEl)   nameEl.textContent   = currentUser.name;
    if (roleEl)   roleEl.textContent   = currentUser.role === 'admin' ? 'Administrator' : 'Staff Member';
    if (avatarEl) avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();

    // Dashboard profile card
    const dashAvatar = document.getElementById('dash-user-avatar');
    const dashName   = document.getElementById('dash-user-name');
    const dashRole   = document.getElementById('dash-user-role');
    const dashPhone  = document.getElementById('dash-user-phone');
    if (dashAvatar) dashAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
    if (dashName)   dashName.textContent   = currentUser.name;
    if (dashRole)   dashRole.textContent   = currentUser.role === 'admin' ? 'Administrator' : 'Staff Member';
    if (dashPhone)  dashPhone.textContent  = currentUser.phone ? '📞 ' + currentUser.phone : '';
}

function applyRBAC() {
    const admin = isAdmin();

    document.querySelectorAll('.col-private-notes').forEach(el => {
        el.style.display = admin ? '' : 'none';
    });

    ['nav-storage', 'nav-contacts', 'nav-contractors', 'nav-users'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = admin ? 'flex' : 'none';
    });

    ['qa-add-user'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = admin ? 'flex' : 'none';
    });

    document.querySelectorAll('[data-quick]').forEach(el => {
        if (['add-storage', 'add-contact', 'add-contractor', 'add-user'].includes(el.dataset.quick)) {
            el.style.display = admin ? 'flex' : 'none';
        }
    });

    document.querySelectorAll('#page-jobs .tab-btn').forEach(btn => {
        if (['upcoming', 'past', 'archived'].includes(btn.dataset.view)) {
            btn.style.display = admin ? 'inline-flex' : 'none';
        }
    });

    if (!admin) {
        const teamTab = document.querySelector('#page-jobs .tab-btn[data-view="team"]');
        if (teamTab) {
            document.querySelectorAll('#page-jobs .tab-btn').forEach(b => b.classList.remove('active'));
            teamTab.classList.add('active');
            if (typeof currentJobsView !== 'undefined') currentJobsView = 'team';
        }
    }
}
