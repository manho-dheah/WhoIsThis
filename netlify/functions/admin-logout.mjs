import { json, clearCookie } from './_utils.mjs';
export async function handler(event) {
  return json(200, { ok: true }, { 'Set-Cookie': clearCookie('admin_session', event) });
}
