// ========================================
// MONEYTRADE AI - ULTIMATE TRADING ASSISTANT
// Built with pure HTML, CSS, and JavaScript
// ========================================

// ===== STATE MANAGEMENT =====
// Central state object that holds all app data
const State = {
    currentUser: null,          // Current logged-in user info
    currentView: 'chat',        // Which view is active (chat, dashboard, etc.)
    currentTheme: 'default',    // Current color theme
    darkMode: true,             // Dark or light mode
    soundEnabled: true,         // Sound effects on/off
    balance: 10000,             // Virtual trading balance
    xp: 0,                      // Experience points
    unlockedAchievements: [],   // Unlocked achievement ids (loaded from server)
    positions: [],              // Open trading positions
    tradeHistory: [],           // All trades made
    watchlist: [],              // Watched symbols [{symbol, name}]
    currentConversationId: null,// Active chat conversation id (server-side)
    attachments: []             // Files attached to chat
};

// ===== BACKEND API =====
// When the page is served by Flask (http://localhost:5000) the API is same-origin.
// If the page is opened another way (Live Server, file://, a different port),
// target the Flask backend directly. CORS is enabled server-side, so this works.
const _servedByFlask =
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1') &&
    location.port === '5000';
const API_BASE = _servedByFlask ? '' : 'http://localhost:5000';
const TOKEN_KEY = 'moneytrade_token';
const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Thin fetch wrapper: attaches the JWT, parses JSON, throws on error responses.
async function api(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && getToken()) headers['Authorization'] = `Bearer ${getToken()}`;
    const res = await fetch(API_BASE + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* no JSON body */ }
    if (!res.ok) {
        const msg = (data && (data.error || data.msg)) || `Request failed (${res.status})`;
        throw new Error(msg);
    }
    return data;
}

// Pull the user's full state from the server into State, then render.
async function loadServerState() {
    const [me, portfolio, wl, ach] = await Promise.all([
        api('/api/auth/me'),
        api('/api/portfolio'),
        api('/api/watchlist'),
        api('/api/achievements'),
    ]);
    const u = me.user;
    State.currentUser = { id: u.id, email: u.email, name: u.name, avatar: u.avatar, isAdmin: u.isAdmin };
    State.balance = portfolio.balance;
    State.xp = portfolio.xp;
    State.positions = portfolio.positions;
    State.tradeHistory = portfolio.tradeHistory;
    State.watchlist = wl.watchlist;
    State.unlockedAchievements = ach.unlockedAchievements;
    State.currentTheme = u.theme;
    State.darkMode = u.darkMode;
    State.soundEnabled = u.soundEnabled;
}

// Persist a settings change to the server (fire-and-forget, best effort).
function saveSettings(partial) {
    if (!getToken()) return;
    api('/api/settings', { method: 'PATCH', body: partial }).catch(() => {});
}

// ===== ACHIEVEMENTS DATA =====
// All available achievements - users unlock these by performing actions
const ACHIEVEMENTS = [
    { id: 'first-login', name: 'Welcome Trader', desc: 'Logged in for the first time', icon: '🎉', xp: 20 },
    { id: 'first-trade', name: 'First Trade', desc: 'Made your first trade', icon: '🚀', xp: 50 },
    { id: 'curious-mind', name: 'Curious Mind', desc: 'Asked your first question', icon: '🧠', xp: 25 },
    { id: 'chat-master', name: 'Chat Master', desc: 'Sent 10 messages', icon: '💬', xp: 50 },
    { id: 'portfolio-builder', name: 'Portfolio Builder', desc: 'Hold 5 different assets', icon: '🏆', xp: 150 },
    { id: 'profit-maker', name: 'Profit Maker', desc: 'Earn $1000 in profit', icon: '📈', xp: 200 },
    { id: 'whale-trader', name: 'Whale Trader', desc: 'Make a single trade worth $5,000+', icon: '🐋', xp: 180 },
    { id: 'diversified', name: 'Diversified', desc: 'Trade 3 different assets', icon: '🎨', xp: 100 },
    { id: 'quick-trader', name: 'Quick Trader', desc: 'Make 5 trades in one session', icon: '⚡', xp: 120 },
    { id: 'risk-taker', name: 'Risk Taker', desc: 'Trade with high volume', icon: '🎲', xp: 120 },
    { id: 'theme-explorer', name: 'Theme Explorer', desc: 'Try all 8 themes', icon: '🎭', xp: 60 },
    { id: 'night-owl', name: 'Night Owl', desc: 'Use the app after midnight', icon: '🦉', xp: 40 },
    { id: 'voice-user', name: 'Voice User', desc: 'Use voice input', icon: '🎤', xp: 50 },
    { id: 'power-user', name: 'Power User', desc: 'Open command palette 10 times', icon: '⚡', xp: 80 },
    { id: 'trading-legend', name: 'Trading Legend', desc: 'Reach $50,000 portfolio', icon: '👑', xp: 500 }
];

// ===== MARKET DATA =====
// Mock market data for the dashboard
const MARKET_DATA = {
    indices: [
        { symbol: 'S&P 500', name: 'SPX', value: 4567.89, change: 1.2 },
        { symbol: 'NASDAQ', name: 'IXIC', value: 14234.56, change: 1.8 },
        { symbol: 'DOW', name: 'DJI', value: 35432.10, change: -0.3 },
        { symbol: 'RUSSELL', name: 'RUT', value: 1876.43, change: 0.5 }
    ],
    crypto: [
        { symbol: 'BTC', name: 'Bitcoin', value: 45234.56, change: 3.5 },
        { symbol: 'ETH', name: 'Ethereum', value: 2456.78, change: 2.1 },
        { symbol: 'SOL', name: 'Solana', value: 98.45, change: -1.2 },
        { symbol: 'ADA', name: 'Cardano', value: 0.52, change: 4.3 }
    ],
    forex: [
        { symbol: 'EUR/USD', name: 'Euro', value: 1.0876, change: 0.3 },
        { symbol: 'GBP/USD', name: 'Pound', value: 1.2654, change: -0.2 }
    ]
};

// ===== UTILITY FUNCTIONS =====
// Short helper functions for common tasks
function $(s) { return document.querySelector(s); }  // Query single element
function $$(s) { return document.querySelectorAll(s); }  // Query all elements
function formatCurrency(n) { return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n); }  // Format numbers as currency
function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }  // Prevent XSS attacks

