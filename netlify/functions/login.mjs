import { json, parseBody, makeSession, cookieHeader, safePasswordMatch } from './_utils.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const { password } = parseBody(event);
  if (!process.env.STUDENT_ACCESS_PASSWORD) return json(500, { error: 'Server is not configured' });
  if (!safePasswordMatch(password, process.env.STUDENT_ACCESS_PASSWORD)) {
    return json(401, { error: 'كلمة الدخول غير صحيحة' });
  }
  const token = makeSession('student');
  return json(200, { ok: true }, { 'Set-Cookie': cookieHeader('student_session', token, event) });
}
