(function exposePlatform(global) {
  const TOKEN_KEY = "gagagaAuthToken";

  async function request(path, options = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "请求失败");
    return body;
  }

  async function authenticate(path, username, password) {
    const result = await request(path, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem(TOKEN_KEY, result.token);
    return result.user;
  }

  const platform = Object.freeze({
    register: (username, password) => authenticate("/api/register", username, password),
    login: (username, password) => authenticate("/api/login", username, password),
    me: () => request("/api/me"),
    logout: async () => {
      await request("/api/logout", { method: "POST" });
      localStorage.removeItem(TOKEN_KEY);
    },
    leaderboard: (gameId, limit = 10) => request(`/api/leaderboards/${encodeURIComponent(gameId)}?limit=${limit}`),
    submitScore: (gameId, payload) => request(`/api/leaderboards/${encodeURIComponent(gameId)}/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    gameApi: (gameId, path, options) => request(`/api/games/${encodeURIComponent(gameId)}${path}`, options),
    chatSocket: () => new WebSocket(
      `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws/chat?token=${localStorage.getItem(TOKEN_KEY) || ""}`,
    ),
    gameSocket: (gameId) => new WebSocket(
      `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws/games/${encodeURIComponent(gameId)}?token=${localStorage.getItem(TOKEN_KEY) || ""}`,
    ),
  });
  global.GamePlatform = platform;
  global.GagagaPlatform = { ...(global.GagagaPlatform || {}), ...platform };
})(window);