// Show a toast notification
function showToast(title, message, type = 'info') {
    const c = $('#toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: 'check', error: 'times', warning: 'exclamation', info: 'info' };
    t.innerHTML = `<div class="toast-icon"><i class="fas fa-${icons[type]}"></i></div><div class="toast-content"><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div><button class="toast-close"><i class="fas fa-times"></i></button>`;
    c.appendChild(t);
    // Auto-remove after 5 seconds or on close click
    t.querySelector('.toast-close').onclick = () => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); };
    setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, 5000);
}

// Show achievement unlock popup
function showAchievement(id) {
    const a = ACHIEVEMENTS.find(x => x.id === id);
    if (!a || State.unlockedAchievements.includes(id)) return;  // Don't show duplicates
    State.unlockedAchievements.push(id);
    State.xp += a.xp;
    updateXPBar();
    $('#achievementName').textContent = a.name;
    $('#achievementDesc').textContent = a.desc;
    $('#achievementPopup').classList.add('show');
    showToast('Achievement Unlocked!', `${a.icon} ${a.name}`, 'success');
    setTimeout(() => $('#achievementPopup').classList.remove('show'), 5000);
    saveState();
    // Persist the unlock server-side (idempotent; server awards XP).
    if (getToken()) api('/api/achievements', { method: 'POST', body: { achievement_id: id } }).catch(() => {});
}

// Play sound effects using Web Audio API
function playSound(type) {
    if (!State.soundEnabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const freqs = { success: 880, error: 220, click: 660, message: 440 };
        const f = freqs[type] || 440;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = f;
        g.gain.setValueAtTime(0.1, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        o.start(); o.stop(ctx.currentTime + 0.1);
    } catch (e) {}
}

// Update the XP progress bar
function updateXPBar() {
    const pct = Math.min(100, (State.xp % 100));
    const f = $('#xpFill'); const t = $('#xpText');
    if (f) f.style.width = pct + '%';
    if (t) t.textContent = `${State.xp % 100}/100`;
}

// ===== LOADING SCREEN =====
// Animated loading screen shown on app start
function initLoader() {
    const bar = $('#loaderBar'); const txt = $('#loaderText');
    const msgs = ['Initializing...', 'Loading Markets...', 'Connecting AI...', 'Almost Ready...'];
    let p = 0, mi = 0;
    // Animate progress bar
    const iv = setInterval(() => {
        p += Math.random() * 15 + 5;
        if (p > 100) p = 100;
        bar.style.width = p + '%';
        if (p > (mi + 1) * 25 && mi < msgs.length - 1) { mi++; txt.textContent = msgs[mi]; }
        if (p >= 100) { clearInterval(iv); setTimeout(() => $('#loaderScreen').classList.add('hide'), 300); }
    }, 200);
}

// ===== PARTICLE BACKGROUND =====
// Creates animated particle network in the background
function initParticles() {
    const canvas = $('#particleCanvas');
    const ctx = canvas.getContext('2d');
    let ps = [];
    function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
    resize(); addEventListener('resize', resize);
    // Particle class
    class P {
        constructor() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.s = Math.random() * 2 + 1; this.vx = (Math.random() - 0.5) * 0.5; this.vy = (Math.random() - 0.5) * 0.5; this.o = Math.random() * 0.5 + 0.2; }
        update() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > canvas.width) this.vx *= -1; if (this.y < 0 || this.y > canvas.height) this.vy *= -1; }
        draw() { ctx.fillStyle = `rgba(99,102,241,${this.o})`; ctx.beginPath(); ctx.arc(this.x, this.y, this.s, 0, Math.PI * 2); ctx.fill(); }
    }
    // Create 60 particles
    for (let i = 0; i < 60; i++) ps.push(new P());
    // Animation loop
    function anim() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ps.forEach(p => { p.update(); p.draw(); });
        // Draw lines between close particles
        for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
            const d = Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y);
            if (d < 120) { ctx.strokeStyle = `rgba(99,102,241,${0.2 * (1 - d / 120)})`; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(ps[i].x, ps[i].y); ctx.lineTo(ps[j].x, ps[j].y); ctx.stroke(); }
        }
        requestAnimationFrame(anim);
    }
    anim();
}

// ===== AUTHENTICATION =====
// Toggle between login and signup forms
$('#showSignup').onclick = (e) => { e.preventDefault(); $('#authCard').style.transform = 'rotateY(180deg)'; };
$('#showLogin').onclick = (e) => { e.preventDefault(); $('#authCard').style.transform = 'rotateY(0deg)'; };

// 3D mouse follow effect on auth card
document.addEventListener('mousemove', (e) => {
    if ($('#authContainer').style.display === 'none') return;
    const x = (innerWidth / 2 - e.pageX) / 50, y = (innerHeight / 2 - e.pageY) / 50;
    if (!$('#authCard').style.transform.includes('180')) $('#authCard').style.transform = `rotateY(${x}deg) rotateX(${y}deg)`;
});

// Toggle password visibility
$$('.toggle-pw').forEach(b => b.onclick = () => {
    const t = $(`#${b.dataset.target}`);
    t.type = t.type === 'password' ? 'text' : 'password';
    b.innerHTML = `<i class="fas fa-${t.type === 'password' ? 'eye' : 'eye-slash'}"></i>`;
});

// Password strength meter
$('#signupPassword').oninput = (e) => {
    const p = e.target.value, bars = $$('.strength-bar'), txt = $('.strength-text');
    let s = 0;
    if (p.length >= 6) s++; if (p.length >= 10) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
    bars.forEach((b, i) => { b.className = 'strength-bar'; if (i < s) b.classList.add(s <= 2 ? 'weak' : s === 3 ? 'medium' : 'strong'); });
    txt.textContent = ['Too short', 'Weak', 'Medium', 'Strong', 'Very Strong'][s];
};

// Login form submission
$('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const em = $('#loginEmail').value, pw = $('#loginPassword').value;
    if (!em || !pw) return showToast('Error', 'Fill all fields', 'error');
    try {
        const { token } = await api('/api/auth/login', { method: 'POST', auth: false, body: { email: em, password: pw } });
        setToken(token);
        await loadServerState();
        showToast('Welcome!', `Logged in as ${State.currentUser.name}`, 'success');
        setTimeout(() => showApp(), 500);
    } catch (err) {
        showToast('Login failed', err.message, 'error');
    }
};

// Signup form submission
$('#signupForm').onsubmit = async (e) => {
    e.preventDefault();
    const n = $('#signupName').value, em = $('#signupEmail').value, p = $('#signupPassword').value, co = $('#signupCompany')?.value;
    const admin = $('#signupAdmin')?.checked || false;
    if (!n || !em || !p) return showToast('Error', 'Fill all fields', 'error');
    if (!$('#termsCheck').checked) return showToast('Error', 'Accept terms', 'error');
    try {
        const { token } = await api('/api/auth/register', { method: 'POST', auth: false, body: { name: n, email: em, password: p, company: co, isAdmin: admin } });
        setToken(token);
        await loadServerState();
        showToast('Welcome!', `Account created for ${n}`, 'success');
        setTimeout(() => showApp(), 500);
    } catch (err) {
        showToast('Signup failed', err.message, 'error');
    }
};

