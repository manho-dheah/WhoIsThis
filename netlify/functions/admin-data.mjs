import { json, verifySession } from './_utils.mjs';
import { db } from './_db.mjs';
import { fetchAll } from './_pagination.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event, 'admin')) return json(401, { error: 'غير مصرح' });
  const supabase = db();

  const [p, r, rp] = await Promise.all([
    fetchAll(() => supabase.from('professors').select('id,name,department,is_active,created_at').order('name')),
    fetchAll(() => supabase.from('reviews').select('id,professor_id,academic_term,course_name,clarity,fairness,organization,interaction,difficulty,overall_rating,comment,status,created_at').order('created_at', { ascending: false })),
    fetchAll(() => supabase.from('reports').select('id,review_id,reason,status,resolved_at,created_at').order('created_at', { ascending: false })),
  ]);
  const error = p.error || r.error || rp.error;
  if (error) return json(500, { error: error.message });
  return json(200, { professors: p.data || [], reviews: r.data || [], reports: rp.data || [] });
}
