import { json, parseBody, verifySession, integerId } from './_utils.mjs';
import { db } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event, 'admin')) return json(401, { error: 'غير مصرح' });
  const body = parseBody(event);
  const id = integerId(body.report_id);
  const status = body.status;
  if (!id || !['open', 'resolved'].includes(status)) return json(400, { error: 'طلب غير صالح.' });
  const { error } = await db().from('reports').update({
    status,
    resolved_at: status === 'resolved' ? new Date().toISOString() : null,
  }).eq('id', id);
  if (error) return json(500, { error: 'تعذر تحديث البلاغ.' });
  return json(200, { ok: true });
}