// Social login buttons — not wired to the backend yet.
$$('.social-btn').forEach(b => b.onclick = () => {
    showToast('Not available', 'Social login isn\'t connected — please use email signup.', 'warning');
});

// Forgot password link
$('#forgotLink').onclick = (e) => { e.preventDefault(); showConfirm('Reset Password', 'Reset link will be sent to your email.', () => showToast('Sent', 'Check your inbox', 'success')); };

// Switch from auth to main app
function showApp() {
    $('#authContainer').style.opacity = '0';
    setTimeout(() => {
        $('#authContainer').style.display = 'none';
        $('#appContainer').style.display = 'grid';
        $('#appContainer').style.opacity = '0';
        setTimeout(() => { $('#appContainer').style.transition = 'opacity 0.5s'; $('#appContainer').style.opacity = '1'; initApp(); }, 50);
    }, 300);
}

// Switch from app back to auth
function showAuth() { $('#appContainer').style.display = 'none'; $('#authContainer').style.display = 'flex'; $('#authContainer').style.opacity = '1'; $('#authCard').style.transform = 'rotateY(0deg)'; State.currentUser = null; }

// ===== APP INITIALIZATION =====
// Called when user logs in
function initApp() {
    if (State.currentUser) { $('#userName').textContent = State.currentUser.name; $('#userAvatarText').textContent = State.currentUser.avatar; }
    // Only admins see the Administration nav section.
    if ($('#adminNavSection')) $('#adminNavSection').style.display = State.currentUser?.isAdmin ? 'block' : 'none';
    // Apply settings loaded from the server.
    setTheme(State.currentTheme);
    document.body.classList.toggle('light-mode', !State.darkMode);
    if ($('#darkModeToggle')) $('#darkModeToggle').checked = State.darkMode;
    if ($('#soundToggle')) $('#soundToggle').checked = State.soundEnabled;
    updateXPBar(); updateBalance(); renderAchievements(); renderMarketList('indices'); renderWatchlist(); renderNews(); renderAssets();
    if (!State.unlockedAchievements.includes('first-login')) setTimeout(() => showAchievement('first-login'), 1000);
    // Update live users counter
    setInterval(() => { const n = parseInt($('#liveUsers')?.textContent?.replace(',', '') || 12847); if ($('#liveUsers')) $('#liveUsers').textContent = (n + Math.floor(Math.random() * 10 - 5)).toLocaleString(); }, 3000);
}

// Update balance displays
function updateBalance() {
    if ($('#userBalance')) $('#userBalance').textContent = '$' + formatCurrency(State.balance);
    const pnl = State.positions.reduce((s, p) => s + (p.currentValue - p.cost), 0);
    if ($('#userPnL')) { $('#userPnL').textContent = `${pnl >= 0 ? '+' : ''}$${formatCurrency(pnl)}`; $('#userPnL').className = `stat-mini-value ${pnl >= 0 ? 'profit' : ''}`; }
    if ($('#tradingBalance')) $('#tradingBalance').textContent = '$' + formatCurrency(State.balance);
}

// ===== THEME SYSTEM =====
// Apply a color theme
function setTheme(theme) {
    document.body.className = '';
    if (theme !== 'default') document.body.classList.add(`theme-${theme}`);
    State.currentTheme = theme;
    $$('.theme-opt').forEach(o => o.classList.toggle('active', o.dataset.theme === theme));
    const st = $('#settingsTheme'); if (st) st.value = theme;
    saveState();
}
$('#themeToggle').onclick = (e) => { e.stopPropagation(); $('#themePanel').classList.toggle('show'); };
$$('.theme-opt').forEach(o => o.onclick = () => { setTheme(o.dataset.theme); saveSettings({ theme: o.dataset.theme }); $('#themePanel').classList.remove('show'); showToast('Theme', o.dataset.theme, 'success'); });
document.addEventListener('click', (e) => { if (!e.target.closest('.theme-selector')) $('#themePanel').classList.remove('show'); });
$('#darkModeToggle').onchange = (e) => { State.darkMode = e.target.checked; document.body.classList.toggle('light-mode', !State.darkMode); saveState(); saveSettings({ darkMode: State.darkMode }); };
const stEl = $('#settingsTheme'); if (stEl) stEl.onchange = (e) => { setTheme(e.target.value); saveSettings({ theme: e.target.value }); };

// ===== COMMAND PALETTE =====
// Ctrl+K power user feature
let cmdUses = 0;
$('#commandBtn').onclick = openCmd;
function openCmd() { $('#commandPalette').classList.add('show'); setTimeout(() => $('#commandInput').focus(), 100); cmdUses++; if (cmdUses === 10) showAchievement('power-user'); }
function closeCmd() { $('#commandPalette').classList.remove('show'); $('#commandInput').value = ''; }
$('#commandInput').oninput = (e) => { const q = e.target.value.toLowerCase(); $$('.command-item').forEach(i => i.style.display = i.textContent.toLowerCase().includes(q) ? 'flex' : 'none'); };
$$('.command-item').forEach(i => i.onclick = () => { const a = i.dataset.action; handleCmd(a); closeCmd(); });
function handleCmd(a) {
    const map = { 'go-chat': () => switchView('chat'), 'go-dashboard': () => switchView('dashboard'), 'go-trading': () => switchView('trading'), 'go-settings': () => switchView('settings'), 'new-chat': () => { clearChat(); }, 'toggle-theme': () => { State.darkMode = !State.darkMode; document.body.classList.toggle('light-mode', !State.darkMode); $('#darkModeToggle').checked = State.darkMode; }, 'export-chat': exportChat, 'clear-chat': clearChat };
    if (map[a]) map[a]();
}

