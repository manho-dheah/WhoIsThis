import { json, parseBody, verifySession, deviceHash, cleanText, cleanSingleLine, rating, integerId } from './_utils.mjs';
import { db } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event, 'student')) return json(401, { error: 'غير مصرح' });

  const body = parseBody(event);
  const professorId = integerId(body.professor_id);
  const academicTerm = cleanSingleLine(body.academic_term, 30);
  const courseName = cleanSingleLine(body.course_name, 120);
  const comment = cleanText(body.comment, 1200);
  const ratings = {
    clarity: rating(body.clarity),
    fairness: rating(body.fairness),
    organization: rating(body.organization),
    interaction: rating(body.interaction),
    difficulty: rating(body.difficulty),
    overall_rating: rating(body.overall_rating),
  };

  if (!professorId || !academicTerm || !courseName || Object.values(ratings).some((x) => x === null)) {
    return json(400, { error: 'أكملي جميع الحقول المطلوبة.' });
  }
  if (!body.device_id || String(body.device_id).length < 10) return json(400, { error: 'تعذر التحقق من الجهاز.' });

  const contactPattern = /(https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\d\s-]{7,}\d))/i;
  if (comment && contactPattern.test(comment)) {
    return json(400, { error: 'التعليق يحتوي على رابط أو بيانات تواصل. احذفيها ثم أعيدي الإرسال.' });
  }

  const supabase = db();
  const hash = deviceHash(body.device_id);

  const { data: professor, error: pError } = await supabase.from('professors')
    .select('id').eq('id', professorId).eq('is_active', true).single();
  if (pError || !professor) return json(404, { error: 'عضو هيئة التدريس غير متاح للتقييم.' });

  // Simple server-side anti-spam guard: no more than 3 reviews from one device in 10 minutes.
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase.from('reviews')
    .select('id', { count: 'exact', head: true }).eq('device_hash', hash).gte('created_at', since);
  if (countError) return json(500, { error: 'تعذر التحقق من معدل الإرسال.' });
  if ((count || 0) >= 3) return json(429, { error: 'تم إرسال عدة تقييمات خلال وقت قصير. حاولي مرة أخرى بعد قليل.' });

  const { error } = await supabase.from('reviews').insert({
    professor_id: professorId,
    academic_term: academicTerm,
    course_name: courseName,
    ...ratings,
    comment,
    device_hash: hash,
    status: 'published',
  });

  if (error?.code === '23505') return json(409, { error: 'سبق أن أُرسل تقييم لهذا العضو من هذا الجهاز في هذا الفصل.' });
  if (error) return json(500, { error: 'تعذر حفظ التقييم.' });
  return json(201, { ok: true });
}
