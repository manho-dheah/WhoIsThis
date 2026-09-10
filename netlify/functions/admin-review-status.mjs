import { json, parseBody, verifySession } from './_utils.mjs';
import { db } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event, 'admin')) return json(401, { error: 'Unauthorized' });
  const { review_id, status } = parseBody(event);
  const id = Number(review_id);
  if (!Number.isInteger(id) || !['published', 'hidden'].includes(status)) return json(400, { error: 'Invalid request' });
  const supabase = db();
  const { error } = await supabase.from('reviews').update({ status }).eq('id', id);
  if (error) return json(500, { error: error.message });
  return json(200, { ok: true });
}
