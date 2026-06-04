const crypto = require('crypto');

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function publicUser(user) {
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}

function validateUsername(username) {
  return typeof username === 'string' && /^[a-zA-Z0-9_\u4e00-\u9fa5]{3,20}$/.test(username.trim());
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 72;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

function safeEqual(a, b) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && crypto.timingSafeEqual(aBuffer, bBuffer);
}

function cleanExpiredSessions(db) {
  const now = Date.now();
  db.sessions = db.sessions.filter((session) => session.expiresAt > now);
}

function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions.push({
    token,
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  return token;
}

function register(db, input) {
  const username = String(input.username || '').trim();
  const password = input.password || '';
  if (!validateUsername(username)) return { status: 400, data: { error: 'Username must be 3-20 letters, numbers, underscores, or Chinese characters' } };
  if (!validatePassword(password)) return { status: 400, data: { error: 'Password must be 6-72 characters' } };
  if (db.users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    return { status: 409, data: { error: 'Username already exists' } };
  }

  const user = {
    id: randomId('user'),
    username,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  const token = createSession(db, user.id);
  return { status: 201, data: { user: publicUser(user), token } };
}

function login(db, input) {
  cleanExpiredSessions(db);
  const username = String(input.username || '').trim();
  const password = input.password || '';
  const user = db.users.find((item) => item.username.toLowerCase() === username.toLowerCase());
  if (!user || !validatePassword(password)) return { status: 401, data: { error: 'Invalid username or password' } };

  const attempt = hashPassword(password, user.passwordHash.salt);
  if (!safeEqual(attempt.hash, user.passwordHash.hash)) {
    return { status: 401, data: { error: 'Invalid username or password' } };
  }

  const token = createSession(db, user.id);
  return { status: 200, data: { user: publicUser(user), token } };
}

function getAuthUser(db, authHeader) {
  cleanExpiredSessions(db);
  const match = String(authHeader || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const session = db.sessions.find((item) => item.token === match[1] && item.expiresAt > Date.now());
  if (!session) return null;
  return db.users.find((user) => user.id === session.userId) || null;
}

function logout(db, authHeader) {
  const match = String(authHeader || '').match(/^Bearer\s+(.+)$/i);
  if (match) db.sessions = db.sessions.filter((session) => session.token !== match[1]);
  return { status: 200, data: { ok: true } };
}

module.exports = {
  getAuthUser,
  login,
  logout,
  publicUser,
  randomId,
  register,
};
