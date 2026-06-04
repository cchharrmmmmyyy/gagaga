const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'chat-data.json');
const MAX_CHAT_HISTORY = 50;

const rooms = new Map();
const sessions = new Map();
const chatClients = new Map();

function createEmptyChatData() {
  return { users: {}, messages: [] };
}

function loadChatData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(createEmptyChatData(), null, 2));
  }

  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      users: data.users && typeof data.users === 'object' ? data.users : {},
      messages: Array.isArray(data.messages) ? data.messages.slice(-MAX_CHAT_HISTORY) : []
    };
  } catch {
    return createEmptyChatData();
  }
}

const chatData = loadChatData();

function saveChatData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(chatData, null, 2));
}

function send(ws, data) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(data));
}

function normalizeUsername(username) {
  return String(username || '').trim();
}

function validateUsername(username) {
  return /^[A-Za-z0-9_\-\u4e00-\u9fa5]{2,16}$/.test(username);
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 4 && password.length <= 64;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, stored) {
  if (!stored || !stored.salt || !stored.hash) return false;
  const { hash } = hashPassword(password, stored.salt);
  const expected = Buffer.from(stored.hash, 'hex');
  const actual = Buffer.from(hash, 'hex');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function makeToken(username) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, username);
  return token;
}

function sanitizeMessageText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 240);
}

function broadcastChatMessage(message) {
  for (const client of chatClients.keys()) {
    send(client, { type: 'chat_message', message });
  }
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[crypto.randomInt(chars.length)];
  } while (rooms.has(code));
  return code;
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

function handleChatRegister(ws, msg, setChatToken) {
  const username = normalizeUsername(msg.username);
  if (!validateUsername(username)) {
    return send(ws, {
      type: 'chat_error',
      message: 'Username must be 2-16 letters, numbers, underscores, hyphens, or Chinese characters.'
    });
  }
  if (!validatePassword(msg.password)) {
    return send(ws, { type: 'chat_error', message: 'Password must be 4-64 characters.' });
  }
  if (chatData.users[username]) {
    return send(ws, { type: 'chat_error', message: 'This username is already registered.' });
  }

  chatData.users[username] = hashPassword(msg.password);
  saveChatData();

  const token = makeToken(username);
  setChatToken(token);
  chatClients.set(ws, username);
  send(ws, { type: 'chat_auth_ok', username, token, history: chatData.messages });
}

function handleChatLogin(ws, msg, setChatToken) {
  const username = normalizeUsername(msg.username);
  const user = chatData.users[username];
  if (!user || !verifyPassword(msg.password, user)) {
    return send(ws, { type: 'chat_error', message: 'Username or password is incorrect.' });
  }

  const token = makeToken(username);
  setChatToken(token);
  chatClients.set(ws, username);
  send(ws, { type: 'chat_auth_ok', username, token, history: chatData.messages });
}

function handleChatMessage(ws, msg) {
  const username = sessions.get(msg.token);
  if (!username) return send(ws, { type: 'chat_error', message: 'Please log in before chatting.' });

  const text = sanitizeMessageText(msg.text);
  if (!text) return send(ws, { type: 'chat_error', message: 'Message cannot be empty.' });

  const message = {
    username,
    text,
    timestamp: new Date().toISOString()
  };
  chatData.messages.push(message);
  chatData.messages = chatData.messages.slice(-MAX_CHAT_HISTORY);
  saveChatData();
  broadcastChatMessage(message);
}

const wss = new WebSocketServer({ port: PORT });
console.log(`Game WebSocket server running on port ${PORT}`);

wss.on('connection', (ws) => {
  let roomCode = null;
  let role = null;
  let chatToken = null;
  const setChatToken = (token) => {
    if (chatToken) sessions.delete(chatToken);
    chatToken = token;
  };

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return send(ws, { type: 'error', message: 'Invalid message.' });
    }

    switch (msg.type) {
      case 'chat_register':
        handleChatRegister(ws, msg, setChatToken);
        break;

      case 'chat_login':
        handleChatLogin(ws, msg, setChatToken);
        break;

      case 'chat_message':
        handleChatMessage(ws, msg);
        break;

      case 'create_room': {
        if (role) return send(ws, { type: 'error', message: 'Already in a room.' });
        const code = generateRoomCode();
        rooms.set(code, { host: ws, joiner: null });
        roomCode = code;
        role = 'host';
        send(ws, { type: 'room_created', roomCode: code });
        console.log(`[${code}] Room created`);
        break;
      }

      case 'join_room': {
        if (role) return send(ws, { type: 'error', message: 'Already in a room.' });
        const code = msg.roomCode;
        const room = rooms.get(code);
        if (!room) return send(ws, { type: 'error', message: 'Room does not exist.' });
        if (room.joiner) return send(ws, { type: 'error', message: 'Room is full.' });
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
        if (!roomCode || !role) return send(ws, { type: 'error', message: 'Not in a room.' });
        const room = rooms.get(roomCode);
        if (!room) return send(ws, { type: 'error', message: 'Room does not exist.' });
        const other = getOtherPeer(room, ws);
        if (other) send(other, msg);
        break;
      }

      default:
        send(ws, { type: 'error', message: 'Unknown message type.' });
    }
  });

  ws.on('close', () => {
    chatClients.delete(ws);
    if (chatToken) sessions.delete(chatToken);
    if (roomCode && rooms.has(roomCode)) {
      cleanupRoom(roomCode, rooms.get(roomCode), ws);
    }
  });

  ws.on('error', () => {});
});
