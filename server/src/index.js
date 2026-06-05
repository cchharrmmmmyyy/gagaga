const http = require('http');

const { createChatService } = require('./modules/chat');
const { createChessRoomService } = require('./modules/chessRooms');
const { ensureStore } = require('./lib/store');
const { handleApi } = require('./router');
const { sendJson } = require('./lib/http');
const { sendStatic } = require('./lib/staticFiles');

const PORT = process.env.PORT || 8080;

ensureStore();

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return handleApi(req, res);
  if (sendStatic(req, res)) return;
  return sendJson(res, 200, {
    ok: true,
    service: 'Gagaga game service',
    http: ['/api/register', '/api/login', '/api/me', '/api/leaderboards/config'],
    websocket: ['/ws/chinese-chess', '/ws/chat'],
  });
});

const chatService = createChatService();
const chessRoomService = createChessRoomService();

server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const service = pathname === '/ws/chat'
    ? chatService
    : pathname === '/ws/chinese-chess'
      ? chessRoomService
      : null;

  if (!service) {
    socket.destroy();
    return;
  }

  service.wss.handleUpgrade(req, socket, head, (ws) => {
    service.wss.emit('connection', ws, req);
  });
});

server.listen(PORT, () => {
  console.log(`Gagaga game service running on http://localhost:${PORT}`);
  console.log(`Chinese Chess WebSocket path: ws://localhost:${PORT}/ws/chinese-chess`);
  console.log(`Chat WebSocket path: ws://localhost:${PORT}/ws/chat`);
});
