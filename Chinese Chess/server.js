const crypto = require("crypto");

const rooms = new Map();

function send(ws, data) {
  if (ws.readyState === 1) ws.send(JSON.stringify(data));
}

function roomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 4 }, () => chars[crypto.randomInt(chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function handleWebSocket(ws) {
  let code = null;
  let role = null;

  ws.on("message", (raw) => {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return send(ws, { type: "error", message: "Invalid message" });
    }

    if (message.type === "create_room" && !role) {
      code = roomCode();
      role = "host";
      rooms.set(code, { host: ws, joiner: null });
      return send(ws, { type: "room_created", roomCode: code });
    }

    if (message.type === "join_room" && !role) {
      const requested = String(message.roomCode || "").toUpperCase();
      const room = rooms.get(requested);
      if (!room || room.joiner) return send(ws, { type: "error", message: "Room unavailable" });
      code = requested;
      role = "joiner";
      room.joiner = ws;
      send(room.host, { type: "opponent_joined" });
      return send(ws, { type: "joined" });
    }

    if (["move", "resign"].includes(message.type) && code) {
      const room = rooms.get(code);
      const other = room?.host === ws ? room.joiner : room?.host;
      if (other) send(other, message);
      return;
    }

    if (message.type === 'chat' && message.text) {
      const room = rooms.get(code);
      if (room) {
        const other = room.host === ws ? room.joiner : room.host;
        if (other) send(other, { type: 'chat', text: String(message.text).slice(0, 500) });
      }
      return;
    }

    send(ws, { type: "error", message: "Unknown or invalid action" });
  });

  ws.on("close", () => {
    const room = rooms.get(code);
    if (!room) return;
    const other = room.host === ws ? room.joiner : room.host;
    if (other) send(other, { type: "opponent_disconnected" });
    rooms.delete(code);
  });
}

module.exports = { handleWebSocket };
