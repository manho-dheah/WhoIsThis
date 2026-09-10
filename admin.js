const loginCard = document.getElementById('adminLoginCard');
const dashboard = document.getElementById('adminDashboard');
const logoutBtn = document.getElementById('adminLogout');
let cache = { professors: [], reviews: [], reports: [] };

function esc(v='') { return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }
async function api(path, options={}) {
  const res = await fetch(path, { credentials:'include', ...options, headers:{'Content-Type':'application/json', ...(options.headers||{})} });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حدث خطأ');
  return data;
}
function professorName(id) { return cache.professors.find(p => p.id === id)?.name || `#${id}`; }

async function loadAdmin() {
  const data = await api('/api/admin-data');
  cache = data;
  document.getElementById('reviewsCount').textContent = data.reviews.length;
  document.getElementById('reportsCount').textContent = data.reports.length;
  const reviewMap = new Map(data.reviews.map(r => [r.id, r]));
  document.getElementById('reportsList').innerHTML = data.reports.length ? data.reports.map(r => {
    const review = reviewMap.get(r.review_id);
    return `<article class="admin-item"><div class="admin-item-top"><strong>بلاغ عن تقييم #${r.review_id}</strong><span class="status">${new Date(r.created_at).toLocaleDateString('ar-SA')}</span></div><p>${esc(r.reason)}</p>${review ? `<p class="muted">${esc(professorName(review.professor_id))}: ${esc(review.comment || 'بدون تعليق')}</p>` : ''}</article>`;
  }).join('') : '<p class="muted">لا توجد بلاغات.</p>';

  document.getElementById('reviewsList').innerHTML = data.reviews.length ? data.reviews.map(r => `
    <article class="admin-item">
      <div class="admin-item-top"><div><strong>${esc(professorName(r.professor_id))}</strong><p class="muted">${esc(r.course_name)} · ${esc(r.academic_term)} · ${r.overall_rating}/5</p></div><span class="status">${r.status === 'published' ? 'منشور' : 'مخفي'}</span></div>
      <p>${esc(r.comment || 'بدون تعليق')}</p>
      <div><button class="small-btn ${r.status === 'published' ? 'danger-btn' : ''}" data-review-status="${r.id}" data-next-status="${r.status === 'published' ? 'hidden' : 'published'}">${r.status === 'published' ? 'إخفاء' : 'إعادة النشر'}</button></div>
    </article>`).join('') : '<p class="muted">لا توجد تقييمات.</p>';
}

async function showDashboard() {
  loginCard.classList.add('hidden'); dashboard.classList.remove('hidden'); logoutBtn.classList.remove('hidden');
  await loadAdmin();
}

document.getElementById('adminLoginForm').addEventListener('submit', async e => {
  e.preventDefault(); const msg = document.getElementById('adminLoginMessage');
  try { await api('/api/admin-login', { method:'POST', body:JSON.stringify({password:document.getElementById('adminPassword').value}) }); await showDashboard(); }
  catch(err){ msg.textContent = err.message; msg.className='form-message error'; }
});

document.getElementById('addProfessorForm').addEventListener('submit', async e => {
  e.preventDefault(); const msg = document.getElementById('addProfessorMessage');
  try {
    await api('/api/admin-add-professor', {method:'POST', body:JSON.stringify({name:document.getElementById('profName').value, department:document.getElementById('profDepartment').value})});
    e.currentTarget.reset(); msg.textContent='تمت الإضافة ✓'; await loadAdmin();
  } catch(err){ msg.textContent=err.message; msg.className='form-message error'; }
});

document.getElementById('reviewsList').addEventListener('click', async e => {
  const btn = e.target.closest('[data-review-status]'); if (!btn) return;
  try { await api('/api/admin-review-status', {method:'POST', body:JSON.stringify({review_id:Number(btn.dataset.reviewStatus), status:btn.dataset.nextStatus})}); await loadAdmin(); }
  catch(err){ alert(err.message); }
});

document.getElementById('refreshAdmin').addEventListener('click', loadAdmin);
logoutBtn.addEventListener('click', async () => { await fetch('/api/admin-logout', {credentials:'include'}); location.reload(); });

(async () => {
  try {
    const s = await fetch('/api/admin-session', {credentials:'include'}).then(r => r.json());
    if (s.authenticated) await showDashboard();
  } catch {}
})();
