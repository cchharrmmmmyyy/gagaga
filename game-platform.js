(function () {
  const TOKEN_KEY = 'gagagaAuthToken';
  const USER_KEY = 'gagagaUser';
  const submittedKeys = new Set();
  const memoryStore = {};
  let presenceSocket = null;
  let presenceHeartbeat = null;
  let presenceReconnect = null;

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memoryStore[key] || null;
    }
  }

  function getToken() {
    return storageGet(TOKEN_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(storageGet(USER_KEY) || 'null');
    } catch {
      return null;
    }
  }

  async function api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function submitScore(gameId, payload, dedupeKey) {
    if (!getToken()) return Promise.resolve({ skipped: true, reason: 'not_logged_in' });
    const key = dedupeKey || `${gameId}:${JSON.stringify(payload)}`;
    if (submittedKeys.has(key)) return Promise.resolve({ skipped: true, reason: 'duplicate' });
    submittedKeys.add(key);
    return api(`/api/leaderboards/${encodeURIComponent(gameId)}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }).catch((err) => {
      submittedKeys.delete(key);
      console.warn('Leaderboard submit failed:', err.message);
      return { skipped: true, reason: err.message };
    });
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

  function startPresence() {
    stopPresence();
    const token = getToken();
    if (!token || location.protocol === 'file:') return;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(
      `${protocol}://${location.host}/ws/presence?token=${encodeURIComponent(token)}`
    );
    presenceSocket = socket;
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'heartbeat', at: Date.now() }));
      presenceHeartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'heartbeat', at: Date.now() }));
        }
      }, 15_000);
    });
    socket.addEventListener('close', () => {
      clearInterval(presenceHeartbeat);
      presenceHeartbeat = null;
      if (presenceSocket === socket) presenceSocket = null;
      if (socket.manualClose) return;
      if (getToken() === token) presenceReconnect = setTimeout(startPresence, 3000);
    });
  }

  window.GagagaPlatform = {
    ...(window.GagagaPlatform || {}),
    api,
    getToken,
    getUser,
    submitScore,
  };

  window.addEventListener('storage', (event) => {
    if (event.key === TOKEN_KEY) startPresence();
  });
  window.addEventListener('beforeunload', stopPresence);
  startPresence();
})();
