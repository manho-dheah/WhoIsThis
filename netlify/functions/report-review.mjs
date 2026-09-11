import { json, parseBody, verifySession, deviceHash, cleanText, integerId } from './_utils.mjs';
import { db } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event, 'student')) return json(401, { error: 'غير مصرح' });
  const body = parseBody(event);
  const reviewId = integerId(body.review_id);
  const reason = cleanText(body.reason, 400);
  if (!reviewId || reason.length < 2 || !body.device_id) return json(400, { error: 'بيانات البلاغ غير مكتملة.' });

  const supabase = db();
  const hash = deviceHash(body.device_id);
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await supabase.from('reports').select('id', { count: 'exact', head: true })
    .eq('reporter_hash', hash).gte('created_at', since);
  if ((count || 0) >= 5) return json(429, { error: 'تم إرسال عدة بلاغات خلال وقت قصير. حاولي لاحقًا.' });

  const { error } = await supabase.from('reports').insert({
    review_id: reviewId,
    reason,
    reporter_hash: hash,
    status: 'open',
  });
  if (error?.code === '23505') return json(409, { error: 'سبق أن أرسلتِ بلاغًا عن هذا التقييم.' });
  if (error) return json(500, { error: 'تعذر إرسال البلاغ.' });
  return json(201, { ok: true });
}
