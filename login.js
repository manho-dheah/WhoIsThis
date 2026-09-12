import { edgeApi, getSessionToken, clearSessionToken, siteUrl } from './api-client.js';

(async () => {
  const token = getSessionToken('student');
  if (!token) return;
  try {
    const session = await edgeApi('session', { role: 'student', redirectOn401: false });
    if (session.authenticated) location.replace(siteUrl('app.html'));
    else clearSessionToken('student');
  } catch {
    clearSessionToken('student');
  }
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
    await edgeApi('login', {
      role: 'student',
      method: 'POST',
      body: { password: document.getElementById('password').value },
      redirectOn401: false,
    });
    location.replace(siteUrl('app.html'));
  } catch (err) {
    msg.textContent = err.message;
    msg.className = 'form-message error';
  } finally {
    btn.disabled = false;
  }
});