// ===== VIEW SWITCHING =====
function switchView(v) {
    State.currentView = v;
    $$('.view').forEach(x => x.classList.remove('active'));
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    $(`#view${v.charAt(0).toUpperCase() + v.slice(1)}`).classList.add('active');
    $$(`.nav-item[data-view="${v}"]`).forEach(n => n.classList.add('active'));
    if (v === 'dashboard') renderDashboard();
    if (v === 'trading') renderTrading();
    if (v === 'portfolio') renderPortfolio();
    if (v === 'achievements') renderAchievements();
    if (v === 'admin') renderAdmin();
    if (State.soundEnabled) playSound('click');
}
$$('.nav-item[data-view]').forEach(i => i.onclick = () => switchView(i.dataset.view));
$('#mobileMenu').onclick = () => $('#appSidebar').classList.toggle('open');
$('#sidebarCollapse').onclick = () => $('#appContainer').classList.toggle('collapsed');
$('#logoutBtn').onclick = () => showConfirm('Logout', 'Are you sure?', () => { clearToken(); State.currentConversationId = null; showToast('Logged out', 'See you!', 'info'); setTimeout(showAuth, 500); });

// ===== NOTIFICATIONS =====
$('#notifBtn').onclick = (e) => { e.stopPropagation(); $('#notifPanel').classList.toggle('show'); };
document.addEventListener('click', (e) => { if (!e.target.closest('#notifBtn') && !e.target.closest('#notifPanel')) $('#notifPanel').classList.remove('show'); });
$$('.notif-item').forEach(i => i.onclick = () => { i.classList.remove('unread'); });

// ===== CHAT FUNCTIONALITY =====
const chatMessages = $('#chatMessages');
const chatInput = $('#chatInput');
let msgCount = 0;

// Add a new message to the chat
function addMessage(text, sender = 'bot', isHTML = false) {
    const d = document.createElement('div');
    d.className = `message ${sender}-message`;
    const t = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (sender === 'user') {
        d.innerHTML = `<div class="message-content"><div class="message-bubble"><p>${isHTML ? text : escapeHtml(text)}</p></div><div class="message-meta"><span class="message-time">${t}</span></div></div><div class="message-avatar user-avatar"><span>${State.currentUser?.avatar || 'JD'}</span></div>`;
    } else {
        d.innerHTML = `<div class="message-avatar"><div class="mini-bot"><div class="mini-eye"></div><div class="mini-eye"></div></div></div><div class="message-content"><div class="message-bubble">${isHTML ? text : `<p>${escapeHtml(text)}</p>`}</div><div class="message-meta"><span class="message-time">${t}</span><span class="message-reactions"><button class="react-btn">👍</button><button class="react-btn">❤️</button><button class="react-btn">🎯</button></span></div></div>`;
    }
    chatMessages.appendChild(d);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    // Track user messages for achievements
    if (sender === 'user') { msgCount++; if (msgCount === 1) setTimeout(() => showAchievement('curious-mind'), 1500); if (msgCount === 10) setTimeout(() => showAchievement('chat-master'), 1500); }
    return d;
}

// Show typing indicator while bot is "thinking"
function showTyping() {
    const d = document.createElement('div');
    d.className = 'message bot-message'; d.id = 'typingIndicator';
    d.innerHTML = `<div class="message-avatar"><div class="mini-bot"><div class="mini-eye"></div><div class="mini-eye"></div></div></div><div class="message-content"><div class="message-bubble"><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div></div></div>`;
    chatMessages.appendChild(d);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
function removeTyping() { const t = $('#typingIndicator'); if (t) t.remove(); }

// Convert Claude's plain-text newlines into HTML for the chat bubble.
function chatTextToHtml(text) {
    return `<p>${text.replace(/\n\n/g, '<br><br>').replace(/\n/g, ' ')}</p>`;
}

// Send a message — streams the reply from the backend (Claude) over SSE.
async function sendMessage() {
    const m = chatInput.value.trim();
    if (!m) return;
    addMessage(m, 'user');
    chatInput.value = '';
    $('#inputSuggestions').classList.remove('show');
    showTyping();

    const portfolio = { balance: State.balance, positions: State.positions };
    try {
        const res = await fetch(API_BASE + '/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify({ message: m, conversation_id: State.currentConversationId, portfolio }),
        });
        if (!res.ok || !res.body) throw new Error(`Chat failed (${res.status})`);

        removeTyping();
        const bubble = addMessage('', 'bot', true).querySelector('.message-bubble');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '', full = '';

        // Parse the Server-Sent Events stream line by line.
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop();  // keep the trailing partial event
            for (const part of parts) {
                const line = part.replace(/^data: ?/, '').trim();
                if (!line || line === '[DONE]') continue;
                let payload; try { payload = JSON.parse(line); } catch (e) { continue; }
                if (payload.conversation_id) State.currentConversationId = payload.conversation_id;
                if (payload.error) throw new Error(payload.error);
                if (payload.token) { full += payload.token; bubble.innerHTML = chatTextToHtml(full); chatMessages.scrollTop = chatMessages.scrollHeight; }
            }
        }
        if (!full) bubble.innerHTML = chatTextToHtml('…');
    } catch (err) {
        removeTyping();
        addMessage(`<p>⚠️ ${escapeHtml(err.message)}</p>`, 'bot', true);
    }
}
$('#sendBtn').onclick = sendMessage;
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

// Input suggestions as user types
chatInput.oninput = (e) => {
    const v = e.target.value, s = $('#inputSuggestions');
    if (v.length < 2) { s.classList.remove('show'); return; }
    const list = [{ icon: 'chart-line', text: 'Show me market analysis' }, { icon: 'wallet', text: 'Analyze my portfolio' }, { icon: 'bitcoin', text: 'Bitcoin price prediction' }].filter(x => x.text.toLowerCase().includes(v.toLowerCase()));
    if (list.length) { s.innerHTML = list.map(x => `<div class="suggestion-item"><i class="fas fa-${x.icon}"></i>${x.text}</div>`).join(''); s.classList.add('show'); s.querySelectorAll('.suggestion-item').forEach(i => i.onclick = () => { chatInput.value = i.textContent; s.classList.remove('show'); }); } else s.classList.remove('show');
};

// Emoji picker
$('#emojiBtn').onclick = (e) => { e.stopPropagation(); $('#emojiPicker').classList.toggle('show'); };
$$('.emoji-grid button').forEach(b => b.onclick = () => { chatInput.value += b.textContent; chatInput.focus(); });
document.addEventListener('click', (e) => { if (!e.target.closest('#emojiBtn') && !e.target.closest('#emojiPicker')) $('#emojiPicker').classList.remove('show'); });

// File attachments
$('#attachBtn').onclick = () => $('#fileInput').click();
$('#fileInput').onchange = (e) => {
    Array.from(e.target.files).forEach(f => {
        if (f.type.startsWith('image/')) { const r = new FileReader(); r.onload = (ev) => { State.attachments.push({ name: f.name, data: ev.target.result }); renderAttachments(); }; r.readAsDataURL(f); }
    });
};
function renderAttachments() { $('#chatAttachments').innerHTML = State.attachments.map((a, i) => `<div class="attachment-preview">${a.data ? `<img src="${a.data}">` : '<i class="fas fa-file"></i>'}<span>${a.name}</span><button class="remove-attachment" onclick="State.attachments.splice(${i},1);renderAttachments()"><i class="fas fa-times"></i></button></div>`).join(''); }

