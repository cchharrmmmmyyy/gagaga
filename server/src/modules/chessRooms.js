const crypto = require('crypto');
const { WebSocketServer } = require('ws');

function createChessRoomService(server) {
  const rooms = new Map();
  const wss = new WebSocketServer({ server, path: '/ws/chinese-chess' });

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

  function otherPeer(room, ws) {
    return room.host === ws ? room.joiner : room.host;
  }

  function cleanupRoom(code, room, ws) {
    const other = otherPeer(room, ws);
    if (other) send(other, { type: 'opponent_disconnected' });
    rooms.delete(code);
  }

  wss.on('connection', (ws) => {
    let roomCode = null;
    let role = null;

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return send(ws, { type: 'error', message: 'Invalid message' }); }

      switch (msg.type) {
        case 'create_room': {
          if (role) return send(ws, { type: 'error', message: 'Already in a room' });
          const code = generateRoomCode();
          rooms.set(code, { host: ws, joiner: null });
          roomCode = code;
          role = 'host';
          send(ws, { type: 'room_created', roomCode: code });
          break;
        }

        case 'join_room': {
          if (role) return send(ws, { type: 'error', message: 'Already in a room' });
          const code = String(msg.roomCode || '').toUpperCase();
          const room = rooms.get(code);
          if (!room) return send(ws, { type: 'error', message: 'Room does not exist' });
          if (room.joiner) return send(ws, { type: 'error', message: 'Room is full' });
          room.joiner = ws;
          roomCode = code;
          role = 'joiner';
          send(room.host, { type: 'opponent_joined' });
          send(ws, { type: 'joined' });
          break;
        }

        case 'move':
        case 'resign': {
          if (!roomCode || !role) return send(ws, { type: 'error', message: 'Not in a room' });
          const room = rooms.get(roomCode);
          if (!room) return send(ws, { type: 'error', message: 'Room does not exist' });
          send(otherPeer(room, ws), msg);
          break;
        }

        default:
          send(ws, { type: 'error', message: 'Unknown message type' });
      }
    });

    ws.on('close', () => {
      if (roomCode && rooms.has(roomCode)) cleanupRoom(roomCode, rooms.get(roomCode), ws);
    });
    ws.on('error', () => {});
  });

  return { rooms, wss };
}

module.exports = { createChessRoomService };
