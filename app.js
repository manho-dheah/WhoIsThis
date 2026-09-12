import { legacyApi, edgeApi, clearSessionToken, siteUrl } from './api-client.js';

const state = {
  professors: [],
  selectedProfessor: null,
  search: '',
  department: '',
  sort: 'name',
};

const grid = document.getElementById('professorGrid');
const searchInput = document.getElementById('searchInput');
const departmentFilter = document.getElementById('departmentFilter');
const sortSelect = document.getElementById('sortSelect');
const countLabel = document.getElementById('countLabel');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const departmentChips = document.getElementById('departmentChips');
const heroProfessorCount = document.getElementById('heroProfessorCount');
const heroReviewCount = document.getElementById('heroReviewCount');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c]));
}

function deviceId() {
  let id = localStorage.getItem('faculty_rating_device_id');
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    localStorage.setItem('faculty_rating_device_id', id);
  }
  return id;
}

async function api(path, options = {}) {
  return legacyApi(path, options, 'student', true);
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add('hidden'), 2800);
}

function formatNumber(value) {
  return value === null || value === undefined ? '—' : Number(value).toFixed(1).replace('.0', '');
}

function ratingClass(value) {
  if (value === null || value === undefined) return 'empty-score';
  if (Number(value) >= 4) return 'rating-good';
  if (Number(value) >= 3) return 'rating-mid';
  return 'rating-low';
}

function applyFilters() {
  const q = state.search.trim().toLowerCase();
  let list = state.professors.filter((p) => {
    const matchesSearch = !q || `${p.name} ${p.department}`.toLowerCase().includes(q);
    const matchesDepartment = !state.department || p.department === state.department;
    return matchesSearch && matchesDepartment;
  });

  list = [...list].sort((a, b) => {
    if (state.sort === 'rating') return (b.average_rating ?? -1) - (a.average_rating ?? -1) || a.name.localeCompare(b.name, 'ar');
    if (state.sort === 'reviews') return (b.review_count || 0) - (a.review_count || 0) || a.name.localeCompare(b.name, 'ar');
    if (state.sort === 'difficulty') {
      const av = a.average_difficulty ?? 99;
      const bv = b.average_difficulty ?? 99;
      return av - bv || a.name.localeCompare(b.name, 'ar');
    }
    return a.name.localeCompare(b.name, 'ar');
  });

  renderProfessors(list);
  syncDepartmentChips();
}

function renderProfessors(list) {
  countLabel.textContent = `${list.length} عضو`;
  emptyState.classList.toggle('hidden', list.length !== 0);
  grid.innerHTML = list.map((p) => `
    <article class="professor-card">
      <div class="professor-card-head">
        <div>
          <h3>${escapeHtml(p.name)}</h3>
          <span class="department-badge">${escapeHtml(p.department)}</span>
        </div>
        <div class="score-circle ${ratingClass(p.average_rating)}" aria-label="متوسط التقييم ${formatNumber(p.average_rating)} من 5">
          <strong>${formatNumber(p.average_rating)}</strong><span>${p.average_rating === null ? 'جديد' : '★ / 5'}</span>
        </div>
      </div>
      <div class="professor-card-meta">
        <span>${p.review_count ? `${p.review_count} تجربة` : 'لا تجارب بعد'}</span>
        <span>${p.average_difficulty !== null ? `الصعوبة ${formatNumber(p.average_difficulty)}/5` : 'الصعوبة —'}</span>
      </div>
      <div class="card-actions">
        <button class="small-btn profile-primary" data-profile="${p.id}">اقرأ التجارب</button>
        <button class="small-btn" data-review="${p.id}">أضف تقييمك</button>
      </div>
    </article>
  `).join('');
}

function fillDepartments() {
  const departments = [...new Set(state.professors.map((p) => p.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
  departmentFilter.innerHTML = '<option value="">كل الأقسام</option>' + departments.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');

  const counts = new Map();
  state.professors.forEach((p) => counts.set(p.department, (counts.get(p.department) || 0) + 1));
  const featured = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar')).slice(0, 8);
  departmentChips.innerHTML = [
    '<button type="button" class="department-chip active" data-department-chip="">الكل</button>',
    ...featured.map(([name]) => `<button type="button" class="department-chip" data-department-chip="${escapeHtml(name)}">${escapeHtml(name)}</button>`),
  ].join('');
}

function syncDepartmentChips() {
  departmentChips.querySelectorAll('[data-department-chip]').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.departmentChip === state.department);
  });
}

