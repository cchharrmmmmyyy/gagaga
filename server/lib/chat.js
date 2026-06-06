const { WebSocketServer } = require("ws");

function attachChat(server, authenticateUpgrade) {
  const wss = new WebSocketServer({ noServer: true });
  const history = [];

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname !== "/ws/chat") return;
    const user = authenticateUpgrade(req, url);
    if (!user) return socket.destroy();

    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user;
      wss.emit("connection", ws);
    });
  });

  wss.on("connection", (ws) => {
    ws.send(JSON.stringify({ type: "history", messages: history }));
    ws.on("message", (raw) => {
      let incoming;
      try {
        incoming = JSON.parse(raw);
      } catch {
        return;
      }
      const text = String(incoming.text || "").trim().slice(0, 500);
      if (!text) return;
      const message = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        username: ws.user.username,
        text,
        createdAt: new Date().toISOString(),
      };
      history.push(message);
      if (history.length > 100) history.shift();
      const packet = JSON.stringify({ type: "message", message });
      for (const client of wss.clients) if (client.readyState === 1) client.send(packet);
    });
  });
}

module.exports = { attachChat };
