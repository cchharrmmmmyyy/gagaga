const { WebSocketServer } = require('ws');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[crypto.randomInt(chars.length)];
  } while (rooms.has(code));
  return code;
}

function send(ws, data) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(data));
}

function getOtherPeer(room, ws) {
  return room.host === ws ? room.joiner : room.host;
}

function cleanupRoom(code, room, ws) {
  const other = getOtherPeer(room, ws);
  if (other) send(other, { type: 'opponent_disconnected' });
  rooms.delete(code);
  console.log(`[${code}] Room closed`);
}

const wss = new WebSocketServer({ port: PORT });
console.log(`Chinese Chess WebSocket server running on port ${PORT}`);

wss.on('connection', (ws) => {
  let roomCode = null;
  let role = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return send(ws, { type: 'error', message: '无效消息' }); }

    switch (msg.type) {
      case 'create_room': {
        if (role) return send(ws, { type: 'error', message: '已在房间中' });
        const code = generateRoomCode();
        rooms.set(code, { host: ws, joiner: null });
        roomCode = code;
        role = 'host';
        send(ws, { type: 'room_created', roomCode: code });
        console.log(`[${code}] Room created`);
        break;
      }

      case 'join_room': {
        if (role) return send(ws, { type: 'error', message: '已在房间中' });
        const code = msg.roomCode;
        const room = rooms.get(code);
        if (!room) return send(ws, { type: 'error', message: '房间不存在' });
        if (room.joiner) return send(ws, { type: 'error', message: '房间已满' });
        room.joiner = ws;
        roomCode = code;
        role = 'joiner';
        send(room.host, { type: 'opponent_joined' });
        send(ws, { type: 'joined' });
        console.log(`[${code}] Player joined`);
        break;
      }

      case 'move':
      case 'resign': {
        if (!roomCode || !role) return send(ws, { type: 'error', message: '不在房间中' });
        const room = rooms.get(roomCode);
        if (!room) return send(ws, { type: 'error', message: '房间不存在' });
        const other = getOtherPeer(room, ws);
        if (other) send(other, msg);
        break;
      }

      default:
        send(ws, { type: 'error', message: '未知消息类型' });
    }
  });

  ws.on('close', () => {
    if (roomCode && rooms.has(roomCode)) {
      cleanupRoom(roomCode, rooms.get(roomCode), ws);
    }
  });

  ws.on('error', () => {});
});