function renderHeroStats() {
  heroProfessorCount.textContent = state.professors.length.toLocaleString('ar-SA');
  const totalReviews = state.professors.reduce((sum, p) => sum + Number(p.review_count || 0), 0);
  heroReviewCount.textContent = totalReviews.toLocaleString('ar-SA');
}

async function loadProfessors() {
  loadingState.classList.remove('hidden');
  grid.innerHTML = '';
  try {
    const data = await api('/api/professors');
    state.professors = data.professors || [];
    fillDepartments();
    renderHeroStats();
    applyFilters();
  } finally {
    loadingState.classList.add('hidden');
  }
}

searchInput.addEventListener('input', () => { state.search = searchInput.value; applyFilters(); });
departmentFilter.addEventListener('change', () => { state.department = departmentFilter.value; applyFilters(); });
sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; applyFilters(); });
departmentChips.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-department-chip]');
  if (!chip) return;
  state.department = chip.dataset.departmentChip;
  departmentFilter.value = state.department;
  applyFilters();
  document.getElementById('directory').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

grid.addEventListener('click', async (e) => {
  const profileBtn = e.target.closest('[data-profile]');
  const reviewBtn = e.target.closest('[data-review]');
  if (profileBtn) await openProfessor(Number(profileBtn.dataset.profile));
  if (reviewBtn) openReview(Number(reviewBtn.dataset.review));
});

function statCard(label, value) {
  return `<div class="stat"><strong>${formatNumber(value)}</strong><span>${label}</span></div>`;
}

async function openProfessor(id) {
  const dialog = document.getElementById('professorDialog');
  const content = document.getElementById('professorContent');
  content.innerHTML = '<div class="loading-inline">جاري تحميل التجارب…</div>';
  dialog.showModal();
  try {
    const data = await api(`/api/professor?id=${id}`);
    state.selectedProfessor = data.professor;
    const s = data.stats;
    const stats = [
      ['التقييم العام', s.overall],
      ['وضوح الشرح', s.clarity],
      ['عدالة التقييم', s.fairness],
      ['التنظيم', s.organization],
      ['التعامل', s.interaction],
      ['الصعوبة', s.difficulty],
    ];

    content.innerHTML = `
      <div class="prof-profile-head">
        <div>
          <span class="department-badge">${escapeHtml(data.professor.department)}</span>
          <h2>${escapeHtml(data.professor.name)}</h2>
          <div class="profile-score-wrap">
            <div class="profile-score-big"><strong>${formatNumber(s.overall)}</strong><span>★ من 5</span></div>
            <p class="muted">${s.count ? `بناءً على ${s.count} تجربة طلابية` : 'لا توجد تقييمات حتى الآن. يمكنك أن تكون أول من يضيف تجربة.'}</p>
          </div>
        </div>
        <button class="primary-btn" data-review-from-profile="${data.professor.id}">أضف تقييمك</button>
      </div>
      <div class="stats-grid six-stats">${stats.map(([label, value]) => statCard(label, value)).join('')}</div>
      <div class="section-head compact"><h3>تجارب الطلاب</h3><span class="count-pill">${s.count} تجربة</span></div>
      <div class="reviews-stack">
        ${data.reviews.length ? data.reviews.map((r) => `
          <article class="review-card">
            <div class="review-meta">
              <span>${escapeHtml(r.course_name)}</span>
              <span>${escapeHtml(r.academic_term)}</span>
              <span>العام ${r.overall_rating}/5</span>
              <span>الشرح ${r.clarity}/5</span>
              ${r.interaction ? `<span>التعامل ${r.interaction}/5</span>` : ''}
              <span>الصعوبة ${r.difficulty}/5</span>
            </div>
            ${r.comment ? `<p>${escapeHtml(r.comment)}</p>` : '<p class="muted">تقييم رقمي بدون تعليق.</p>'}
            <div class="review-actions"><button class="small-btn" data-report="${r.id}">إبلاغ</button></div>
          </article>`).join('') : '<div class="empty-state">لا توجد تجارب بعد. كن أول من يضيف تقييمًا.</div>'}
      </div>`;
  } catch (err) {
    content.innerHTML = `<p class="form-message error">${escapeHtml(err.message)}</p>`;
  }
}

document.getElementById('professorDialog').addEventListener('click', (e) => {
  const reviewBtn = e.target.closest('[data-review-from-profile]');
  const reportBtn = e.target.closest('[data-report]');
  if (reviewBtn) {
    document.getElementById('professorDialog').close();
    openReview(Number(reviewBtn.dataset.reviewFromProfile));
  }
  if (reportBtn) openReport(Number(reportBtn.dataset.report));
});

