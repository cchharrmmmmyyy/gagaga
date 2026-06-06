const crypto = require("crypto");
const store = require("./store");

const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return {
    algorithm: "scrypt",
    salt,
    hash: crypto.scryptSync(password, salt, 32).toString("hex"),
  };
}

function verifyPassword(password, saved) {
  if (!saved?.salt || !saved?.hash) return false;
  const candidates = saved.algorithm === "scrypt"
    ? [hashPassword(password, saved.salt).hash]
    : [
        crypto.scryptSync(password, saved.salt, 32).toString("hex"),
        crypto.createHash("sha256").update(password + saved.salt).digest("hex"),
        crypto.createHash("sha256").update(saved.salt + password).digest("hex"),
        crypto.pbkdf2Sync(password, saved.salt, 100000, 32, "sha256").toString("hex"),
        crypto.pbkdf2Sync(password, saved.salt, 120000, 32, "sha256").toString("hex"),
      ];
  const expected = Buffer.from(saved.hash, "hex");
  return candidates.some((candidate) => {
    const actual = Buffer.from(candidate, "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  });
}

function publicUser(user) {
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}

function createSession(userId) {
  const now = Date.now();
  const session = {
    token: crypto.randomBytes(32).toString("hex"),
    userId,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  };
  store.update((db) => db.sessions.push(session));
  return session.token;
}

function userFromRequest(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const now = Date.now();
  const db = store.read();
  const session = db.sessions.find((item) => item.token === token && item.expiresAt > now);
  return session ? db.users.find((user) => user.id === session.userId) || null : null;
}

function register(username, password) {
  username = String(username || "").trim();
  password = String(password || "");
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]{3,20}$/.test(username)) {
    throw Object.assign(new Error("用户名必须为 3-20 位中文、字母、数字或下划线"), { status: 400 });
  }
  if (password.length < 6 || password.length > 72) {
    throw Object.assign(new Error("密码必须为 6-72 位"), { status: 400 });
  }
  if (store.read().users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    throw Object.assign(new Error("用户名已存在"), { status: 409 });
  }

  const user = { id: id("user"), username, passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
  store.update((db) => db.users.push(user));
  return { user: publicUser(user), token: createSession(user.id) };
}

function login(username, password) {
  const user = store.read().users.find(
    (item) => item.username.toLowerCase() === String(username || "").trim().toLowerCase(),
  );
  if (!user || !verifyPassword(String(password || ""), user.passwordHash)) {
    throw Object.assign(new Error("用户名或密码错误"), { status: 401 });
  }
  if (!user.passwordHash.algorithm) {
    store.update(() => {
      user.passwordHash = hashPassword(String(password || ""));
    });
  }
  return { user: publicUser(user), token: createSession(user.id) };
}

function logout(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (token) store.update((db) => {
    db.sessions = db.sessions.filter((session) => session.token !== token);
  });
}

module.exports = { login, logout, publicUser, register, userFromRequest };
