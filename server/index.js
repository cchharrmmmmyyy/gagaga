const fs = require("fs");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");
const auth = require("./lib/auth");
const { attachChat } = require("./lib/chat");
const { discoverGames, ROOT } = require("./lib/games");
const { readJson, sendJson } = require("./lib/http");
const leaderboards = require("./lib/leaderboards");

const PORT = Number(process.env.PORT || 8080);
const games = discoverGames();

function publicLeaderboard(game) {
  const leaderboard = game.manifest.leaderboard;
  if (!leaderboard) return null;
  return {
    ...leaderboard,
    label: game.manifest.name,
    strategy: leaderboard.type === "match"
      ? "matchRecord"
      : leaderboard.sort?.[0]?.direction === "asc" ? "bestLowScore" : "bestHighScore",
  };
}

function requireUser(req) {
  const user = auth.userFromRequest(req);
  if (!user) throw Object.assign(new Error("请先登录"), { status: 401 });
  return user;
}

async function api(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/games") {
    return sendJson(res, 200, {
      games: [...games.values()].map(({ manifest }) => manifest),
    });
  }
  if (req.method === "GET" && url.pathname === "/api/leaderboards/config") {
    return sendJson(res, 200, {
      games: Object.fromEntries(
        [...games.entries()]
          .filter(([, game]) => game.manifest.leaderboard)
          .map(([id, game]) => [id, publicLeaderboard(game)]),
      ),
    });
  }
  if (req.method === "POST" && url.pathname === "/api/register") {
    const body = await readJson(req);
    return sendJson(res, 201, auth.register(body.username, body.password));
  }
  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readJson(req);
    return sendJson(res, 200, auth.login(body.username, body.password));
  }
  if (req.method === "GET" && url.pathname === "/api/me") {
    return sendJson(res, 200, { user: auth.publicUser(requireUser(req)) });
  }
  if (req.method === "POST" && url.pathname === "/api/logout") {
    auth.logout(req);
    return sendJson(res, 200, { ok: true });
  }

  const leaderboardMatch = url.pathname.match(/^\/api\/leaderboards\/([^/]+)(\/submit)?$/);
  if (leaderboardMatch) {
    const game = games.get(decodeURIComponent(leaderboardMatch[1]));
    if (!game) throw Object.assign(new Error("未知游戏"), { status: 404 });
    if (req.method === "GET" && !leaderboardMatch[2]) {
      return sendJson(res, 200, {
        game: publicLeaderboard(game),
        rows: leaderboards.list(game, url.searchParams.get("limit")),
      });
    }
    if (req.method === "POST" && leaderboardMatch[2]) {
      return sendJson(res, 200, leaderboards.submit(game, requireUser(req), await readJson(req)));
    }
  }

  const gameApiMatch = url.pathname.match(/^\/api\/games\/([^/]+)(\/.*)?$/);
  if (gameApiMatch) {
    const game = games.get(decodeURIComponent(gameApiMatch[1]));
    if (!game?.backend.handleHttp) throw Object.assign(new Error("游戏接口不存在"), { status: 404 });
    return game.backend.handleHttp({
      req,
      res,
      path: gameApiMatch[2] || "/",
      url,
      readJson,
      sendJson,
      user: () => requireUser(req),
    });
  }

  throw Object.assign(new Error("接口不存在"), { status: 404 });
}

function serveStatic(req, res, url) {
  const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.resolve(ROOT, `.${requested}`);
  if (!filePath.startsWith(`${ROOT}${path.sep}`) || filePath.startsWith(path.join(ROOT, "server"))) {
    return sendJson(res, 403, { error: "Forbidden" });
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return sendJson(res, 404, { error: "Not found" });
  }
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
  };
  res.writeHead(200, { "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) await api(req, res, url);
    else serveStatic(req, res, url);
  } catch (error) {
    if (!res.headersSent) sendJson(res, error.status || 500, { error: error.message || "Server error" });
  }
});

function authenticateUpgrade(req, url) {
  req.headers.authorization = `Bearer ${url.searchParams.get("token") || ""}`;
  return auth.userFromRequest(req);
}

attachChat(server, authenticateUpgrade);

for (const game of games.values()) {
  if (!game.backend.handleWebSocket) continue;
  const wss = new WebSocketServer({ noServer: true });
  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname !== `/ws/games/${game.manifest.id}`) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      game.backend.handleWebSocket(ws, { req, url, user: authenticateUpgrade(req, url) });
    });
  });
}

server.listen(PORT, () => {
  console.log(`Gagaga platform: http://localhost:${PORT}`);
  console.log(`Loaded games: ${[...games.keys()].join(", ")}`);
});
