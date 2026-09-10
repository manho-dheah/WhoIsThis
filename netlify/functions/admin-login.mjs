import { json, parseBody, makeSession, cookieHeader, safePasswordMatch } from './_utils.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const { password } = parseBody(event);
  if (!process.env.ADMIN_PASSWORD) return json(500, { error: 'Server is not configured' });
  if (!safePasswordMatch(password, process.env.ADMIN_PASSWORD)) return json(401, { error: 'كلمة مرور الإدارة غير صحيحة' });
  const token = makeSession('admin', 60 * 60 * 12);
  return json(200, { ok: true }, { 'Set-Cookie': cookieHeader('admin_session', token, event, 60 * 60 * 12) });
}
