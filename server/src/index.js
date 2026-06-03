const http = require('http');

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
    websocket: '/ws/chinese-chess',
  });
});

createChessRoomService(server);

server.listen(PORT, () => {
  console.log(`Gagaga game service running on http://localhost:${PORT}`);
  console.log(`Chinese Chess WebSocket path: ws://localhost:${PORT}/ws/chinese-chess`);
});
