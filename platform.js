(function () {
  const API_BASE = '';
  const TOKEN_KEY = 'gagagaAuthToken';
  const USER_KEY = 'gagagaUser';

  const els = {
    accountName: document.getElementById('account-name'),
    authOpen: document.getElementById('auth-open-btn'),
    leaderboardOpen: document.getElementById('leaderboard-open-btn'),
    logout: document.getElementById('logout-btn'),
    authModal: document.getElementById('auth-modal'),
    leaderboardModal: document.getElementById('leaderboard-modal'),
    authMessage: document.getElementById('auth-message'),
    leaderboardMessage: document.getElementById('leaderboard-message'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    leaderboardGame: document.getElementById('leaderboard-game'),
    leaderboardBody: document.getElementById('leaderboard-body'),
    leaderboardRefresh: document.getElementById('leaderboard-refresh-btn'),
  };

  let leaderboardConfig = {};

  if (!els.accountName || !els.authOpen || !els.leaderboardOpen) {
    return;
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function setAuth(user, token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    renderAccount();
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    renderAccount();
  }

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(API_BASE + path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  }

  function renderAccount() {
    const user = getUser();
    if (user) {
      els.accountName.textContent = user.username;
      els.authOpen.hidden = true;
      els.logout.hidden = false;
    } else {
      els.accountName.textContent = 'Guest';
      els.authOpen.hidden = false;
      els.logout.hidden = true;
    }
  }

  function openModal(modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }

  function setMessage(el, text, isError = false) {
    el.textContent = text;
    el.style.color = isError ? '#e33a25' : '#1f6f35';
  }

  async function handleAuthSubmit(event, mode) {
    event.preventDefault();
    const form = event.currentTarget;
    const username = form.elements.username.value.trim();
    const password = form.elements.password.value;
    try {
      const result = await api(`/api/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setAuth(result.user, result.token);
      setMessage(els.authMessage, mode === 'login' ? 'Logged in.' : 'Account created.');
      form.reset();
      closeModal(els.authModal);
    } catch (err) {
      setMessage(els.authMessage, err.message, true);
    }
  }

  function formatScore(row, strategy) {
    if (strategy === 'matchRecord') return `${row.wins || 0}W`;
    if ('score' in row && Number(row.score) > 0) return Number(row.score).toLocaleString();
    if ('moves' in row && Number(row.moves) > 0) return `${row.moves} moves`;
    return '-';
  }

  function formatExtra(row, strategy) {
    if (strategy === 'matchRecord') {
      const rate = Math.round((row.winRate || 0) * 100);
      return `${row.gamesPlayed || 0} games / ${rate}%`;
    }
    const parts = [];
    if (row.level) parts.push(`Lv ${row.level}`);
    if (row.lines) parts.push(`${row.lines} lines`);
    if (row.elapsedMs) parts.push(`${Math.round(row.elapsedMs / 1000)}s`);
    return parts.join(' / ') || '-';
  }

  async function loadLeaderboard() {
    const gameId = els.leaderboardGame.value || Object.keys(leaderboardConfig)[0];
    if (!gameId) return;

    try {
      const result = await api(`/api/leaderboards/${encodeURIComponent(gameId)}?limit=10`);
      const strategy = result.game.strategy;
      if (!result.rows.length) {
        els.leaderboardBody.innerHTML = '<tr><td colspan="4">No records yet</td></tr>';
      } else {
        els.leaderboardBody.innerHTML = result.rows.map((row, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(row.username || 'Player')}</td>
            <td>${escapeHtml(formatScore(row, strategy))}</td>
            <td>${escapeHtml(formatExtra(row, strategy))}</td>
          </tr>
        `).join('');
      }
      setMessage(els.leaderboardMessage, 'Leaderboard loaded.');
    } catch (err) {
      setMessage(els.leaderboardMessage, err.message, true);
    }
  }

  async function loadLeaderboardConfig() {
    const result = await api('/api/leaderboards/config');
    leaderboardConfig = result.games || {};
    els.leaderboardGame.innerHTML = Object.entries(leaderboardConfig)
      .map(([id, config]) => `<option value="${escapeHtml(id)}">${escapeHtml(config.label)}</option>`)
      .join('');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function refreshSession() {
    if (!getToken()) return renderAccount();
    try {
      const result = await api('/api/me');
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    } catch {
      clearAuth();
    }
    renderAccount();
  }

  els.authOpen.addEventListener('click', () => openModal(els.authModal));
  els.leaderboardOpen.addEventListener('click', async () => {
    openModal(els.leaderboardModal);
    if (!Object.keys(leaderboardConfig).length) await loadLeaderboardConfig();
    await loadLeaderboard();
  });
  els.logout.addEventListener('click', async () => {
    try {
      await api('/api/logout', { method: 'POST' });
    } catch {
      // Local logout still clears stale sessions.
    }
    clearAuth();
  });
  if (els.loginForm) els.loginForm.addEventListener('submit', (event) => handleAuthSubmit(event, 'login'));
  if (els.registerForm) els.registerForm.addEventListener('submit', (event) => handleAuthSubmit(event, 'register'));
  if (els.leaderboardRefresh) els.leaderboardRefresh.addEventListener('click', loadLeaderboard);
  if (els.leaderboardGame) els.leaderboardGame.addEventListener('change', loadLeaderboard);

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeModal(document.getElementById(button.dataset.closeModal)));
  });
  document.querySelectorAll('.arcade-modal').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal(modal);
    });
  });

  window.GagagaPlatform = {
    ...(window.GagagaPlatform || {}),
    api,
    getToken,
    getUser,
    submitScore(gameId, payload) {
      return api(`/api/leaderboards/${encodeURIComponent(gameId)}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  };

  refreshSession();
})();
