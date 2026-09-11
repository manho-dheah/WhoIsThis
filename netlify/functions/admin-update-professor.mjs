import { json, parseBody, verifySession, cleanSingleLine, integerId } from './_utils.mjs';
import { db } from './_db.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!verifySession(event, 'admin')) return json(401, { error: 'غير مصرح' });
  const body = parseBody(event);
  const id = integerId(body.id);
  const name = cleanSingleLine(body.name, 120);
  const department = cleanSingleLine(body.department, 120);
  if (!id || name.length < 2 || department.length < 2) return json(400, { error: 'بيانات غير مكتملة.' });

  const { data, error } = await db().from('professors')
    .update({ name, department })
    .eq('id', id)
    .select('id,name,department,is_active')
    .single();

  if (error?.code === '23505') return json(409, { error: 'يوجد عضو آخر بالاسم والقسم نفسيهما.' });
  if (error) return json(500, { error: 'تعذر حفظ التعديل.' });
  return json(200, { professor: data });
}
