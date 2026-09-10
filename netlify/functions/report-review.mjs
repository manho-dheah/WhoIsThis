import { json, parseBody, verifySession, cleanText } from './_utils.mjs';
import { db } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event, 'student')) return json(401, { error: 'Unauthorized' });
  const body = parseBody(event);
  const reviewId = Number(body.review_id);
  const reason = cleanText(body.reason, 400);
  if (!Number.isInteger(reviewId) || !reason) return json(400, { error: 'بيانات البلاغ غير مكتملة' });
  const supabase = db();
  const { error } = await supabase.from('reports').insert({ review_id: reviewId, reason });
  if (error) return json(500, { error: error.message });
  return json(201, { ok: true });
}
