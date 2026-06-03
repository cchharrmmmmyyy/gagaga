const { getAuthUser, login, logout, publicUser, register } = require('./modules/auth');
const { LEADERBOARD_CONFIGS, listLeaderboard, submitScore } = require('./modules/leaderboards');
const { readDb, updateDb } = require('./lib/store');
const { readBody, sendJson } = require('./lib/http');

async function handleApi(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === 'POST' && url.pathname === '/api/register') {
      const body = await readBody(req);
      const result = updateDb((db) => register(db, body));
      return sendJson(res, result.status, result.data);
    }

    if (req.method === 'POST' && url.pathname === '/api/login') {
      const body = await readBody(req);
      const result = updateDb((db) => login(db, body));
      return sendJson(res, result.status, result.data);
    }

    if (req.method === 'GET' && url.pathname === '/api/me') {
      const db = readDb();
      const user = getAuthUser(db, req.headers.authorization);
      if (!user) return sendJson(res, 401, { error: 'Not logged in' });
      return sendJson(res, 200, { user: publicUser(user) });
    }

    if (req.method === 'POST' && url.pathname === '/api/logout') {
      const result = updateDb((db) => logout(db, req.headers.authorization));
      return sendJson(res, result.status, result.data);
    }

    if (req.method === 'GET' && url.pathname === '/api/leaderboards/config') {
      return sendJson(res, 200, { games: LEADERBOARD_CONFIGS });
    }

    const leaderboardMatch = url.pathname.match(/^\/api\/leaderboards\/([^/]+)$/);
    if (req.method === 'GET' && leaderboardMatch) {
      const gameId = decodeURIComponent(leaderboardMatch[1]);
      const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit')) || 10));
      const rows = listLeaderboard(readDb(), gameId, limit);
      if (!rows) return sendJson(res, 404, { error: 'Unknown game' });
      return sendJson(res, 200, { game: LEADERBOARD_CONFIGS[gameId], rows });
    }

    const submitMatch = url.pathname.match(/^\/api\/leaderboards\/([^/]+)\/submit$/);
    if (req.method === 'POST' && submitMatch) {
      const body = await readBody(req);
      const gameId = decodeURIComponent(submitMatch[1]);
      const result = updateDb((db) => {
        const user = getAuthUser(db, req.headers.authorization);
        if (!user) return { status: 401, data: { error: 'Login required' } };
        return submitScore(db, user, gameId, body);
      });
      return sendJson(res, result.status, result.data);
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    return sendJson(res, 400, { error: err.message || 'Bad request' });
  }
}

module.exports = { handleApi };