// Quick action buttons
$$('.quick-btn').forEach(b => b.onclick = () => { chatInput.value = b.dataset.prompt; sendMessage(); });

// Voice input using Speech Recognition API
$('#voiceInputBtn').onclick = () => {
    $('#voiceModal').classList.add('show');
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const r = new SR();
        r.continuous = false; r.interimResults = true; r.lang = 'en-US';
        r.onresult = (e) => $('#voiceTranscript').textContent = Array.from(e.results).map(x => x[0].transcript).join('');
        r.onend = () => { const t = $('#voiceTranscript').textContent; if (t !== 'Speak now' && t !== 'Listening...') chatInput.value = t; };
        try { r.start(); } catch (e) {}
        window.sr = r;
    } else $('#voiceTranscript').textContent = 'Not supported';
};
$('#voiceCancel').onclick = () => { if (window.sr) window.sr.stop(); $('#voiceModal').classList.remove('show'); $('#voiceTranscript').textContent = 'Speak now'; };
$('#voiceSend').onclick = () => { if (window.sr) window.sr.stop(); const t = $('#voiceTranscript').textContent; if (t && t !== 'Speak now' && t !== 'Listening...') { chatInput.value = t; sendMessage(); } $('#voiceModal').classList.remove('show'); showAchievement('voice-user'); };

// Chat actions
$('#clearChatBtn').onclick = () => showConfirm('Clear Chat', 'Delete all messages?', clearChat);
$('#exportChatBtn').onclick = exportChat;

function clearChat() {
    chatMessages.innerHTML = '';
    // Delete the server-side conversation, if one exists, and start fresh.
    if (State.currentConversationId && getToken()) {
        api(`/api/conversations/${State.currentConversationId}`, { method: 'DELETE' }).catch(() => {});
    }
    State.currentConversationId = null;
    showToast('Cleared', 'All messages deleted', 'success');
}
function exportChat() {
    const msgs = $$('.message').map(m => { const s = m.classList.contains('user-message') ? 'You' : 'TradeBot'; const t = m.querySelector('.message-bubble').textContent.trim(); const tm = m.querySelector('.message-time')?.textContent || ''; return `[${tm}] ${s}: ${t}`; }).join('\n\n');
    const b = new Blob([`MoneyTrade AI Chat\n${'='.repeat(40)}\n\n${msgs}`], { type: 'text/plain' });
    const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `chat-${Date.now()}.txt`; a.click();
    showToast('Exported', 'Chat downloaded', 'success');
}

// Chat history items
$$('.history-item').forEach(i => i.onclick = (e) => { if (e.target.closest('.delete-chat')) return; $$('.history-item').forEach(x => x.classList.remove('active')); i.classList.add('active'); });
$$('.delete-chat').forEach(b => b.onclick = (e) => { e.stopPropagation(); showConfirm('Delete', 'Delete this chat?', () => b.closest('.history-item').remove()); });

// Generate bot responses based on keywords
function getBotResponse(m) {
    m = m.toLowerCase();
    if (m.match(/\b(hi|hello|hey)\b/)) return `<p>Hello! 👋 Ready to explore the markets?</p>`;
    if (m.includes('market')) return `<p>📈 <strong>Market Snapshot:</strong> Tech leading, mixed signals overall.</p>`;
    if (m.includes('crypto') || m.includes('bitcoin')) return `<p>₿ <strong>Crypto Update:</strong> BTC at $45,234 <span style="color:#10b981">+3.5%</span>. Bullish sentiment!</p>`;
    if (m.includes('portfolio')) return `<p>💼 <strong>Portfolio:</strong> Balance: $${formatCurrency(State.balance)} • Positions: ${State.positions.length}</p>`;
    if (m.includes('risk')) return `<p>🛡️ <strong>Risk:</strong> Your profile is moderate. Diversify and use stop-losses!</p>`;
    if (m.includes('strategy')) return `<p>🎯 <strong>Strategies:</strong> DCA, stop-loss, sector rotation. Try them in the Trading Sim!</p>`;
    if (m.includes('news')) return `<p>📰 <strong>News:</strong> Fed signals rate cuts • Tech beats earnings • AI sector ATH</p>`;
    if (m.includes('predict')) return `<p>🔮 <strong>Prediction:</strong> Bullish momentum in tech for Q1. <em>Not financial advice.</em></p>`;
    return `<p>I understand! Try asking about: <strong>market</strong>, <strong>crypto</strong>, <strong>portfolio</strong>, <strong>risk</strong>, <strong>strategy</strong>, or <strong>news</strong>.</p>`;
}

// ===== DASHBOARD =====
function renderDashboard() { renderBalanceChart(); renderWatchlist(); renderMarketList('indices'); renderNews(); }

