const { WebSocketServer } = require("ws");
const store = require("./store");

function attachChat(server, authenticateUpgrade) {
  const wss = new WebSocketServer({ noServer: true });
  const maxHistory = 50;

  function history() {
    return (store.read().chatMessages || []).slice(-maxHistory);
  }

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname !== "/ws/chat") return;
    const user = authenticateUpgrade(req, url);

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user;
      wss.emit("connection", ws, req, url);
    });
  });

  wss.on("connection", (ws, req, url) => {
    if (ws.user) {
      ws.send(JSON.stringify({ type: "ready", user: ws.user, history: history() }));
    }

    ws.on("message", (raw) => {
      let incoming;
      try {
        incoming = JSON.parse(raw);
      } catch {
        return ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
      }

      if (incoming.type === "auth") {
        ws.user = authenticateUpgrade(req, url, incoming.token);
        if (!ws.user) {
          return ws.send(JSON.stringify({ type: "error", message: "Login required" }));
        }
        return ws.send(JSON.stringify({ type: "ready", user: ws.user, history: history() }));
      }

      if (!ws.user) {
        return ws.send(JSON.stringify({ type: "error", message: "Login required" }));
      }
      const text = String(incoming.text || "").replace(/\s+/g, " ").trim().slice(0, 240);
      if (!text) {
        return ws.send(JSON.stringify({ type: "error", message: "Message cannot be empty" }));
      }
      const message = store.update((db) => {
        const item = {
          id: `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          userId: ws.user.id,
          username: ws.user.username,
          text,
          createdAt: new Date().toISOString(),
        };
        db.chatMessages = [...(db.chatMessages || []).slice(-(maxHistory - 1)), item];
        return item;
      });
      const packet = JSON.stringify({ type: "message", message });
      for (const client of wss.clients) {
        if (client.readyState === 1 && client.user) client.send(packet);
      }
    });
  });
}

module.exports = { attachChat };
