import crypto from 'node:crypto';

export function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

export function parseBody(event) {
  try { return JSON.parse(event.body || '{}'); } catch { return {}; }
}

export function getCookie(event, name) {
  const raw = event.headers?.cookie || event.headers?.Cookie || '';
  const parts = raw.split(';').map((s) => s.trim());
  const found = parts.find((p) => p.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function b64url(input) { return Buffer.from(input).toString('base64url'); }

export function makeSession(role, ttlSeconds = 60 * 60 * 24 * 7) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is missing');
  const payload = b64url(JSON.stringify({ role, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySession(event, expectedRole) {
  const secret = process.env.SESSION_SECRET;
  const token = getCookie(event, expectedRole === 'admin' ? 'admin_session' : 'student_session');
  if (!secret || !token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return parsed.role === expectedRole && parsed.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

export function cookieHeader(name, value, event, maxAge = 60 * 60 * 24 * 7) {
  const host = event.headers?.host || '';
  const secure = !host.includes('localhost') && !host.includes('127.0.0.1');
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

export function clearCookie(name, event) {
  const host = event.headers?.host || '';
  const secure = !host.includes('localhost') && !host.includes('127.0.0.1');
  return `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function safePasswordMatch(value, expected) {
  if (typeof value !== 'string' || typeof expected !== 'string') return false;
  const a = crypto.createHash('sha256').update(value).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export function deviceHash(deviceId) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || !deviceId) throw new Error('Missing device id or secret');
  return crypto.createHmac('sha256', secret).update(String(deviceId)).digest('hex');
}

export function cleanText(value, max = 1200) {
  return String(value ?? '').trim().slice(0, max);
}

export function cleanSingleLine(value, max = 120) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function rating(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

export function integerId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
