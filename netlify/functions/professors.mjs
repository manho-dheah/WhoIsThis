import { json, verifySession } from './_utils.mjs';
import { db } from './_db.mjs';

export async function handler(event) {
  if (!verifySession(event, 'student')) return json(401, { error: 'Unauthorized' });
  const supabase = db();
  const { data, error } = await supabase
    .from('professors')
    .select('id,name,department')
    .order('name', { ascending: true });
  if (error) return json(500, { error: error.message });

  const { data: reviews, error: rError } = await supabase
    .from('reviews')
    .select('professor_id,overall_rating')
    .eq('status', 'published');
  if (rError) return json(500, { error: rError.message });

  const stats = new Map();
  for (const r of reviews || []) {
    const s = stats.get(r.professor_id) || { sum: 0, count: 0 };
    s.sum += r.overall_rating;
    s.count += 1;
    stats.set(r.professor_id, s);
  }
  const result = (data || []).map((p) => {
    const s = stats.get(p.id) || { sum: 0, count: 0 };
    return { ...p, review_count: s.count, average_rating: s.count ? +(s.sum / s.count).toFixed(1) : null };
  });
  return json(200, { professors: result });
}
