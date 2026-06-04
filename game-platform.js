(function () {
  const TOKEN_KEY = 'gagagaAuthToken';
  const USER_KEY = 'gagagaUser';
  const submittedKeys = new Set();
  const memoryStore = {};

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

  window.GagagaPlatform = {
    ...(window.GagagaPlatform || {}),
    api,
    getToken,
    getUser,
    submitScore,
  };
})();
