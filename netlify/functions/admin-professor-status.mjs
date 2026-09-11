import { json, parseBody, verifySession, integerId } from './_utils.mjs';
import { db } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event, 'admin')) return json(401, { error: 'غير مصرح' });
  const body = parseBody(event);
  const id = integerId(body.id);
  if (!id || typeof body.is_active !== 'boolean') return json(400, { error: 'طلب غير صالح.' });
  const { error } = await db().from('professors').update({ is_active: body.is_active }).eq('id', id);
  if (error) return json(500, { error: 'تعذر تغيير الحالة.' });
  return json(200, { ok: true });
}
