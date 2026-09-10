import { json, verifySession } from './_utils.mjs';
import { db } from './_db.mjs';

function avg(rows, key) {
  if (!rows.length) return null;
  return +(rows.reduce((s, r) => s + Number(r[key] || 0), 0) / rows.length).toFixed(1);
}

export async function handler(event) {
  if (!verifySession(event, 'student')) return json(401, { error: 'Unauthorized' });
  const id = Number(event.queryStringParameters?.id);
  if (!Number.isInteger(id)) return json(400, { error: 'Invalid professor id' });
  const supabase = db();

  const { data: professor, error: pError } = await supabase
    .from('professors')
    .select('id,name,department')
    .eq('id', id)
    .single();
  if (pError) return json(404, { error: 'Professor not found' });

  const { data: reviews, error: rError } = await supabase
    .from('reviews')
    .select('id,academic_term,course_name,clarity,fairness,organization,difficulty,overall_rating,comment,created_at')
    .eq('professor_id', id)
    .eq('status', 'published')
    .order('created_at', { ascending: false });
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
      difficulty: avg(rows, 'difficulty'),
    },
    reviews: rows,
  });
}
