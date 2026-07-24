/* ═══════════════════════════════════════════════════════
   SOULSYNC — admin_login.js
   Connects login form to /api/admin/login on your backend
   ═══════════════════════════════════════════════════════ */

function togglePassword() {
  const field = document.getElementById('passwordField');
  const icon  = document.getElementById('eyeIcon');
  const show  = field.type === 'password';
  field.type  = show ? 'text' : 'password';
  icon.innerHTML = show
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
}

async function handleLogin(e) {
  e.preventDefault();

  const email    = document.getElementById('emailField').value.trim();
  const password = document.getElementById('passwordField').value;
  const remember = document.getElementById('rememberMeCheckbox').checked;

  const emailErr = document.getElementById('emailError');
  const passErr  = document.getElementById('passwordError');
  const errBox   = document.getElementById('errorMessageBox');
  const errLabel = document.getElementById('errorMessageLabel');
  const sucBox   = document.getElementById('successBox');
  const sucLabel = document.getElementById('successLabel');
  const btn      = document.getElementById('loginButton');
  const btnText  = document.querySelector('.btn-text');
  const loader   = document.getElementById('btnLoader');

  // ── Reset all error states
  emailErr.classList.remove('visible');
  passErr.classList.remove('visible');
  errBox.style.display = 'none';
  sucBox.style.display = 'none';

  // ── Client-side validation
  let valid = true;
  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailReg.test(email)) { emailErr.classList.add('visible'); valid = false; }
  if (!password)                        { passErr.classList.add('visible');  valid = false; }
  if (!valid) return;

  // ── Show loading spinner
  btn.disabled    = true;
  btnText.style.display  = 'none';
  loader.style.display   = 'inline-flex';

  try {
    const response = await fetch('/api/admin/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // ── Save admin info for dashboard use
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('adminLoggedIn', 'true');
      storage.setItem('adminEmail',    data.admin.email);
      storage.setItem('adminName',     data.admin.full_name);
      storage.setItem('adminId',       data.admin.admin_id);

      // ── Show success and redirect
      sucBox.style.display = 'flex';
      sucLabel.textContent = `Welcome back, ${data.admin.full_name}! Redirecting to dashboard…`;

      setTimeout(() => {
        window.location.href = '../Html/admin_dashboard.html';
      }, 1200);

    } else {
      // ── Show error from server
      errBox.style.display = 'flex';
      errLabel.textContent = data.message || 'Invalid admin credentials. Please try again.';
    }

  } catch (err) {
    // ── Network / server error
    errBox.style.display = 'flex';
    errLabel.textContent = 'Cannot connect to server. Make sure the backend is running on port 5000.';
    console.error('Login error:', err);

  } finally {
    btn.disabled          = false;
    btnText.style.display = '';
    loader.style.display  = 'none';
  }
}