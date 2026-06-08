const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { after, before, test } = require("node:test");
const WebSocket = require("ws");

const serverDir = path.resolve(__dirname, "..");
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "gagaga-friends-"));
const dataFile = path.join(dataDir, "db.json");
const port = 18_000 + (process.pid % 1_000);
const baseUrl = `http://127.0.0.1:${port}`;
let child;
let alpha;
let beta;

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/games`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Test server did not start");
}

async function request(pathname, options = {}, token) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const body = await response.json();
  return { response, body };
}

async function register(username) {
  const result = await request("/api/register", {
    method: "POST",
    body: JSON.stringify({ username, password: "secret123" }),
  });
  assert.equal(result.response.status, 201);
  return result.body;
}

function connectPresence(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/presence?token=${token}`);
    const timeout = setTimeout(() => reject(new Error("Presence connection timed out")), 3000);
    ws.once("message", (raw) => {
      clearTimeout(timeout);
      resolve({ ws, packet: JSON.parse(raw) });
    });
    ws.once("error", reject);
  });
}

function waitForPacket(ws, predicate) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Presence packet timed out")), 3000);
    function onMessage(raw) {
      const packet = JSON.parse(raw);
      if (!predicate(packet)) return;
      clearTimeout(timeout);
      ws.off("message", onMessage);
      resolve(packet);
    }
    ws.on("message", onMessage);
  });
}

before(async () => {
  child = spawn(process.execPath, ["index.js"], {
    cwd: serverDir,
    env: {
      ...process.env,
      PORT: String(port),
      GAGAGA_DATA_FILE: dataFile,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForServer();
  alpha = await register("AlphaUser");
  beta = await register("BetaUser");
});

after(() => {
  if (child && !child.killed) child.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test("friend endpoints require authentication", async () => {
  for (const pathname of ["/api/friends", "/api/friend-requests", "/api/users/search?q=alpha"]) {
    const result = await request(pathname);
    assert.equal(result.response.status, 401);
  }
});

test("search, request, accept, list, and delete friendship", async () => {
  const search = await request("/api/users/search?q=beta", {}, alpha.token);
  assert.equal(search.response.status, 200);
  assert.equal(search.body.items[0].username, "BetaUser");
  assert.equal(search.body.items[0].relation, "none");

  const selfSearch = await request("/api/users/search?q=alphauser", {}, alpha.token);
  assert.equal(selfSearch.body.items[0].relation, "self");
  const noResults = await request("/api/users/search?q=nobody-has-this-name", {}, alpha.token);
  assert.equal(noResults.body.total, 0);

  const created = await request("/api/friend-requests", {
    method: "POST",
    body: JSON.stringify({ userId: beta.user.id }),
  }, alpha.token);
  assert.equal(created.response.status, 201);

  const duplicate = await request("/api/friend-requests", {
    method: "POST",
    body: JSON.stringify({ userId: beta.user.id }),
  }, alpha.token);
  assert.equal(duplicate.response.status, 409);

  const reverse = await request("/api/friend-requests", {
    method: "POST",
    body: JSON.stringify({ userId: alpha.user.id }),
  }, beta.token);
  assert.equal(reverse.response.status, 409);

  const requests = await request("/api/friend-requests", {}, beta.token);
  assert.equal(requests.body.incoming.length, 1);
  assert.equal(requests.body.incoming[0].user.username, "AlphaUser");

  const forbiddenAccept = await request(`/api/friend-requests/${created.body.request.id}/accept`, {
    method: "POST",
  }, alpha.token);
  assert.equal(forbiddenAccept.response.status, 403);

  const accepted = await request(`/api/friend-requests/${created.body.request.id}/accept`, {
    method: "POST",
  }, beta.token);
  assert.equal(accepted.response.status, 200);

  const list = await request("/api/friends?page=1&pageSize=10", {}, alpha.token);
  assert.equal(list.body.total, 1);
  assert.equal(list.body.items[0].username, "BetaUser");

  const repeated = await request("/api/friend-requests", {
    method: "POST",
    body: JSON.stringify({ userId: beta.user.id }),
  }, alpha.token);
  assert.equal(repeated.response.status, 409);

  const removed = await request(`/api/friends/${beta.user.id}`, { method: "DELETE" }, alpha.token);
  assert.equal(removed.response.status, 200);

  const empty = await request("/api/friends", {}, beta.token);
  assert.equal(empty.body.total, 0);

  const rejectable = await request("/api/friend-requests", {
    method: "POST",
    body: JSON.stringify({ userId: alpha.user.id }),
  }, beta.token);
  const rejected = await request(`/api/friend-requests/${rejectable.body.request.id}/reject`, {
    method: "POST",
  }, alpha.token);
  assert.equal(rejected.response.status, 200);
  const retry = await request("/api/friend-requests", {
    method: "POST",
    body: JSON.stringify({ userId: alpha.user.id }),
  }, beta.token);
  assert.equal(retry.response.status, 201);
  await request(`/api/friend-requests/${retry.body.request.id}/reject`, {
    method: "POST",
  }, alpha.token);
});

test("presence broadcasts online and logout states to friends", async () => {
  const created = await request("/api/friend-requests", {
    method: "POST",
    body: JSON.stringify({ userId: beta.user.id }),
  }, alpha.token);
  await request(`/api/friend-requests/${created.body.request.id}/accept`, {
    method: "POST",
  }, beta.token);

  const alphaPresence = await connectPresence(alpha.token);
  assert.equal(alphaPresence.packet.type, "presence_ready");
  const alphaReady = alphaPresence.packet;
  assert.equal(alphaReady.statuses[0].online, false);

  const onlinePacketPromise = waitForPacket(
    alphaPresence.ws,
    (packet) => packet.type === "presence" && packet.userId === beta.user.id && packet.online,
  );
  const betaPresence = await connectPresence(beta.token);
  await onlinePacketPromise;
  const betaSecondTab = await connectPresence(beta.token);
  betaPresence.ws.close();
  await new Promise((resolve) => setTimeout(resolve, 30));
  const stillOnline = await request("/api/friends", {}, alpha.token);
  assert.equal(stillOnline.body.items[0].online, true);

  const offlinePacketPromise = waitForPacket(
    alphaPresence.ws,
    (packet) => packet.type === "presence" && packet.userId === beta.user.id && !packet.online,
  );
  const logout = await request("/api/logout", { method: "POST" }, beta.token);
  assert.equal(logout.response.status, 200);
  await offlinePacketPromise;

  alphaPresence.ws.close();
  betaSecondTab.ws.close();
});