// ===== ADMIN DASHBOARD =====
// Fetch platform stats + all users and paint the admin view.
async function renderAdmin() {
    if (!State.currentUser?.isAdmin) return;
    const body = $('#adminUsersBody');
    try {
        const [stats, { users }] = await Promise.all([
            api('/api/admin/stats'),
            api('/api/admin/users'),
        ]);

        // Stat cards
        $('#statUsers').textContent = stats.totalUsers.toLocaleString();
        $('#statUsersSub').textContent = `+${stats.newUsersToday} today`;
        $('#statBalance').textContent = '$' + formatCurrency(stats.totalBalance);
        $('#statAdmins').textContent = `${stats.totalAdmins} admin${stats.totalAdmins === 1 ? '' : 's'}`;
        $('#statTrades').textContent = stats.totalTrades.toLocaleString();
        $('#statPositions').textContent = `${stats.totalPositions.toLocaleString()} open positions`;
        $('#statMessages').textContent = stats.totalMessages.toLocaleString();
        $('#statConversations').textContent = `${stats.totalConversations.toLocaleString()} conversations`;

        // Users table
        $('#adminUsersCount').textContent = `${users.length} account${users.length === 1 ? '' : 's'}`;
        if (!users.length) {
            body.innerHTML = `<tr><td colspan="7" class="admin-empty">No users yet</td></tr>`;
            return;
        }
        const meId = State.currentUser.id;
        body.innerHTML = users.map(u => {
            const self = u.id === meId;
            const roleBadge = u.isAdmin
                ? `<span class="admin-badge is-admin"><i class="fas fa-shield-halved"></i> Admin</span>`
                : `<span class="admin-badge">User</span>`;
            return `<tr>
                <td>
                    <div class="admin-user-cell">
                        <div class="admin-avatar">${escapeHtml(u.avatar || '?')}</div>
                        <div>
                            <div class="admin-user-name">${escapeHtml(u.name)}${self ? ' <span class="admin-you">(you)</span>' : ''}</div>
                            <div class="admin-user-company">${escapeHtml(u.company || '—')}</div>
                        </div>
                    </div>
                </td>
                <td class="admin-email">${escapeHtml(u.email)}</td>
                <td class="num">$${formatCurrency(u.balance)}</td>
                <td class="num">${u.xp.toLocaleString()}</td>
                <td class="num">${u.tradesCount}</td>
                <td>${roleBadge}</td>
                <td class="admin-actions-col">
                    <button class="admin-action-btn" title="Edit balance" onclick="adminEditBalance(${u.id}, ${u.balance})"><i class="fas fa-pen"></i></button>
                    <button class="admin-action-btn" title="${u.isAdmin ? 'Revoke admin' : 'Make admin'}" ${self ? 'disabled' : ''} onclick="adminToggleAdmin(${u.id}, ${!u.isAdmin})"><i class="fas fa-shield-halved"></i></button>
                    <button class="admin-action-btn danger" title="Delete user" ${self ? 'disabled' : ''} onclick="adminDeleteUser(${u.id}, '${escapeHtml(u.name).replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    } catch (err) {
        body.innerHTML = `<tr><td colspan="7" class="admin-empty">${escapeHtml(err.message)}</td></tr>`;
        showToast('Admin', err.message, 'error');
    }
}

async function adminEditBalance(id, current) {
    const input = prompt('Set new balance (USD):', current);
    if (input === null) return;
    const balance = parseFloat(input);
    if (isNaN(balance) || balance < 0) { showToast('Invalid', 'Enter a non-negative number', 'error'); return; }
    try {
        await api('/api/admin/users/' + id, { method: 'PATCH', body: { balance } });
        showToast('Updated', 'Balance saved', 'success');
        renderAdmin();
    } catch (err) { showToast('Failed', err.message, 'error'); }
}

async function adminToggleAdmin(id, next) {
    try {
        await api('/api/admin/users/' + id, { method: 'PATCH', body: { isAdmin: next } });
        showToast('Updated', next ? 'User promoted to admin' : 'Admin rights revoked', 'success');
        renderAdmin();
    } catch (err) { showToast('Failed', err.message, 'error'); }
}

function adminDeleteUser(id, name) {
    showConfirm('Delete user', `Permanently delete ${name} and all their data?`, async () => {
        try {
            await api('/api/admin/users/' + id, { method: 'DELETE' });
            showToast('Deleted', `${name} removed`, 'success');
            renderAdmin();
        } catch (err) { showToast('Failed', err.message, 'error'); }
    });
}
$('#adminRefreshBtn').onclick = () => renderAdmin();

// Draw balance chart
function renderBalanceChart() {
    const c = $('#balanceChart'); if (!c) return;
    const ctx = c.getContext('2d'); c.width = c.offsetWidth; c.height = 80;
    const d = [40, 50, 45, 60, 55, 70, 65, 75, 80, 85], mx = Math.max(...d), sx = c.width / (d.length - 1);
    ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.beginPath();
    d.forEach((v, i) => { const x = i * sx, y = c.height - (v / mx * c.height * 0.8) - 10; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.stroke();
    const g = ctx.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.lineTo(c.width, c.height); ctx.lineTo(0, c.height); ctx.fill();
}

// Display metadata for known symbols (price/change are indicative only).
const WATCH_META = {
    AAPL: { v: 189.84, c: 2.4, col: '#6366f1' },
    TSLA: { v: 248.42, c: -1.2, col: '#ef4444' },
    NVDA: { v: 495.22, c: 5.7, col: '#10b981' },
    MSFT: { v: 378.91, c: 1.8, col: '#06b6d4' },
};
const WATCH_COLORS = ['#6366f1', '#ef4444', '#10b981', '#06b6d4', '#f59e0b', '#8b5cf6'];

// Render watchlist from State.watchlist (loaded from the server).
function renderWatchlist() {
    const l = $('#watchlist'); if (!l) return;
    const items = (State.watchlist && State.watchlist.length)
        ? State.watchlist
        : [{ symbol: 'AAPL', name: 'Apple' }, { symbol: 'TSLA', name: 'Tesla' }, { symbol: 'NVDA', name: 'Nvidia' }, { symbol: 'MSFT', name: 'Microsoft' }];
    l.innerHTML = items.map((it, idx) => {
        const meta = WATCH_META[it.symbol] || { v: 0, c: 0, col: WATCH_COLORS[idx % WATCH_COLORS.length] };
        const name = it.name || it.symbol;
        return `<div class="watchlist-item"><div class="watchlist-icon" style="background:${meta.col}">${it.symbol.substring(0,2)}</div><div class="watchlist-info"><span class="watchlist-name">${name}</span><span class="watchlist-symbol">${it.symbol}</span></div><div class="watchlist-price"><div class="watchlist-value">$${meta.v.toFixed(2)}</div><div class="watchlist-change ${meta.c >= 0 ? 'up' : 'down'}">${meta.c >= 0 ? '↑' : '↓'} ${Math.abs(meta.c)}%</div></div></div>`;
    }).join('');
}

// Render market list (indices, crypto, forex)
function renderMarketList(type) {
    const l = $('#marketList'); if (!l) return;
    const d = MARKET_DATA[type] || MARKET_DATA.indices;
    l.innerHTML = d.map(i => `<div class="market-item"><div class="market-left"><div><div class="market-symbol">${i.symbol}</div><div class="market-name">${i.name}</div></div></div><div class="market-right"><div class="watchlist-value">${i.value.toFixed(2)}</div><div class="watchlist-change ${i.change >= 0 ? 'up' : 'down'}">${i.change >= 0 ? '+' : ''}${i.change.toFixed(2)}%</div></div></div>`).join('');
}
$$('.tab-switcher .tab').forEach(t => t.onclick = () => { $$('.tab-switcher .tab').forEach(x => x.classList.remove('active')); t.classList.add('active'); renderMarketList(t.dataset.tab); });

// Render news feed
function renderNews() {
    const l = $('#newsList'); if (!l) return;
    const n = [{ t: 'Fed Signals Rate Cuts in Q2', s: 'Reuters', tm: '5m' }, { t: 'Tech Giants Beat Earnings', s: 'Bloomberg', tm: '20m' }, { t: 'AI Sector Reaches ATH', s: 'CNBC', tm: '1h' }];
    l.innerHTML = n.map(i => `<div class="news-item"><div class="news-title">${i.t}</div><div class="news-meta"><span class="news-source">${i.s}</span><span>•</span><span>${i.tm} ago</span></div></div>`).join('');
}

// ===== TRADING SIMULATOR =====
function renderTrading() { renderAssets(); renderPositions(); renderTradeHistory(); }

// Render available assets to trade
function renderAssets() {
    const l = $('#assetList'); if (!l) return;
    const a = [{ s: 'AAPL', n: 'Apple', p: 189.84, c: 2.4, col: '#6366f1' }, { s: 'TSLA', n: 'Tesla', p: 248.42, c: -1.2, col: '#ef4444' }, { s: 'BTC', n: 'Bitcoin', p: 45234, c: 3.5, col: '#f59e0b' }, { s: 'ETH', n: 'Ethereum', p: 2456, c: 2.1, col: '#8b5cf6' }, { s: 'NVDA', n: 'Nvidia', p: 495.22, c: 5.7, col: '#10b981' }, { s: 'MSFT', n: 'Microsoft', p: 378.91, c: 1.8, col: '#06b6d4' }];
    l.innerHTML = a.map(i => `<div class="asset-item" onclick="selectAsset('${i.s}', ${i.p})"><div class="watchlist-icon" style="background:${i.col}">${i.s.substring(0,2)}</div><div class="watchlist-info"><span class="watchlist-name">${i.n}</span><span class="watchlist-symbol">${i.s}</span></div><div class="watchlist-price"><div class="watchlist-value">$${i.p.toFixed(2)}</div><div class="watchlist-change ${i.c >= 0 ? 'up' : 'down'}">${i.c >= 0 ? '+' : ''}${i.c.toFixed(2)}%</div></div></div>`).join('');
}

let sel = null;  // Currently selected asset
window.selectAsset = (s, p) => { sel = { s, p }; $$('.asset-item').forEach(i => i.classList.remove('selected')); event.currentTarget.classList.add('selected'); $('#tradeAssetInfo').innerHTML = `<strong style="font-size:18px">${s}</strong><br><span style="font-size:24px;font-weight:800;font-family:'JetBrains Mono',monospace">$${p.toFixed(2)}</span>`; $('#tradePrice').value = p.toFixed(2); };

// Place a buy or sell order (executed server-side; State is updated from the response)
async function placeOrder(type) {
    if (!sel) return showToast('Select Asset', 'Pick an asset first', 'warning');
    const q = parseFloat($('#tradeQuantity').value), p = parseFloat($('#tradePrice').value) || sel.p;
    if (!q || q <= 0) return showToast('Invalid', 'Enter quantity', 'error');
    const cost = q * p;
    if (type === 'buy' && cost > State.balance) return showToast('No Funds', `Need $${formatCurrency(cost)}`, 'error');

    try {
        const portfolio = await api('/api/trades', { method: 'POST', body: { symbol: sel.s, type, quantity: q, price: p } });
        // Server is the source of truth — sync State from its response.
        State.balance = portfolio.balance;
        State.xp = portfolio.xp;
        State.positions = portfolio.positions;
        State.tradeHistory = portfolio.tradeHistory;
    } catch (err) {
        return showToast('Order failed', err.message, 'error');
    }

    $('#tradeQuantity').value = ''; updateBalance(); updateXPBar(); renderPositions(); renderTradeHistory();
    showToast('Order Placed', `${type.toUpperCase()} ${q} ${sel.s} for $${formatCurrency(cost)}`, 'success');
    if (type === 'buy') checkTradeAchievements(cost);
    saveState();
}

// Check and award trade-related achievements
function checkTradeAchievements(cost) {
    const sessionTrades = State.tradeHistory.filter(t => t.type === 'buy').length;

    // First Trade - fires once, on the user's very first trade. The popup
    // slides in (showAchievement adds .show) and auto-dismisses after 5s.
    if (sessionTrades === 1) {
        setTimeout(() => showAchievement('first-trade'), 300);
    }

    // Whale Trader - single trade worth $5,000+
    if (cost >= 5000) {
        setTimeout(() => showAchievement('whale-trader'), 500);
    }
    
    // Quick Trader - 5 trades in one session
    if (sessionTrades === 5) {
        setTimeout(() => showAchievement('quick-trader'), 1000);
    }
    
    // Diversified - trade 3 different assets
    const uniqueSymbols = [...new Set(State.positions.map(p => p.symbol))];
    if (uniqueSymbols.length >= 3) {
        setTimeout(() => showAchievement('diversified'), 1500);
    }
    
    // Portfolio Builder - hold 5 different assets
    if (State.positions.length >= 5) {
        setTimeout(() => showAchievement('portfolio-builder'), 2000);
    }
}

$('#buyBtn').onclick = () => placeOrder('buy');
$('#sellBtn').onclick = () => placeOrder('sell');

// Render open positions
function renderPositions() {
    const l = $('#positionsList'); if (!l) return;
    if (!State.positions.length) { l.innerHTML = '<div class="empty-state">No open positions</div>'; return; }
    l.innerHTML = State.positions.map(p => `<div class="position-item"><div class="position-left"><span class="position-symbol">${p.symbol}</span><span class="position-type buy">BUY ${p.quantity}</span></div><div class="watchlist-value">$${formatCurrency(p.cost)}</div></div>`).join('');
}

// Render trade history
function renderTradeHistory() {
    const l = $('#tradeHistory'); if (!l) return;
    if (!State.tradeHistory.length) { l.innerHTML = '<div class="empty-state">No trades yet</div>'; return; }
    l.innerHTML = State.tradeHistory.slice(0, 10).map(t => `<div class="trade-item"><div class="trade-left"><span class="trade-symbol">${t.symbol}</span><span class="trade-type ${t.type}">${t.type.toUpperCase()} ${t.quantity} @ $${t.price.toFixed(2)}</span></div><div style="text-align:right"><div class="watchlist-value">$${formatCurrency(t.cost)}</div><div style="font-size:11px;color:var(--gray)">${t.time}</div></div></div>`).join('');
}

// ===== PORTFOLIO VIEW =====
function renderPortfolio() {
    const total = State.balance + State.positions.reduce((s, p) => s + p.cost, 0);
    if ($('#portTotal')) $('#portTotal').textContent = '$' + formatCurrency(total);
    const pnl = State.positions.reduce((s, p) => s + (p.currentValue - p.cost), 0);
    const pe = $('#portPnL'); if (pe) { pe.textContent = `${pnl >= 0 ? '+' : ''}$${formatCurrency(pnl)}`; pe.className = pnl >= 0 ? 'profit' : ''; }
    const best = State.positions.length ? State.positions.reduce((a, b) => a.cost > b.cost ? a : b) : null;
    if ($('#portBest')) $('#portBest').textContent = best ? best.symbol : '-';
    const hl = $('#holdingsList'); if (!hl) return;
    if (!State.positions.length) { hl.innerHTML = '<div class="empty-state" style="grid-column:1/-1">No holdings yet. Visit Trading Sim!</div>'; return; }
    hl.innerHTML = State.positions.map(p => `<div class="holding-card"><div class="holding-header"><span class="holding-symbol">${p.symbol}</span><span class="holding-amount">${p.quantity} units</span></div><div class="holding-value">$${formatCurrency(p.cost)}</div><div class="holding-pnl profit">+$${formatCurrency(p.currentValue - p.cost)}</div></div>`).join('');
    
    // Check for trading legend achievement
    if (total >= 50000) showAchievement('trading-legend');
}

// ===== ACHIEVEMENTS VIEW =====
function renderAchievements() {
    const g = $('#achievementsGrid'); if (!g) return;
    g.innerHTML = ACHIEVEMENTS.map(a => { 
        const u = State.unlockedAchievements.includes(a.id); 
        return `<div class="achievement-card ${u ? 'unlocked' : 'locked'}"><div class="ach-icon">${a.icon}</div><h4>${a.name}</h4><p>${a.desc}</p>${u ? `<span class="reward">+${a.xp} XP</span>` : ''}</div>`; 
    }).join('');
    const ac = $('#achieveCount'); if (ac) ac.textContent = State.unlockedAchievements.length;
}

// ===== SETTINGS =====
const sndEl = $('#soundToggle'); if (sndEl) sndEl.onchange = (e) => { State.soundEnabled = e.target.checked; saveState(); saveSettings({ soundEnabled: State.soundEnabled }); };
$('#exportDataBtn').onclick = () => { const b = new Blob([JSON.stringify(State, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `moneytrade-${Date.now()}.json`; a.click(); showToast('Exported', 'Data downloaded', 'success'); };
$('#resetDataBtn').onclick = () => showConfirm('Reset', 'Clear all data?', () => { localStorage.clear(); showToast('Reset', 'Reloading...', 'success'); setTimeout(() => location.reload(), 1000); });

// ===== CONFIRM MODAL =====
function showConfirm(title, msg, ok) { $('#confirmTitle').textContent = title; $('#confirmMessage').textContent = msg; $('#confirmModal').classList.add('show'); $('#confirmOk').onclick = () => { ok(); $('#confirmModal').classList.remove('show'); }; }
$('#confirmCancel').onclick = () => $('#confirmModal').classList.remove('show');

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    // Ctrl+K - Open command palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openCmd(); }
    // Esc - Close all modals
    if (e.key === 'Escape') { closeCmd(); $('#voiceModal').classList.remove('show'); $('#confirmModal').classList.remove('show'); $('#notifPanel').classList.remove('show'); $('#themePanel').classList.remove('show'); }
    // Ctrl+Shift+T - Toggle dark/light mode
    if (e.ctrlKey && e.shiftKey && e.key === 'T') { e.preventDefault(); State.darkMode = !State.darkMode; document.body.classList.toggle('light-mode', !State.darkMode); $('#darkModeToggle').checked = State.darkMode; }
    // Ctrl+E - Export chat
    if (e.ctrlKey && e.key === 'e' && State.currentView === 'chat') { e.preventDefault(); exportChat(); }
    // / - Focus search
    if (e.key === '/' && !e.target.matches('input, textarea')) { e.preventDefault(); $('#globalSearch').focus(); }
});

// Global search functionality
$('#globalSearch').onkeypress = (e) => { if (e.key === 'Enter' && e.target.value) { chatInput.value = e.target.value; switchView('chat'); sendMessage(); e.target.value = ''; } };

// ===== LOCAL STORAGE PERSISTENCE =====
// Save app state to browser storage
function saveState() { 
    try { 
        localStorage.setItem('moneytrade_state', JSON.stringify({
            theme: State.currentTheme, 
            darkMode: State.darkMode, 
            soundEnabled: State.soundEnabled, 
            balance: State.balance, 
            xp: State.xp, 
            achievements: State.unlockedAchievements, 
            positions: State.positions, 
            tradeHistory: State.tradeHistory
        })); 
    } catch (e) {} 
}

// Load saved state on app start
function loadState() { 
    try { 
        const s = JSON.parse(localStorage.getItem('moneytrade_state') || '{}'); 
        if (s.theme) State.currentTheme = s.theme; 
        if (typeof s.darkMode === 'boolean') State.darkMode = s.darkMode; 
        if (typeof s.soundEnabled === 'boolean') State.soundEnabled = s.soundEnabled; 
        if (s.balance) State.balance = s.balance; 
        if (s.xp) State.xp = s.xp; 
        if (s.achievements) State.unlockedAchievements = s.achievements; 
        if (s.positions) State.positions = s.positions; 
        if (s.tradeHistory) State.tradeHistory = s.tradeHistory; 
        setTheme(State.currentTheme); 
        document.body.classList.toggle('light-mode', !State.darkMode); 
        if ($('#darkModeToggle')) $('#darkModeToggle').checked = State.darkMode; 
        if ($('#soundToggle')) $('#soundToggle').checked = State.soundEnabled; 
    } catch (e) {} 
}

// Auto-save every 30 seconds
setInterval(saveState, 30000);

// ===== INITIALIZATION =====
// Run when page loads
window.addEventListener('load', () => {
    loadState();
    initParticles();
    initLoader();
    // If we have a saved token, try to restore the session and skip the auth screen.
    if (getToken()) {
        loadServerState()
            .then(() => setTimeout(() => showApp(), 1800))  // wait for the loader animation
            .catch(() => { clearToken(); });  // expired/invalid token → stay on auth
    }
    // Check for night owl achievement (after midnight)
    const hr = new Date().getHours();
    if (hr >= 0 && hr < 5) setTimeout(() => showAchievement('night-owl'), 5000);
    setTimeout(() => $('#chatInput').focus(), 3000);
});

// Close mobile sidebar on outside click
document.addEventListener('click', (e) => { 
    if (innerWidth <= 968 && !e.target.closest('.app-sidebar') && !e.target.closest('.mobile-menu')) 
        $('#appSidebar').classList.remove('open'); 
});
