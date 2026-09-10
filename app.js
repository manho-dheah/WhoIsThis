const state = { professors: [], selectedProfessor: null };
const grid = document.getElementById('professorGrid');
const searchInput = document.getElementById('searchInput');
const countLabel = document.getElementById('countLabel');
const emptyState = document.getElementById('emptyState');

function escapeHtml(value='') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
}
function deviceId() {
  let id = localStorage.getItem('faculty_rating_device_id');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    localStorage.setItem('faculty_rating_device_id', id);
  }
  return id;
}
async function api(path, options={}) {
  const res = await fetch(path, { credentials: 'include', ...options, headers: {'Content-Type':'application/json', ...(options.headers||{})} });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) { location.replace('/'); throw new Error('انتهت جلسة الدخول'); }
  if (!res.ok) throw new Error(data.error || 'حدث خطأ');
  return data;
}

function renderProfessors(list) {
  countLabel.textContent = `${list.length} عضو`;
  emptyState.classList.toggle('hidden', list.length !== 0);
  grid.innerHTML = list.map(p => `
    <article class="professor-card">
      <div>
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(p.department)}</p>
      </div>
      <div class="card-footer">
        <div class="rating-badge">
          <strong>${p.average_rating ?? '—'}</strong>
          <span>${p.review_count ? `${p.review_count} تقييم` : 'لا تقييمات بعد'}</span>
        </div>
        <div>
          <button class="small-btn" data-profile="${p.id}">التجارب</button>
          <button class="small-btn" data-review="${p.id}">قيّم</button>
        </div>
      </div>
    </article>
  `).join('');
}

async function loadProfessors() {
  const data = await api('/api/professors');
  state.professors = data.professors || [];
  renderProfessors(state.professors);
}

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  renderProfessors(state.professors.filter(p => `${p.name} ${p.department}`.toLowerCase().includes(q)));
});

grid.addEventListener('click', async e => {
  const profileBtn = e.target.closest('[data-profile]');
  const reviewBtn = e.target.closest('[data-review]');
  if (profileBtn) await openProfessor(Number(profileBtn.dataset.profile));
  if (reviewBtn) openReview(Number(reviewBtn.dataset.review));
});

async function openProfessor(id) {
  const dialog = document.getElementById('professorDialog');
  const content = document.getElementById('professorContent');
  content.innerHTML = '<p class="muted">جاري تحميل التجارب…</p>';
  dialog.showModal();
  try {
    const data = await api(`/api/professor?id=${id}`);
    state.selectedProfessor = data.professor;
    const s = data.stats;
    const stats = [
      ['التقييم العام', s.overall], ['وضوح الشرح', s.clarity], ['العدالة', s.fairness], ['التنظيم', s.organization], ['الصعوبة', s.difficulty]
    ];
    content.innerHTML = `
      <div class="prof-profile-head">
        <span class="mini-label">${escapeHtml(data.professor.department)}</span>
        <h2>${escapeHtml(data.professor.name)}</h2>
        <button class="primary-btn" data-review-from-profile="${data.professor.id}">أضف تقييمك</button>
      </div>
      <div class="stats-grid">${stats.map(([label,val]) => `<div class="stat"><strong>${val ?? '—'}</strong><span>${label}</span></div>`).join('')}</div>
      <div class="section-head compact"><h3>تجارب الطلاب</h3><span class="count-pill">${s.count} تقييم</span></div>
      <div class="reviews-stack">
        ${data.reviews.length ? data.reviews.map(r => `
          <article class="review-card">
            <div class="review-meta">
              <span>${escapeHtml(r.course_name)}</span><span>${escapeHtml(r.academic_term)}</span><span>التقييم العام ${r.overall_rating}/5</span>
            </div>
            ${r.comment ? `<p>${escapeHtml(r.comment)}</p>` : '<p class="muted">تقييم رقمي بدون تعليق.</p>'}
            <div class="review-actions"><button class="small-btn" data-report="${r.id}">إبلاغ</button></div>
          </article>`).join('') : '<div class="empty-state">لا توجد تجارب بعد. كن أول من يضيف تقييمًا.</div>'}
      </div>`;
  } catch (err) { content.innerHTML = `<p class="form-message error">${escapeHtml(err.message)}</p>`; }
}

document.getElementById('professorDialog').addEventListener('click', async e => {
  const reviewBtn = e.target.closest('[data-review-from-profile]');
  const reportBtn = e.target.closest('[data-report]');
  if (reviewBtn) {
    document.getElementById('professorDialog').close();
    openReview(Number(reviewBtn.dataset.reviewFromProfile));
  }
  if (reportBtn) {
    const reason = prompt('ما سبب البلاغ؟ اكتب وصفًا مختصرًا.');
    if (!reason?.trim()) return;
    try { await api('/api/report-review', { method:'POST', body: JSON.stringify({ review_id: Number(reportBtn.dataset.report), reason }) }); alert('تم إرسال البلاغ للإدارة.'); }
    catch (err) { alert(err.message); }
  }
});

function openReview(id) {
  const p = state.professors.find(x => x.id === id) || state.selectedProfessor;
  document.getElementById('reviewProfessorId').value = id;
  document.getElementById('reviewTitle').textContent = p ? `تقييم ${p.name}` : 'إضافة تقييم';
  document.getElementById('reviewMessage').textContent = '';
  document.getElementById('reviewDialog').showModal();
}

document.getElementById('reviewForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.currentTarget.querySelector('button[type="submit"]');
  const msg = document.getElementById('reviewMessage');
  btn.disabled = true; msg.textContent = 'جاري الإرسال…'; msg.className = 'form-message';
  const payload = {
    professor_id: Number(document.getElementById('reviewProfessorId').value),
    academic_term: document.getElementById('academicTerm').value,
    course_name: document.getElementById('courseName').value,
    clarity: Number(document.getElementById('clarity').value),
    fairness: Number(document.getElementById('fairness').value),
    organization: Number(document.getElementById('organization').value),
    difficulty: Number(document.getElementById('difficulty').value),
    overall_rating: Number(document.getElementById('overallRating').value),
    comment: document.getElementById('comment').value,
    device_id: deviceId(),
  };
  try {
    await api('/api/submit-review', { method:'POST', body: JSON.stringify(payload) });
    msg.textContent = 'تم حفظ تقييمك بنجاح ✓';
    e.currentTarget.reset();
    await loadProfessors();
    setTimeout(() => document.getElementById('reviewDialog').close(), 700);
  } catch (err) { msg.textContent = err.message; msg.className = 'form-message error'; }
  finally { btn.disabled = false; }
});

document.getElementById('guidelinesBtn').addEventListener('click', () => document.getElementById('guidelinesDialog').showModal());
document.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => document.getElementById(btn.dataset.close).close()));
document.getElementById('logoutBtn').addEventListener('click', async () => { await fetch('/api/logout', {credentials:'include'}); location.replace('/'); });

(async function init(){
  try {
    const s = await fetch('/api/session', {credentials:'include'}).then(r => r.json());
    if (!s.authenticated) return location.replace('/');
    deviceId();
    await loadProfessors();
  } catch { location.replace('/'); }
})();