function setupRatingChoices() {
  document.querySelectorAll('.rating-choice').forEach((group) => {
    group.innerHTML = [1, 2, 3, 4, 5].map((n) => `<button type="button" class="rating-option" data-value="${n}" aria-label="${n} من 5" title="${n} من 5">★</button>`).join('');
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-value]');
      if (!btn) return;
      const input = document.getElementById(group.dataset.ratingGroup);
      input.value = btn.dataset.value;
      group.querySelectorAll('.rating-option').forEach((option) => option.classList.toggle('selected', Number(option.dataset.value) <= Number(btn.dataset.value)));
    });
  });
}

function resetRatings() {
  document.querySelectorAll('.rating-choice').forEach((group) => group.querySelectorAll('.rating-option').forEach((option) => option.classList.remove('selected')));
  ['clarity', 'fairness', 'organization', 'interaction', 'difficulty', 'overallRating'].forEach((id) => { document.getElementById(id).value = ''; });
}

function openReview(id) {
  const p = state.professors.find((x) => x.id === id) || state.selectedProfessor;
  const form = document.getElementById('reviewForm');
  form.reset();
  resetRatings();
  document.getElementById('reviewProfessorId').value = id;
  document.getElementById('reviewTitle').textContent = p ? `تقييم ${p.name}` : 'إضافة تقييم';
  document.getElementById('reviewMessage').textContent = '';
  document.getElementById('commentCount').textContent = '0 / 1200';
  document.getElementById('reviewDialog').showModal();
}

document.getElementById('comment').addEventListener('input', (e) => {
  document.getElementById('commentCount').textContent = `${e.target.value.length} / 1200`;
});

document.getElementById('reviewForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = form.querySelector('button[type="submit"]');
  const msg = document.getElementById('reviewMessage');
  const ratingIds = ['clarity', 'fairness', 'organization', 'interaction', 'difficulty', 'overallRating'];
  if (ratingIds.some((id) => !document.getElementById(id).value)) {
    msg.textContent = 'اختاري درجة لكل معيار قبل الإرسال.';
    msg.className = 'form-message error';
    return;
  }

  const payload = {
    professor_id: Number(document.getElementById('reviewProfessorId').value),
    academic_term: document.getElementById('academicTerm').value,
    course_name: document.getElementById('courseName').value,
    clarity: Number(document.getElementById('clarity').value),
    fairness: Number(document.getElementById('fairness').value),
    organization: Number(document.getElementById('organization').value),
    interaction: Number(document.getElementById('interaction').value),
    difficulty: Number(document.getElementById('difficulty').value),
    overall_rating: Number(document.getElementById('overallRating').value),
    comment: document.getElementById('comment').value,
    device_id: deviceId(),
  };

  btn.disabled = true;
  btn.textContent = 'جاري الإرسال…';
  msg.textContent = '';
  try {
    await api('/api/submit-review', { method: 'POST', body: JSON.stringify(payload) });
    showToast('تم حفظ تقييمك بنجاح ✓');
    form.reset();
    resetRatings();
    document.getElementById('reviewDialog').close();
    await loadProfessors();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'form-message error';
  } finally {
    btn.disabled = false;
    btn.textContent = 'إرسال التقييم';
  }
});

function openReport(reviewId) {
  document.getElementById('reportForm').reset();
  document.getElementById('reportReviewId').value = reviewId;
  document.getElementById('reportMessage').textContent = '';
  document.getElementById('reportDialog').showModal();
}

document.getElementById('reportForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.currentTarget.querySelector('button[type="submit"]');
  const msg = document.getElementById('reportMessage');
  btn.disabled = true;
  try {
    await api('/api/report-review', {
      method: 'POST',
      body: JSON.stringify({
        review_id: Number(document.getElementById('reportReviewId').value),
        reason: document.getElementById('reportReason').value,
        device_id: deviceId(),
      }),
    });
    document.getElementById('reportDialog').close();
    showToast('تم إرسال البلاغ للإدارة ✓');
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'form-message error';
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('guidelinesBtn').addEventListener('click', () => document.getElementById('guidelinesDialog').showModal());
document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => document.getElementById(btn.dataset.close).close()));
document.getElementById('logoutBtn').addEventListener('click', () => {
  clearSessionToken('student');
  location.replace(siteUrl('index.html'));
});

setupRatingChoices();

(async function init() {
  try {
    const session = await edgeApi('session', { role: 'student', redirectOn401: false });
    if (!session.authenticated) {
      clearSessionToken('student');
      return location.replace(siteUrl('index.html'));
    }
    deviceId();
    await loadProfessors();
  } catch {
    clearSessionToken('student');
    location.replace(siteUrl('index.html'));
  }
})();
