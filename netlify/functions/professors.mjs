import { json, verifySession } from './_utils.mjs';
import { db } from './_db.mjs';
import { fetchAll } from './_pagination.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event, 'student')) return json(401, { error: 'غير مصرح' });
  const supabase = db();

  const [{ data: professors, error: pError }, reviewResult] = await Promise.all([
    supabase.from('professors').select('id,name,department').eq('is_active', true).order('name'),
    fetchAll(() => supabase.from('reviews').select('professor_id,overall_rating,difficulty').eq('status', 'published')),
  ]);
  if (pError || reviewResult.error) return json(500, { error: pError?.message || reviewResult.error?.message });

  const stats = new Map();
  for (const review of reviewResult.data || []) {
    const current = stats.get(review.professor_id) || { sum: 0, difficulty: 0, count: 0 };
    current.sum += Number(review.overall_rating || 0);
    current.difficulty += Number(review.difficulty || 0);
    current.count += 1;
    stats.set(review.professor_id, current);
  }

  const result = (professors || []).map((professor) => {
    const s = stats.get(professor.id) || { sum: 0, difficulty: 0, count: 0 };
    return {
      ...professor,
      review_count: s.count,
      average_rating: s.count ? +(s.sum / s.count).toFixed(1) : null,
      average_difficulty: s.count ? +(s.difficulty / s.count).toFixed(1) : null,
    };
  });
  return json(200, { professors: result });
}
