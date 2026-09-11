import { json, parseBody, verifySession, integerId } from './_utils.mjs';
import { db } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event, 'admin')) return json(401, { error: 'غير مصرح' });
  const id = integerId(parseBody(event).review_id);
  if (!id) return json(400, { error: 'طلب غير صالح.' });
  const { error } = await db().from('reviews').delete().eq('id', id);
  if (error) return json(500, { error: 'تعذر حذف التقييم.' });
  return json(200, { ok: true });
}
