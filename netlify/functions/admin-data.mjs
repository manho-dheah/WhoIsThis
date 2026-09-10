import { json, verifySession } from './_utils.mjs';
import { db } from './_db.mjs';

export async function handler(event) {
  if (!verifySession(event, 'admin')) return json(401, { error: 'Unauthorized' });
  const supabase = db();
  const [{ data: professors, error: pError }, { data: reviews, error: rError }, { data: reports, error: rpError }] = await Promise.all([
    supabase.from('professors').select('id,name,department').order('name'),
    supabase.from('reviews').select('id,professor_id,academic_term,course_name,overall_rating,comment,status,created_at').order('created_at', { ascending: false }).limit(300),
    supabase.from('reports').select('id,review_id,reason,created_at').order('created_at', { ascending: false }).limit(300),
  ]);
  if (pError || rError || rpError) return json(500, { error: pError?.message || rError?.message || rpError?.message });
  return json(200, { professors, reviews, reports });
}
