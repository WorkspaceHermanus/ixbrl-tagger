const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const cookie = require('cookie');
const db = require('./db');

const COOKIE_NAME = 'mcg_session';
const SESSION_DAYS = 30;

function hashPassword(pw) {
  return bcrypt.hash(pw, 10);
}
function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

function sign(sessionId) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  const mac = crypto.createHmac('sha256', secret).update(sessionId).digest('base64url');
  return `${sessionId}.${mac}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const idx = token.lastIndexOf('.');
  const sessionId = token.slice(0, idx);
  const mac = token.slice(idx + 1);
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  const expected = crypto.createHmac('sha256', secret).update(sessionId).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return sessionId;
}

async function createSession(userId, accountId) {
  const sessionId = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.query(
    'INSERT INTO sessions (id, user_id, account_id, expires_at) VALUES ($1,$2,$3,$4)',
    [sessionId, userId, accountId, expiresAt]
  );
  return sign(sessionId);
}

async function resolveSession(req) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const parsed = cookie.parse(raw);
  const token = parsed[COOKIE_NAME];
  if (!token) return null;
  const sessionId = verifyToken(token);
  if (!sessionId) return null;
  const { rows } = await db.query(
    'SELECT user_id, account_id, expires_at FROM sessions WHERE id = $1',
    [sessionId]
  );
  const row = rows[0];
  if (!row || new Date(row.expires_at) < new Date()) return null;
  return { sessionId, userId: row.user_id, accountId: row.account_id };
}

async function destroySession(req) {
  const raw = req.headers.cookie;
  if (!raw) return;
  const parsed = cookie.parse(raw);
  const token = parsed[COOKIE_NAME];
  if (!token) return;
  const sessionId = verifyToken(token);
  if (sessionId) await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
}

function setSessionCookie(res, signedToken) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  }));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  }));
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  resolveSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
};
