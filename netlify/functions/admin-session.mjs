import { json, verifySession } from './_utils.mjs';
export async function handler(event) {
  return json(200, { authenticated: verifySession(event, 'admin') });
}
