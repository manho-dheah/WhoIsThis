import { json, parseBody, verifySession, cleanText } from './_utils.mjs';
import { db } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event, 'admin')) return json(401, { error: 'Unauthorized' });
  const body = parseBody(event);
  const name = cleanText(body.name, 120);
  const department = cleanText(body.department, 120);
  if (!name || !department) return json(400, { error: 'الاسم والقسم مطلوبان' });
  const supabase = db();
  const { data, error } = await supabase.from('professors').insert({ name, department }).select('id,name,department').single();
  if (error) return json(500, { error: error.message });
  return json(201, { professor: data });
}
