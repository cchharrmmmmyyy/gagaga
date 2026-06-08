const { WebSocketServer, WebSocket } = require("ws");

const CHECK_INTERVAL_MS = 15_000;
const OFFLINE_TIMEOUT_MS = 45_000;

function createPresence(server, authenticateUpgrade, getFriendIds) {
  const wss = new WebSocketServer({ noServer: true });
  const connections = new Map();

  function socketsFor(userId) {
    return connections.get(userId) || new Set();
  }

  function isOnline(userId) {
    return socketsFor(userId).size > 0;
  }

  function send(ws, packet) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(packet));
  }

  function snapshot(userId) {
    return getFriendIds(userId).map((friendId) => ({
      userId: friendId,
      online: isOnline(friendId),
    }));
  }

  function notifyUsers(userIds) {
    for (const userId of new Set(userIds.filter(Boolean))) {
      const statuses = snapshot(userId);
      for (const ws of socketsFor(userId)) send(ws, { type: "presence_snapshot", statuses });
    }
  }

  function broadcastStatus(userId, online) {
    const recipients = [userId, ...getFriendIds(userId)];
    for (const recipientId of recipients) {
      for (const ws of socketsFor(recipientId)) {
        send(ws, { type: "presence", userId, online });
      }
    }
  }

  function addConnection(ws) {
    const wasOnline = isOnline(ws.user.id);
    if (!connections.has(ws.user.id)) connections.set(ws.user.id, new Set());
    connections.get(ws.user.id).add(ws);
    send(ws, { type: "presence_ready", statuses: snapshot(ws.user.id) });
    if (!wasOnline) broadcastStatus(ws.user.id, true);
  }

  function removeConnection(ws) {
    if (!ws.user) return;
    const group = connections.get(ws.user.id);
    if (!group) return;
    group.delete(ws);
    if (!group.size) {
      connections.delete(ws.user.id);
      broadcastStatus(ws.user.id, false);
    }
  }

  function disconnectToken(token) {
    if (!token) return;
    for (const group of connections.values()) {
      for (const ws of group) {
        if (ws.token === token) ws.close(1000, "Logged out");
      }
    }
  }

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname !== "/ws/presence") return;
    const token = url.searchParams.get("token") || "";
    const user = authenticateUpgrade(req, url, token);
    if (!user) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user;
      ws.token = token;
      ws.lastSeenAt = Date.now();
      wss.emit("connection", ws);
    });
  });

  wss.on("connection", (ws) => {
    addConnection(ws);
    ws.on("message", (raw) => {
      let packet;
      try {
        packet = JSON.parse(raw);
      } catch {
        return;
      }
      if (packet.type === "heartbeat") {
        ws.lastSeenAt = Date.now();
        send(ws, { type: "heartbeat_ack", at: ws.lastSeenAt });
      }
    });
    ws.on("close", () => removeConnection(ws));
    ws.on("error", () => removeConnection(ws));
  });

  const interval = setInterval(() => {
    const cutoff = Date.now() - OFFLINE_TIMEOUT_MS;
    for (const group of connections.values()) {
      for (const ws of group) {
        if (ws.lastSeenAt < cutoff) ws.terminate();
        else if (ws.readyState === WebSocket.OPEN) ws.ping();
      }
    }
  }, CHECK_INTERVAL_MS);
  interval.unref();

  return { disconnectToken, isOnline, notifyUsers };
}

module.exports = { createPresence };
