import { legacyApi, edgeApi, clearSessionToken } from './api-client.js';

const loginCard = document.getElementById('adminLoginCard');
const dashboard = document.getElementById('adminDashboard');
const logoutBtn = document.getElementById('adminLogout');
let cache = { professors: [], reviews: [], reports: [] };

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[c]));
}

async function api(path, options = {}) {
  return legacyApi(path, options, 'admin', false);
}

function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add('hidden'), 2800);
}

function professorById(id) { return cache.professors.find((p) => p.id === id); }
function professorName(id) { return professorById(id)?.name || `#${id}`; }
function reviewById(id) { return cache.reviews.find((r) => r.id === id); }
function formatDate(value) {
  if (!value) return '';
  try { return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(new Date(value)); } catch { return ''; }
}

function populateDepartments() {
  const departments = [...new Set(cache.professors.map((p) => p.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
  document.getElementById('departmentSuggestions').innerHTML = departments.map((d) => `<option value="${esc(d)}"></option>`).join('');
}

function professorReviewCount(id) {
  return cache.reviews.filter((r) => r.professor_id === id).length;
}

function renderSummary() {
  document.getElementById('activeProfessorsCount').textContent = cache.professors.filter((p) => p.is_active).length;
  document.getElementById('reviewsCountTop').textContent = cache.reviews.length;
  document.getElementById('openReportsCount').textContent = cache.reports.filter((r) => r.status === 'open').length;
  document.getElementById('professorsCount').textContent = cache.professors.length;
  document.getElementById('reviewsCount').textContent = cache.reviews.length;
  document.getElementById('reportsCount').textContent = cache.reports.length;
}

function renderProfessorsAdmin() {
  const q = document.getElementById('professorSearch').value.trim().toLowerCase();
  const status = document.getElementById('professorStatusFilter').value;
  const list = cache.professors
    .filter((p) => !q || `${p.name} ${p.department}`.toLowerCase().includes(q))
    .filter((p) => status === 'all' || (status === 'active' ? p.is_active : !p.is_active))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));

  document.getElementById('professorsAdminList').innerHTML = list.length ? list.map((p) => {
    const count = professorReviewCount(p.id);
    return `
      <article class="admin-item ${p.is_active ? '' : 'muted-item'}">
        <div class="admin-item-top">
          <div><strong>${esc(p.name)}</strong><p class="muted">${esc(p.department)} · ${count} تقييم</p></div>
          <span class="status ${p.is_active ? 'status-live' : ''}">${p.is_active ? 'ظاهر' : 'مخفي'}</span>
        </div>
        <div class="admin-actions">
          <button class="small-btn" data-edit-professor="${p.id}">تعديل</button>
          <button class="small-btn" data-toggle-professor="${p.id}" data-next-active="${p.is_active ? 'false' : 'true'}">${p.is_active ? 'إخفاء' : 'إظهار'}</button>
          <button class="small-btn danger-btn" data-delete-professor="${p.id}">حذف</button>
        </div>
      </article>`;
  }).join('') : '<div class="empty-state compact-empty">لا توجد نتائج.</div>';
}

function renderReports() {
  const filter = document.getElementById('reportStatusFilter').value;
  const reviewMap = new Map(cache.reviews.map((r) => [r.id, r]));
  const list = cache.reports.filter((r) => filter === 'all' || r.status === filter);

  document.getElementById('reportsList').innerHTML = list.length ? list.map((report) => {
    const review = reviewMap.get(report.review_id);
    return `
      <article class="admin-item ${report.status === 'resolved' ? 'muted-item' : ''}">
        <div class="admin-item-top">
          <div><strong>بلاغ عن تقييم #${report.review_id}</strong><p class="muted">${formatDate(report.created_at)}${review ? ` · ${esc(professorName(review.professor_id))}` : ''}</p></div>
          <span class="status ${report.status === 'open' ? 'status-warning' : ''}">${report.status === 'open' ? 'مفتوح' : 'مغلق'}</span>
        </div>
        <p>${esc(report.reason)}</p>
        ${review ? `<div class="report-review-preview"><strong>${esc(review.course_name)}</strong><p>${esc(review.comment || 'تقييم رقمي بدون تعليق')}</p></div>` : '<p class="muted">التقييم غير موجود.</p>'}
        <div class="admin-actions">
          ${review ? `<button class="small-btn" data-review-status="${review.id}" data-next-status="${review.status === 'published' ? 'hidden' : 'published'}">${review.status === 'published' ? 'إخفاء التقييم' : 'إعادة نشر التقييم'}</button>` : ''}
          <button class="small-btn" data-report-status="${report.id}" data-next-status="${report.status === 'open' ? 'resolved' : 'open'}">${report.status === 'open' ? 'إغلاق البلاغ' : 'إعادة فتحه'}</button>
        </div>
      </article>`;
  }).join('') : '<div class="empty-state compact-empty">لا توجد بلاغات بهذه الحالة.</div>';
}

function renderReviews() {
  const q = document.getElementById('reviewSearch').value.trim().toLowerCase();
  const status = document.getElementById('reviewStatusFilter').value;
  const list = cache.reviews.filter((r) => {
    const haystack = `${professorName(r.professor_id)} ${r.course_name} ${r.academic_term} ${r.comment || ''}`.toLowerCase();
    return (!q || haystack.includes(q)) && (status === 'all' || r.status === status);
  });

  document.getElementById('reviewsList').innerHTML = list.length ? list.map((r) => `
    <article class="admin-item ${r.status === 'hidden' ? 'muted-item' : ''}">
      <div class="admin-item-top">
        <div><strong>${esc(professorName(r.professor_id))}</strong><p class="muted">${esc(r.course_name)} · ${esc(r.academic_term)} · ${r.overall_rating}/5 · ${formatDate(r.created_at)}</p></div>
        <span class="status ${r.status === 'published' ? 'status-live' : ''}">${r.status === 'published' ? 'منشور' : 'مخفي'}</span>
      </div>
      <div class="rating-mini-row">
        <span>شرح ${r.clarity}/5</span><span>عدالة ${r.fairness}/5</span><span>تنظيم ${r.organization}/5</span>${r.interaction ? `<span>تعامل ${r.interaction}/5</span>` : ''}<span>صعوبة ${r.difficulty}/5</span>
      </div>
      <p>${esc(r.comment || 'تقييم رقمي بدون تعليق')}</p>
      <div class="admin-actions">
        <button class="small-btn ${r.status === 'published' ? 'danger-btn' : ''}" data-review-status="${r.id}" data-next-status="${r.status === 'published' ? 'hidden' : 'published'}">${r.status === 'published' ? 'إخفاء' : 'إعادة النشر'}</button>
        <button class="small-btn danger-btn" data-delete-review="${r.id}">حذف نهائي</button>
      </div>
    </article>`).join('') : '<div class="empty-state compact-empty">لا توجد تقييمات مطابقة.</div>';
}

function renderAll() {
  populateDepartments();
  renderSummary();
  renderProfessorsAdmin();
  renderReports();
  renderReviews();
}

async function loadAdmin() {
  const refresh = document.getElementById('refreshAdmin');
  refresh.disabled = true;
  refresh.textContent = 'جاري التحديث…';
  try {
    cache = await api('/api/admin-data');
    renderAll();
  } finally {
    refresh.disabled = false;
    refresh.textContent = 'تحديث البيانات';
  }
}

async function showDashboard() {
  loginCard.classList.add('hidden');
  dashboard.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
  await loadAdmin();
}

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = form.querySelector('button[type="submit"]');
  const msg = document.getElementById('adminLoginMessage');
  btn.disabled = true;
  msg.textContent = '';
  try {
    await api('/api/admin-login', { method: 'POST', body: JSON.stringify({ password: document.getElementById('adminPassword').value }) });
    await showDashboard();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'form-message error';
  } finally { btn.disabled = false; }
});

