(async () => {
  try {
    const session = await fetch('/api/session', { credentials: 'include' }).then((r) => r.json());
    if (session.authenticated) location.replace('/app.html');
  } catch {}
})();

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = form.querySelector('button');
  const msg = document.getElementById('loginMessage');
  btn.disabled = true;
  msg.textContent = 'جاري التحقق…';
  msg.className = 'form-message';
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: document.getElementById('password').value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'تعذر تسجيل الدخول');
    location.replace('/app.html');
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'form-message error';
  } finally { btn.disabled = false; }
});
