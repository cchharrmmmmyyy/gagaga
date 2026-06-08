(function exposePlatform(global) {
  const TOKEN_KEY = "gagagaAuthToken";
  let presenceSocket = null;
  let presenceHeartbeat = null;
  let presenceReconnect = null;

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
    startPresence();
    return result.user;
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
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || location.protocol === "file:") return;
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(
      `${protocol}://${location.host}/ws/presence?token=${encodeURIComponent(token)}`,
    );
    presenceSocket = socket;
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "heartbeat", at: Date.now() }));
      presenceHeartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "heartbeat", at: Date.now() }));
        }
      }, 15_000);
    });
    socket.addEventListener("close", () => {
      clearInterval(presenceHeartbeat);
      presenceHeartbeat = null;
      if (presenceSocket === socket) presenceSocket = null;
      if (socket.manualClose) return;
      if (localStorage.getItem(TOKEN_KEY) === token) {
        presenceReconnect = setTimeout(startPresence, 3000);
      }
    });
  }

  const platform = Object.freeze({
    register: (username, password) => authenticate("/api/register", username, password),
    login: (username, password) => authenticate("/api/login", username, password),
    me: () => request("/api/me"),
    logout: async () => {
      await request("/api/logout", { method: "POST" });
      localStorage.removeItem(TOKEN_KEY);
      stopPresence();
    },
    leaderboard: (gameId, limit = 10) => request(`/api/leaderboards/${encodeURIComponent(gameId)}?limit=${limit}`),
    searchUsers: (query, page = 1, pageSize = 20) => request(
      `/api/users/search?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`,
    ),
    friends: (page = 1, pageSize = 10) => request(`/api/friends?page=${page}&pageSize=${pageSize}`),
    friendRequests: () => request("/api/friend-requests"),
    sendFriendRequest: (userId) => request("/api/friend-requests", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),
    respondFriendRequest: (requestId, decision) => request(
      `/api/friend-requests/${encodeURIComponent(requestId)}/${decision}`,
      { method: "POST" },
    ),
    removeFriend: (userId) => request(`/api/friends/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),
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
  global.addEventListener("storage", (event) => {
    if (event.key === TOKEN_KEY) startPresence();
  });
  global.addEventListener("beforeunload", stopPresence);
  startPresence();
})(window);
