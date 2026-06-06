const { WebSocketServer } = require('ws');
const { getAuthUser, publicUser } = require('./auth');
const { readDb, updateDb } = require('../lib/store');

const MAX_HISTORY = 50;
const MAX_MESSAGE_LENGTH = 240;

function send(ws, data) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(data));
}

function cleanText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE_LENGTH);
}

function latestMessages(db) {
  return (db.chatMessages || []).slice(-MAX_HISTORY);
}

function authUserFromToken(token) {
  return getAuthUser(readDb(), `Bearer ${token || ''}`);
}

function createChatService() {
  const clients = new Map();
  const wss = new WebSocketServer({ noServer: true });

  function broadcast(message) {
    for (const client of clients.keys()) {
      send(client, { type: 'message', message });
    }
  }

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return send(ws, { type: 'error', message: 'Invalid message' });
      }

      if (msg.type === 'auth') {
        const user = authUserFromToken(msg.token);
        if (!user) return send(ws, { type: 'error', message: 'Login required' });

        clients.set(ws, user);
        return send(ws, {
          type: 'ready',
          user: publicUser(user),
          history: latestMessages(readDb()),
        });
      }

      if (msg.type === 'message') {
        const user = clients.get(ws);
        if (!user) return send(ws, { type: 'error', message: 'Login required' });

        const text = cleanText(msg.text);
        if (!text) return send(ws, { type: 'error', message: 'Message cannot be empty' });

        const result = updateDb((db) => {
          const message = {
            id: `chat_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            userId: user.id,
            username: user.username,
            text,
            createdAt: new Date().toISOString(),
          };
          db.chatMessages = [...latestMessages(db), message];
          return message;
        });

        return broadcast(result);
      }

      return send(ws, { type: 'error', message: 'Unknown message type' });
    });

    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });

  return { clients, wss };
}

module.exports = { createChatService };
