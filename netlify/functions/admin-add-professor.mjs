import { json, parseBody, verifySession, cleanSingleLine } from './_utils.mjs';
import { db } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event, 'admin')) return json(401, { error: 'غير مصرح' });
  const body = parseBody(event);
  const name = cleanSingleLine(body.name, 120);
  const department = cleanSingleLine(body.department, 120);
  if (name.length < 2 || department.length < 2) return json(400, { error: 'الاسم والقسم مطلوبان' });

  const { data, error } = await db().from('professors')
    .insert({ name, department, is_active: true })
    .select('id,name,department,is_active,created_at')
    .single();

  if (error?.code === '23505') return json(409, { error: 'عضو هيئة التدريس موجود بالفعل في هذا القسم.' });
  if (error) return json(500, { error: 'تعذر إضافة عضو هيئة التدريس.' });
  return json(201, { professor: data });
}
