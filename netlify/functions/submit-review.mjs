import { json, parseBody, verifySession, deviceHash, cleanText, rating } from './_utils.mjs';
import { db } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event, 'student')) return json(401, { error: 'Unauthorized' });

  const body = parseBody(event);
  const professorId = Number(body.professor_id);
  const academicTerm = cleanText(body.academic_term, 30);
  const courseName = cleanText(body.course_name, 120);
  const comment = cleanText(body.comment, 1200);
  const ratings = {
    clarity: rating(body.clarity),
    fairness: rating(body.fairness),
    organization: rating(body.organization),
    difficulty: rating(body.difficulty),
    overall_rating: rating(body.overall_rating),
  };

  if (!Number.isInteger(professorId) || !academicTerm || !courseName || Object.values(ratings).some((x) => x === null)) {
    return json(400, { error: 'أكملي جميع الحقول المطلوبة' });
  }
  if (!body.device_id || String(body.device_id).length < 10) return json(400, { error: 'Missing device identifier' });

  // Reduce accidental doxxing/contact sharing in public comments.
  const contactPattern = /(https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\d\s-]{7,}\d))/i;
  if (comment && contactPattern.test(comment)) {
    return json(400, { error: 'التعليق يحتوي على رابط أو بيانات تواصل. احذفها ثم أعد الإرسال.' });
  }

  const supabase = db();
  const { error } = await supabase.from('reviews').insert({
    professor_id: professorId,
    academic_term: academicTerm,
    course_name: courseName,
    ...ratings,
    comment,
    device_hash: deviceHash(body.device_id),
    status: 'published',
  });

  if (error) {
    if (error.code === '23505') return json(409, { error: 'سبق أن تم إرسال تقييم لهذا الدكتور من هذا الجهاز في هذا الفصل.' });
    return json(500, { error: error.message });
  }
  return json(201, { ok: true });
}
