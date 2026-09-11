import { json, verifySession, integerId } from './_utils.mjs';
import { db } from './_db.mjs';

function avg(rows, key) {
  const values = rows.map((r) => Number(r[key])).filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
  if (!values.length) return null;
  return +(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
}

export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event, 'student')) return json(401, { error: 'غير مصرح' });
  const id = integerId(event.queryStringParameters?.id);
  if (!id) return json(400, { error: 'معرّف غير صالح' });
  const supabase = db();

  const { data: professor, error: pError } = await supabase.from('professors')
    .select('id,name,department,is_active').eq('id', id).eq('is_active', true).single();
  if (pError) return json(404, { error: 'عضو هيئة التدريس غير موجود.' });

  const { data: reviews, error: rError } = await supabase.from('reviews')
    .select('id,academic_term,course_name,clarity,fairness,organization,interaction,difficulty,overall_rating,comment,created_at')
    .eq('professor_id', id).eq('status', 'published').order('created_at', { ascending: false });
  if (rError) return json(500, { error: rError.message });

  const rows = reviews || [];
  return json(200, {
    professor,
    stats: {
      count: rows.length,
      overall: avg(rows, 'overall_rating'),
      clarity: avg(rows, 'clarity'),
      fairness: avg(rows, 'fairness'),
      organization: avg(rows, 'organization'),
      interaction: avg(rows, 'interaction'),
      difficulty: avg(rows, 'difficulty'),
    },
    reviews: rows,
  });
}
