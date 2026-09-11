import { json, parseBody, verifySession, integerId } from './_utils.mjs';
import { db } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event, 'admin')) return json(401, { error: 'غير مصرح' });
  const id = integerId(parseBody(event).id);
  if (!id) return json(400, { error: 'طلب غير صالح.' });
  const supabase = db();
  const { count, error: countError } = await supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('professor_id', id);
  if (countError) return json(500, { error: 'تعذر التحقق من التقييمات.' });
  if ((count || 0) > 0) return json(409, { error: 'لا يمكن حذف عضو لديه تقييمات. استخدمي «إخفاء» بدلًا من الحذف للحفاظ على البيانات.' });
  const { error } = await supabase.from('professors').delete().eq('id', id);
  if (error) return json(500, { error: 'تعذر الحذف.' });
  return json(200, { ok: true });
}
