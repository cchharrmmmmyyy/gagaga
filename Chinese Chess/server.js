const crypto = require("crypto");

const rooms = new Map();
const rankedQueue = [];
const rankedMatches = new Map();

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

function removeFromRankedQueue(ws) {
  const index = rankedQueue.indexOf(ws);
  if (index >= 0) rankedQueue.splice(index, 1);
}

function opponentInMatch(match, ws) {
  return match.red === ws ? match.black : match.red;
}

function finishRankedMatch(match, winnerColor, reason) {
  if (!match || match.finished) return;
  match.finished = true;
  rankedMatches.delete(match.id);

  for (const [color, player] of [["r", match.red], ["b", match.black]]) {
    send(player, {
      type: "ranked_result",
      matchId: match.id,
      result: winnerColor === "draw" ? "draw" : color === winnerColor ? "win" : "loss",
      winner: winnerColor,
      reason,
      title: color === winnerColor ? "天才少年" : null,
    });
  }
}

function matchRankedPlayers() {
  while (rankedQueue.length >= 2) {
    const first = rankedQueue.shift();
    const secondIndex = rankedQueue.findIndex((candidate) => candidate.user.id !== first.user.id);
    if (secondIndex < 0) {
      rankedQueue.unshift(first);
      return;
    }

    const second = rankedQueue.splice(secondIndex, 1)[0];
    if (first.readyState !== 1 || second.readyState !== 1) continue;

    const matchId = `ranked_${crypto.randomBytes(12).toString("hex")}`;
    const red = crypto.randomInt(2) === 0 ? first : second;
    const black = red === first ? second : first;
    const match = { id: matchId, red, black, finished: false };
    rankedMatches.set(matchId, match);

    red.rankedMatchId = matchId;
    black.rankedMatchId = matchId;
    send(red, {
      type: "ranked_match_found",
      matchId,
      color: "r",
      opponent: { username: black.user.username },
    });
    send(black, {
      type: "ranked_match_found",
      matchId,
      color: "b",
      opponent: { username: red.user.username },
    });
  }
}

function handleWebSocket(ws, context = {}) {
  let code = null;
  let role = null;
  ws.user = context.user || null;
  ws.rankedMatchId = null;

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

    if (message.type === "ranked_enqueue" && !role && !ws.rankedMatchId) {
      if (!ws.user) return send(ws, { type: "auth_required", message: "请先登录再进行排位匹配" });
      if (!rankedQueue.includes(ws)) rankedQueue.push(ws);
      send(ws, { type: "ranked_queued", queueSize: rankedQueue.length });
      matchRankedPlayers();
      return;
    }

    if (message.type === "ranked_cancel" && !ws.rankedMatchId) {
      removeFromRankedQueue(ws);
      return send(ws, { type: "ranked_cancelled" });
    }

    if (["move", "resign"].includes(message.type) && ws.rankedMatchId) {
      const match = rankedMatches.get(ws.rankedMatchId);
      if (!match || match.finished) return;
      const other = opponentInMatch(match, ws);
      const senderColor = match.red === ws ? "r" : "b";

      if (message.type === "move") {
        if (other) send(other, message);
        if (message.status === "checkmate" && message.winner === senderColor) {
          finishRankedMatch(match, senderColor, "checkmate");
        } else if (message.status === "stalemate") {
          finishRankedMatch(match, "draw", "stalemate");
        }
      } else {
        finishRankedMatch(match, senderColor === "r" ? "b" : "r", "resign");
      }
      return;
    }

    if (["move", "resign"].includes(message.type) && code) {
      const room = rooms.get(code);
      const other = room?.host === ws ? room.joiner : room?.host;
      if (other) send(other, message);
      return;
    }

    send(ws, { type: "error", message: "Unknown or invalid action" });
  });

  ws.on("close", () => {
    removeFromRankedQueue(ws);
    if (ws.rankedMatchId) {
      const match = rankedMatches.get(ws.rankedMatchId);
      if (match && !match.finished) {
        const winnerColor = match.red === ws ? "b" : "r";
        finishRankedMatch(match, winnerColor, "disconnect");
      }
    }

    const room = rooms.get(code);
    if (!room) return;
    const other = room.host === ws ? room.joiner : room.host;
    if (other) send(other, { type: "opponent_disconnected" });
    rooms.delete(code);
  });
}

module.exports = { handleWebSocket };
