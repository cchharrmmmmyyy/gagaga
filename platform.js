(function () {
  const API_BASE = '';
  const TOKEN_KEY = 'gagagaAuthToken';
  const USER_KEY = 'gagagaUser';

  const els = {
    accountName: document.getElementById('account-name'),
    authOpen: document.getElementById('auth-open-btn'),
    friendsOpen: document.getElementById('friends-open-btn'),
    leaderboardOpen: document.getElementById('leaderboard-open-btn'),
    logout: document.getElementById('logout-btn'),
    authModal: document.getElementById('auth-modal'),
    friendsModal: document.getElementById('friends-modal'),
    leaderboardModal: document.getElementById('leaderboard-modal'),
    authMessage: document.getElementById('auth-message'),
    leaderboardMessage: document.getElementById('leaderboard-message'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    leaderboardGame: document.getElementById('leaderboard-game'),
    leaderboardBody: document.getElementById('leaderboard-body'),
    leaderboardRefresh: document.getElementById('leaderboard-refresh-btn'),
    friendsMessage: document.getElementById('friends-message'),
    friendsList: document.getElementById('friends-list'),
    friendsSearchForm: document.getElementById('friends-search-form'),
    friendsSearchResults: document.getElementById('friends-search-results'),
    incomingRequests: document.getElementById('incoming-requests'),
    outgoingRequests: document.getElementById('outgoing-requests'),
    friendsPrev: document.getElementById('friends-prev-btn'),
    friendsNext: document.getElementById('friends-next-btn'),
    friendsPageLabel: document.getElementById('friends-page-label'),
  };

  let leaderboardConfig = {};
  let friendPage = 1;
  let friendTotalPages = 1;
  let presenceSocket = null;
  let presenceHeartbeat = null;
  let presenceReconnect = null;

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
    notifyAuthChange();
    startPresence();
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    renderAccount();
    notifyAuthChange();
    stopPresence();
  }

  function notifyAuthChange() {
    window.dispatchEvent(new CustomEvent('gagaga-auth-change', {
      detail: { user: getUser(), token: getToken() },
    }));
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
      if (els.friendsOpen) els.friendsOpen.hidden = false;
      els.logout.hidden = false;
    } else {
      els.accountName.textContent = 'Guest';
      els.authOpen.hidden = false;
      if (els.friendsOpen) els.friendsOpen.hidden = true;
      els.logout.hidden = true;
      if (els.friendsModal) closeModal(els.friendsModal);
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
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? '#e33a25' : '#1f6f35';
  }

  function presenceUrl(token) {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${location.host}/ws/presence?token=${encodeURIComponent(token)}`;
  }

  function stopPresence() {
    clearInterval(presenceHeartbeat);
    clearTimeout(presenceReconnect);
    presenceHeartbeat = null;
    presenceReconnect = null;
    if (presenceSocket) {
      presenceSocket.manualClose = true;
      presenceSocket.close();
      presenceSocket = null;
    }
  }

  function updatePresence(userId, online) {
    document.querySelectorAll(`[data-friend-user-id="${CSS.escape(userId)}"]`).forEach((row) => {
      const status = row.querySelector('.friend-status');
      if (!status) return;
      status.classList.toggle('online', online);
      status.textContent = online ? 'Online' : 'Offline';
    });
  }

  function startPresence() {
    stopPresence();
    const token = getToken();
    if (!token) return;

    const socket = new WebSocket(presenceUrl(token));
    presenceSocket = socket;
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'heartbeat', at: Date.now() }));
      presenceHeartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'heartbeat', at: Date.now() }));
        }
      }, 15_000);
    });
    socket.addEventListener('message', (event) => {
      let packet;
      try {
        packet = JSON.parse(event.data);
      } catch {
        return;
      }
      if (packet.type === 'presence') updatePresence(packet.userId, packet.online);
      if (packet.type === 'presence_ready' || packet.type === 'presence_snapshot') {
        (packet.statuses || []).forEach((item) => updatePresence(item.userId, item.online));
      }
    });
    socket.addEventListener('close', () => {
      clearInterval(presenceHeartbeat);
      presenceHeartbeat = null;
      if (presenceSocket === socket) presenceSocket = null;
      if (socket.manualClose) return;
      if (getToken() === token) presenceReconnect = setTimeout(startPresence, 3000);
    });
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

  function emptyRow(text) {
    const item = document.createElement('div');
    item.className = 'friends-empty';
    item.textContent = text;
    return item;
  }

  function actionButton(label, action, danger = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pixel-btn${danger ? ' danger' : ''}`;
    button.textContent = label;
    button.addEventListener('click', action);
    return button;
  }

  function friendRow(user, actions = []) {
    const row = document.createElement('div');
    row.className = 'friend-row';
    row.dataset.friendUserId = user.id;

    const identity = document.createElement('div');
    identity.className = 'friend-identity';
    const name = document.createElement('div');
    name.className = 'friend-name';
    name.textContent = user.username;
    identity.appendChild(name);

    if (typeof user.online === 'boolean') {
      const status = document.createElement('div');
      status.className = `friend-status${user.online ? ' online' : ''}`;
      status.textContent = user.online ? 'Online' : 'Offline';
      identity.appendChild(status);
    }

    const controls = document.createElement('div');
    controls.className = 'friend-actions';
    actions.forEach((action) => controls.appendChild(action));
    row.append(identity, controls);
    return row;
  }

  function renderRows(container, rows, emptyText) {
    container.innerHTML = '';
    if (!rows.length) {
      container.appendChild(emptyRow(emptyText));
      return;
    }
    rows.forEach((row) => container.appendChild(row));
  }

  async function loadFriends(page = friendPage) {
    if (!getToken()) return;
    try {
      const result = await api(`/api/friends?page=${page}&pageSize=10`);
      friendPage = result.page;
      friendTotalPages = result.totalPages;
      renderRows(els.friendsList, result.items.map((user) => friendRow(user, [
        actionButton('Remove', async () => {
          if (!window.confirm(`Remove ${user.username} from friends?`)) return;
          try {
            await api(`/api/friends/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
            setMessage(els.friendsMessage, `${user.username} removed.`);
            await Promise.all([loadFriends(friendPage), loadRequests()]);
          } catch (err) {
            setMessage(els.friendsMessage, err.message, true);
          }
        }, true),
      ])), 'No friends yet.');
      els.friendsPageLabel.textContent = `Page ${friendPage} / ${friendTotalPages}`;
      els.friendsPrev.disabled = friendPage <= 1;
      els.friendsNext.disabled = friendPage >= friendTotalPages;
    } catch (err) {
      setMessage(els.friendsMessage, err.message, true);
    }
  }

  function relationLabel(relation) {
    return {
      self: 'You',
      friend: 'Friends',
      pending_incoming: 'Review request',
      pending_outgoing: 'Pending',
    }[relation] || '';
  }

  async function searchFriends(query, page = 1) {
    try {
      const result = await api(`/api/users/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=20`);
      const rows = result.items.map((user) => {
        const actions = [];
        if (user.relation === 'none') {
          actions.push(actionButton('Add', async () => {
            try {
              await api('/api/friend-requests', {
                method: 'POST',
                body: JSON.stringify({ userId: user.id }),
              });
              setMessage(els.friendsMessage, `Request sent to ${user.username}.`);
              await Promise.all([searchFriends(query, page), loadRequests()]);
            } catch (err) {
              setMessage(els.friendsMessage, err.message, true);
            }
          }));
        } else {
          const label = document.createElement('span');
          label.textContent = relationLabel(user.relation);
          label.style.fontWeight = '900';
          actions.push(label);
        }
        return friendRow(user, actions);
      });
      renderRows(els.friendsSearchResults, rows, 'No users found.');
    } catch (err) {
      setMessage(els.friendsMessage, err.message, true);
    }
  }

  async function handleRequest(requestId, decision, username) {
    try {
      await api(`/api/friend-requests/${encodeURIComponent(requestId)}/${decision}`, { method: 'POST' });
      setMessage(els.friendsMessage, decision === 'accept'
        ? `${username} is now your friend.`
        : `Request from ${username} rejected.`);
      await Promise.all([loadRequests(), loadFriends(1)]);
    } catch (err) {
      setMessage(els.friendsMessage, err.message, true);
    }
  }

  async function loadRequests() {
    if (!getToken()) return;
    try {
      const result = await api('/api/friend-requests');
      renderRows(els.incomingRequests, result.incoming.map((request) => friendRow(request.user, [
        actionButton('Accept', () => handleRequest(request.id, 'accept', request.user.username)),
        actionButton('Reject', () => handleRequest(request.id, 'reject', request.user.username), true),
      ])), 'No incoming requests.');
      renderRows(els.outgoingRequests, result.outgoing.map((request) => friendRow(request.user, [
        (() => {
          const label = document.createElement('span');
          label.textContent = 'Pending';
          label.style.fontWeight = '900';
          return label;
        })(),
      ])), 'No sent requests.');
    } catch (err) {
      setMessage(els.friendsMessage, err.message, true);
    }
  }

  function selectFriendsTab(name) {
    document.querySelectorAll('[data-friends-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.friendsTab === name);
    });
    document.querySelectorAll('[data-friends-pane]').forEach((pane) => {
      pane.hidden = pane.dataset.friendsPane !== name;
    });
    if (name === 'list') loadFriends();
    if (name === 'requests') loadRequests();
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
    notifyAuthChange();
    startPresence();
  }

  els.authOpen.addEventListener('click', () => openModal(els.authModal));
  if (els.friendsOpen) {
    els.friendsOpen.addEventListener('click', async () => {
      if (!getToken()) return openModal(els.authModal);
      openModal(els.friendsModal);
      selectFriendsTab('list');
      await loadRequests();
    });
  }
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
    stopPresence();
  });
  if (els.loginForm) els.loginForm.addEventListener('submit', (event) => handleAuthSubmit(event, 'login'));
  if (els.registerForm) els.registerForm.addEventListener('submit', (event) => handleAuthSubmit(event, 'register'));
  if (els.leaderboardRefresh) els.leaderboardRefresh.addEventListener('click', loadLeaderboard);
  if (els.leaderboardGame) els.leaderboardGame.addEventListener('change', loadLeaderboard);
  if (els.friendsSearchForm) {
    els.friendsSearchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      searchFriends(event.currentTarget.elements.query.value.trim());
    });
  }
  if (els.friendsPrev) els.friendsPrev.addEventListener('click', () => loadFriends(friendPage - 1));
  if (els.friendsNext) els.friendsNext.addEventListener('click', () => loadFriends(friendPage + 1));
  document.querySelectorAll('[data-friends-tab]').forEach((button) => {
    button.addEventListener('click', () => selectFriendsTab(button.dataset.friendsTab));
  });

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

  window.addEventListener('storage', (event) => {
    if (event.key !== TOKEN_KEY && event.key !== USER_KEY) return;
    renderAccount();
    notifyAuthChange();
    startPresence();
  });
  window.addEventListener('beforeunload', stopPresence);
  refreshSession();
})();
