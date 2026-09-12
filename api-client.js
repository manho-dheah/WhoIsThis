// Public configuration for the GitHub Pages frontend.
// This URL is safe to expose. Passwords and database secret keys live only in Supabase.
export const EDGE_API_URL = 'https://vjtwlbkjpfrtfjiwazdf.supabase.co/functions/v1/whoisthis-api';

const STUDENT_TOKEN_KEY = 'whoisthis_student_session_v1';
const ADMIN_TOKEN_KEY = 'whoisthis_admin_session_v1';

export function siteUrl(file = '') {
  const base = new URL('.', window.location.href);
  return new URL(file, base).href;
}

function tokenKey(role) {
  return role === 'admin' ? ADMIN_TOKEN_KEY : STUDENT_TOKEN_KEY;
}

export function getSessionToken(role = 'student') {
  const storage = role === 'admin' ? sessionStorage : localStorage;
  return storage.getItem(tokenKey(role));
}

export function setSessionToken(role, token) {
  const storage = role === 'admin' ? sessionStorage : localStorage;
  if (token) storage.setItem(tokenKey(role), token);
}

export function clearSessionToken(role = 'student') {
  const storage = role === 'admin' ? sessionStorage : localStorage;
  storage.removeItem(tokenKey(role));
}

export async function edgeApi(action, {
  role = 'student',
  method = 'GET',
  body,
  params = {},
  redirectOn401 = role === 'student',
} = {}) {
  const url = new URL(EDGE_API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });

  const headers = { 'Content-Type': 'application/json' };
  const token = getSessionToken(role);
  if (token) headers['X-WhoIsThis-Session'] = token;

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    clearSessionToken(role);
    if (redirectOn401) location.replace(siteUrl('index.html'));
  }

  if (!res.ok) throw new Error(data.error || 'حدث خطأ');

  if (action === 'login' && data.token) setSessionToken('student', data.token);
  if (action === 'admin-login' && data.token) setSessionToken('admin', data.token);
  return data;
}

export async function legacyApi(path, options = {}, role = 'student', redirectOn401 = role === 'student') {
  const parsed = new URL(path, 'https://local.invalid');
  const action = parsed.pathname.replace(/^\/api\//, '');
  const params = Object.fromEntries(parsed.searchParams.entries());
  return edgeApi(action, {
    role,
    method: options.method || 'GET',
    body: options.body,
    params,
    redirectOn401,
  });
}