document.getElementById('addProfessorForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = form.querySelector('button[type="submit"]');
  const msg = document.getElementById('addProfessorMessage');
  btn.disabled = true;
  msg.textContent = 'جاري الإضافة…';
  msg.className = 'form-message';
  try {
    await api('/api/admin-add-professor', {
      method: 'POST',
      body: JSON.stringify({ name: document.getElementById('profName').value, department: document.getElementById('profDepartment').value }),
    });
    form.reset();
    msg.textContent = 'تمت الإضافة ✓';
    showToast('تمت إضافة عضو هيئة التدريس');
    await loadAdmin();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'form-message error';
  } finally { btn.disabled = false; }
});

document.getElementById('professorsAdminList').addEventListener('click', async (e) => {
  const editBtn = e.target.closest('[data-edit-professor]');
  const toggleBtn = e.target.closest('[data-toggle-professor]');
  const deleteBtn = e.target.closest('[data-delete-professor]');

  if (editBtn) {
    const p = professorById(Number(editBtn.dataset.editProfessor));
    if (!p) return;
    document.getElementById('editProfessorId').value = p.id;
    document.getElementById('editProfessorName').value = p.name;
    document.getElementById('editProfessorDepartment').value = p.department;
    document.getElementById('editProfessorMessage').textContent = '';
    document.getElementById('editProfessorDialog').showModal();
  }

  if (toggleBtn) {
    toggleBtn.disabled = true;
    try {
      await api('/api/admin-professor-status', {
        method: 'POST',
        body: JSON.stringify({ id: Number(toggleBtn.dataset.toggleProfessor), is_active: toggleBtn.dataset.nextActive === 'true' }),
      });
      showToast('تم تحديث ظهور العضو');
      await loadAdmin();
    } catch (err) { showToast(err.message, 'error'); }
    finally { toggleBtn.disabled = false; }
  }

  if (deleteBtn) {
    const id = Number(deleteBtn.dataset.deleteProfessor);
    const p = professorById(id);
    if (!confirm(`حذف ${p?.name || 'هذا العضو'} نهائيًا؟ لا يمكن حذف عضو لديه تقييمات.`)) return;
    deleteBtn.disabled = true;
    try {
      await api('/api/admin-delete-professor', { method: 'POST', body: JSON.stringify({ id }) });
      showToast('تم الحذف');
      await loadAdmin();
    } catch (err) { showToast(err.message, 'error'); }
    finally { deleteBtn.disabled = false; }
  }
});

