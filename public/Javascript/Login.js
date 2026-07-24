/* ═══════════════════════════════════════════════════
   SOULSYNC — Login.js  (connected to server API)
═══════════════════════════════════════════════════ */

/* ── Toggle password visibility ── */
function togglePass(id, btn) {
  const inp  = document.getElementById(id);
  const show = inp.type === 'password';
  inp.type   = show ? 'text' : 'password';

  btn.querySelector('svg').innerHTML = show
    ? `<path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5.06-5.94
         M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.16 3.19
         m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
       <line x1="1" y1="1" x2="23" y2="23"/>`
    : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
       <circle cx="12" cy="12" r="3"/>`;
}

/* ── Clear field error ── */
function clearErr(grpId) {
  const grp = document.getElementById(grpId);
  if (!grp) return;
  grp.classList.remove('has-error');
  grp.querySelectorAll('.ferr').forEach(e => e.classList.remove('show'));
}

/* ── Show field error ── */
function showErr(grpId, errId) {
  const grp = document.getElementById(grpId);
  const err = document.getElementById(errId);
  if (grp) grp.classList.add('has-error');
  if (err) err.classList.add('show');
}

/* ── Show / hide alert boxes ── */
function showAlert(type, message) {
  const errBox = document.getElementById('errBox');
  const okBox  = document.getElementById('okBox');
  errBox.style.display = 'none';
  okBox.style.display  = 'none';

  if (type === 'error') {
    document.getElementById('errBoxMsg').textContent = message;
    errBox.style.display = 'flex';
  } else {
    document.getElementById('okBoxMsg').textContent = message;
    okBox.style.display = 'flex';
  }
}

/* ── Toggle button loading state ── */
function setLoading(on) {
  const btn    = document.getElementById('loginBtn');
  const btnTxt = document.getElementById('btnText');
  const loader = document.getElementById('btnLoader');
  btn.disabled        = on;
  btnTxt.style.display = on ? 'none' : 'flex';
  loader.style.display = on ? 'flex'  : 'none';
}

/* ── Main login handler ── */
async function handleLogin(e) {
  e.preventDefault();

  /* Hide old alerts */
  document.getElementById('errBox').style.display = 'none';
  document.getElementById('okBox').style.display  = 'none';

  const email    = document.getElementById('emailField').value.trim();
  const password = document.getElementById('passwordField').value;
  let valid = true;

  clearErr('grpEmail');
  clearErr('grpPass');

  /* Client-side validation */
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showErr('grpEmail', 'errEmail');
    valid = false;
  }
  if (!password) {
    showErr('grpPass', 'errPass');
    valid = false;
  }
  if (!valid) return;

  setLoading(true);

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.success) {
      showAlert('ok', `Welcome back, ${data.user.full_name}! Redirecting to your dashboard…`);
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1200);
    } else {
      showAlert('error', data.message || 'Login failed. Please try again.');
    }

  } catch (err) {
    console.error('Network error:', err);
    showAlert('error', 'Could not connect to server. Make sure it is running.');
  } finally {
    setLoading(false);
  }
}

/* ── Wire up events on DOM ready ── */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm')
    .addEventListener('submit', handleLogin);

  const toggleBtn = document.getElementById('togglePassBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () =>
      togglePass('passwordField', toggleBtn)
    );
  }
});