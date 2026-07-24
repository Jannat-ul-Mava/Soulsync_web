/* ═══════════════════════════════════════════════════
   SOULSYNC — Signup.js  (connected to server API)
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

/* ── Password strength meter ── */
function checkStrength(val) {
  const colors = ['#D64332', '#E8942C', '#F0C040', '#5AB89A'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  let score = 0;
  if (val.length >= 8)          score++;
  if (/[A-Z]/.test(val))        score++;
  if (/[0-9]/.test(val))        score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;

  for (let i = 1; i <= 4; i++) {
    document.getElementById('ss' + i).style.background =
      i <= score ? colors[score - 1] : '#DFE4EA';
  }
  const lbl = document.getElementById('strLabel');
  lbl.textContent = val.length > 0 ? (labels[score - 1] || '') : '';
  lbl.style.color = score > 0 ? colors[score - 1] : '#8B9DAD';
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

/* ── Toggle button loading state ── */
function setLoading(on) {
  const btn    = document.getElementById('signupBtn');
  const btnTxt = document.getElementById('btnText');
  const loader = document.getElementById('btnLoader');
  btn.disabled        = on;
  btnTxt.style.display = on ? 'none' : 'flex';
  loader.style.display = on ? 'flex'  : 'none';
}

/* ── Main signup handler ── */
async function handleSignUp(e) {
  e.preventDefault();

  document.getElementById('errBox').style.display = 'none';
  document.getElementById('okBox').style.display  = 'none';

  /* Collect values */
  const full_name    = document.getElementById('fullNameField').value.trim();
  const email        = document.getElementById('emailField').value.trim();
  const password     = document.getElementById('passwordField').value;
  const confirm      = document.getElementById('confirmPasswordField').value;
  const date_of_birth = document.getElementById('dobPicker').value;
  const terms        = document.getElementById('termsCheckbox').checked;

  /* Optional fields */
  const phone    = document.getElementById('phoneField')?.value.trim()   || '';
  const gender   = document.getElementById('genderSelect')?.value        || '';
  const city     = document.getElementById('cityField')?.value.trim()    || '';
  const country  = document.getElementById('countrySelect')?.value       || '';
  const emergency_contact_name  = document.getElementById('emergNameField')?.value.trim()  || '';
  const emergency_contact_phone = document.getElementById('emergPhoneField')?.value.trim() || '';

  let valid = true;
  ['grpName','grpEmail','grpPass','grpConfirm','grpDob','grpTerms'].forEach(clearErr);

  /* Client-side validation */
  if (!full_name)                                      { showErr('grpName',    'errName');    valid = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))      { showErr('grpEmail',   'errEmail');   valid = false; }
  if (password.length < 8)                             { showErr('grpPass',    'errPass');    valid = false; }
  if (!confirm || password !== confirm)                { showErr('grpConfirm', 'errConfirm'); valid = false; }
  if (!date_of_birth)                                  { showErr('grpDob',     'errDob');     valid = false; }
  if (!terms)                                          { showErr('grpTerms',   'errTerms');   valid = false; }

  if (!valid) {
    const eb = document.getElementById('errBox');
    eb.style.display = 'flex';
    document.getElementById('errBoxMsg').textContent = 'Please fix the highlighted fields and try again.';
    return;
  }

  setLoading(true);

  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name,
        email,
        password,
        phone,
        date_of_birth,
        gender,
        city,
        country,
        emergency_contact_name,
        emergency_contact_phone
      })
    });

    const data = await response.json();

    if (data.success) {
      /* Show success message */
      document.getElementById('okBox').style.display = 'flex';
      document.getElementById('okBoxMsg').textContent =
        'Account created! Redirecting to login… 🎉';

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);

    } else {
      /* Show server error (e.g. duplicate email) */
      document.getElementById('errBox').style.display = 'flex';
      document.getElementById('errBoxMsg').textContent =
        data.message || 'Registration failed. Please try again.';
    }

  } catch (err) {
    console.error('Network error:', err);
    document.getElementById('errBox').style.display = 'flex';
    document.getElementById('errBoxMsg').textContent =
      'Could not connect to server. Make sure it is running.';
  } finally {
    setLoading(false);
  }
}