document.getElementById('editProfessorForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = form.querySelector('button[type="submit"]');
  const msg = document.getElementById('editProfessorMessage');
  btn.disabled = true;
  try {
    await api('/api/admin-update-professor', {
      method: 'POST',
      body: JSON.stringify({
        id: Number(document.getElementById('editProfessorId').value),
        name: document.getElementById('editProfessorName').value,
        department: document.getElementById('editProfessorDepartment').value,
      }),
    });
    document.getElementById('editProfessorDialog').close();
    showToast('تم حفظ التعديلات');
    await loadAdmin();
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'form-message error';
  } finally { btn.disabled = false; }
});

async function handleReviewStatus(btn) {
  btn.disabled = true;
  try {
    await api('/api/admin-review-status', {
      method: 'POST',
      body: JSON.stringify({ review_id: Number(btn.dataset.reviewStatus), status: btn.dataset.nextStatus }),
    });
    showToast('تم تحديث حالة التقييم');
    await loadAdmin();
  } catch (err) { showToast(err.message, 'error'); }
  finally { btn.disabled = false; }
}

document.getElementById('reviewsList').addEventListener('click', async (e) => {
  const statusBtn = e.target.closest('[data-review-status]');
  const deleteBtn = e.target.closest('[data-delete-review]');
  if (statusBtn) await handleReviewStatus(statusBtn);
  if (deleteBtn) {
    if (!confirm('حذف هذا التقييم نهائيًا؟ سيُحذف أي بلاغ مرتبط به أيضًا.')) return;
    deleteBtn.disabled = true;
    try {
      await api('/api/admin-delete-review', { method: 'POST', body: JSON.stringify({ review_id: Number(deleteBtn.dataset.deleteReview) }) });
      showToast('تم حذف التقييم');
      await loadAdmin();
    } catch (err) { showToast(err.message, 'error'); }
    finally { deleteBtn.disabled = false; }
  }
});

document.getElementById('reportsList').addEventListener('click', async (e) => {
  const reviewStatusBtn = e.target.closest('[data-review-status]');
  const reportStatusBtn = e.target.closest('[data-report-status]');
  if (reviewStatusBtn) await handleReviewStatus(reviewStatusBtn);
  if (reportStatusBtn) {
    reportStatusBtn.disabled = true;
    try {
      await api('/api/admin-report-status', {
        method: 'POST',
        body: JSON.stringify({ report_id: Number(reportStatusBtn.dataset.reportStatus), status: reportStatusBtn.dataset.nextStatus }),
      });
      showToast('تم تحديث البلاغ');
      await loadAdmin();
    } catch (err) { showToast(err.message, 'error'); }
    finally { reportStatusBtn.disabled = false; }
  }
});

['professorSearch', 'professorStatusFilter'].forEach((id) => document.getElementById(id).addEventListener('input', renderProfessorsAdmin));
['reviewSearch', 'reviewStatusFilter'].forEach((id) => document.getElementById(id).addEventListener('input', renderReviews));
document.getElementById('reportStatusFilter').addEventListener('change', renderReports);

document.getElementById('refreshAdmin').addEventListener('click', async () => {
  try { await loadAdmin(); showToast('تم تحديث البيانات'); } catch (err) { showToast(err.message, 'error'); }
});

document.querySelectorAll('[data-close]').forEach((btn) => btn.addEventListener('click', () => document.getElementById(btn.dataset.close).close()));
logoutBtn.addEventListener('click', () => {
  clearSessionToken('admin');
  location.reload();
});

(async () => {
  try {
    const session = await edgeApi('admin-session', { role: 'admin', redirectOn401: false });
    if (session.authenticated) await showDashboard();
    else clearSessionToken('admin');
  } catch {
    clearSessionToken('admin');
  }
})();
