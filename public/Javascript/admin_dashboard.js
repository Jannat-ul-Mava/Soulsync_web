
'use strict';

/* ──────────────────────────────────────────────────────────
   CONFIG — change this to your backend URL if needed
   ────────────────────────────────────────────────────────── */  // e.g. 'http://localhost:3000/api'
const API = '/api';
/* ──────────────────────────────────────────────────────────
   LOCAL CACHE  (populated from DB on page load / navigation)
   ────────────────────────────────────────────────────────── */
const cache = {
  users:              [],
  psychologists:      [],
  therapyAnimals:     [],
  appointments:       [],
  appointmentHistory: [],
  cancelRequests:     [],
};

/* ──────────────────────────────────────────────────────────
   UTILITY HELPERS
   ────────────────────────────────────────────────────────── */
const esc = str =>
  str == null ? '' :
  String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;')
             .replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function fmtTime(t) {
  if (!t) return '—';
  const [h, m] = String(t).split(':');
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'pm' : 'am'}`;
}

const fmtFee = f => `Rs ${f ?? 0}`;

function canCancel(dateStr, timeStr) {
  const dt = new Date(`${dateStr}T${String(timeStr).padStart(5,'0')}:00`);
  return (dt - new Date()) / 3_600_000 > 12;
}

function statusBadge(s) {
  const map = {
    Verified:'badge-green', NotChecked:'badge-blue', NotVerified:'badge-red',
    Scheduled:'badge-blue', Confirmed:'badge-green',
    Completed:'badge-green', Cancelled:'badge-red', 'No-Show':'badge-orange',
  };
  return `<span class="badge ${map[s]||'badge-gray'}">${esc(s)}</span>`;
}

const boolBadge = v =>
  v ? '<span class="badge badge-green">Yes</span>'
    : '<span class="badge badge-red">No</span>';

function healthBadge(h) {
  const m = { Excellent:'badge-green', Good:'badge-blue', Fair:'badge-orange' };
  return `<span class="badge ${m[h]||'badge-gray'}">${esc(h)}</span>`;
}

/* ──────────────────────────────────────────────────────────
   GENERIC FETCH WRAPPER
   ────────────────────────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    console.error(`API ${options.method||'GET'} ${path}:`, e);
    throw e;
  }
}

/* ──────────────────────────────────────────────────────────
   TABLE PLACEHOLDER ROWS
   ────────────────────────────────────────────────────────── */
function loadingRow(cols, msg = 'Loading...') {
  return `<tr><td colspan="${cols}" style="text-align:center;padding:28px;color:var(--text-muted)">⏳ ${msg}</td></tr>`;
}
function emptyRow(cols, msg = 'No records found') {
  return `<tr><td colspan="${cols}" style="text-align:center;padding:24px;color:var(--text-muted)">${msg}</td></tr>`;
}

/* ──────────────────────────────────────────────────────────
   SIDEBAR / NAV
   ────────────────────────────────────────────────────────── */
function toggleSidebar() {
  ['sidebar','hamburger'].forEach(id => document.getElementById(id).classList.toggle('open'));
  document.getElementById('sidebar-overlay').classList.toggle('visible');
}
function closeSidebar() {
  ['sidebar','hamburger'].forEach(id => document.getElementById(id).classList.remove('open'));
  document.getElementById('sidebar-overlay').classList.remove('visible');
}

const PAGE_LOADERS = {
  'dashboard':            loadDashboard,
  'verify-psychologists': loadVerifyPsychs,
  'therapy-animals':      loadTherapyAnimals,
  'edit-users':           loadUsers,
  'edit-psychologists':   loadPsychsTable,
  'appointments':         loadAppointmentsPage,
  'appointment-history':  loadHistoryTable,
};

function showPage(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  if (el) el.classList.add('active');
  else document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick')?.includes(`'${page}'`)) n.classList.add('active');
  });
  closeSidebar();
  if (PAGE_LOADERS[page]) PAGE_LOADERS[page]();
  document.getElementById('main-content').scrollTop = 0;
}

/* ──────────────────────────────────────────────────────────
   MODALS
   ────────────────────────────────────────────────────────── */
function openModal(id)  { document.getElementById(id).classList.add('open'); document.body.style.overflow='hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow=''; }
function closeModalOutside(e, id) { if (e.target.id === id) closeModal(id); }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
    closeSidebar();
  }
});

function showConfirm(title, msg, onConfirm, label = 'Confirm') {
  document.getElementById('confirm-modal-title').textContent = title;
  document.getElementById('confirm-modal-msg').textContent   = msg;
  const btn = document.getElementById('confirm-modal-btn');
  btn.textContent = label;
  btn.onclick = () => { closeModal('confirm-modal'); onConfirm(); };
  openModal('confirm-modal');
}

/* ──────────────────────────────────────────────────────────
   TOAST
   ────────────────────────────────────────────────────────── */
function toast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = `${type==='success'?'✅':type==='warning'?'⚠️':'❌'} ${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3400);
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD
   ══════════════════════════════════════════════════════════ */
async function loadDashboard() {
  renderStatsLoading();
  try {
    const [statsRes, apptsRes, cancelRes] = await Promise.all([
      apiFetch('/admin/stats'),
      apiFetch('/appointments?status=Scheduled,Confirmed'),
      apiFetch('/appointments/cancel-requests'),
    ]);
    cache.appointments   = apptsRes.appointments || [];
    cache.cancelRequests = cancelRes.requests    || [];
    renderStats(statsRes);
    renderDashCancelRequests();
    renderDashAppointments();
  } catch (e) {
    toast('Failed to load dashboard data.', 'error');
  }
}

function renderStatsLoading() {
  document.getElementById('stats-grid').innerHTML =
    Array(5).fill(`<div class="stat-card"><div class="stat-number" style="color:#ccc">—</div><div class="stat-label">Loading...</div></div>`).join('');
}

function renderStats(s) {
  const cards = [
    { num:s.totalUsers,     label:'Total Users',     icon:'👥', cls:'c-blue'   },
    { num:s.totalPsychs,    label:'Psychologists',   icon:'🧑‍⚕️', cls:'c-green'  },
    { num:s.totalAnimals,   label:'Therapy Animals', icon:'🐾', cls:'c-orange' },
    { num:s.pendingAppts,   label:'Pending Appts',   icon:'📅', cls:'c-purple' },
    { num:s.cancelRequests, label:'Cancel Requests', icon:'🔔', cls:'c-red'    },
  ];
  document.getElementById('stats-grid').innerHTML = cards.map(c =>
    `<div class="stat-card">
      <div class="stat-number ${c.cls}">${c.num??0}</div>
      <div class="stat-label">${c.icon} ${c.label}</div>
    </div>`).join('');

  const badge = document.getElementById('pending-badge');
  const tot   = (s.pendingAppts||0) + (s.cancelRequests||0);
  badge.textContent  = tot;
  badge.style.display = tot > 0 ? 'inline-block' : 'none';
}

function renderDashCancelRequests() {
  const alert = document.getElementById('cancel-requests-alert');
  const list  = document.getElementById('cancel-requests-list');
  if (!cache.cancelRequests.length) { alert.style.display='none'; return; }
  alert.style.display = '';
  document.getElementById('cancel-count-badge').textContent = cache.cancelRequests.length;
  list.innerHTML = cache.cancelRequests.map(r =>
    `<div class="cancel-request-row">
      <div class="cancel-request-info">
        <strong>${esc(r.user_name)} → ${esc(r.psychologist_name)}</strong>
        <span>${esc(r.appointment_date)} at ${fmtTime(r.appointment_time)} | Reason: ${esc(r.reason)}</span>
      </div>
      <div class="cancel-request-actions">
        <button class="btn btn-primary btn-sm" onclick="approveCancelReq(${r.request_id},${r.appointment_id})">✅ Approve</button>
        <button class="btn btn-danger btn-sm"  onclick="rejectCancelReq(${r.request_id})">✗ Reject</button>
      </div>
    </div>`).join('');
}

function renderDashAppointments() {
  const newA  = cache.appointments.filter(a => a.status==='Scheduled');
  const confA = cache.appointments.filter(a => a.status==='Confirmed');
  const row = (a, approve) =>
    `<tr>
      <td>0${a.appointment_id}</td>
      <td><strong>${esc(a.psychologist_name)}</strong></td>
      <td>${esc(a.user_name)}</td>
      <td>${fmtTime(a.appointment_time)}</td>
      <td>${esc(a.appointment_date)}</td>
      <td>${fmtFee(a.consultation_fee)}</td>
      <td class="td-actions">
        ${approve?`<button class="btn btn-primary btn-sm" onclick="approveAppt(${a.appointment_id})">✅ Approve</button>`:''}
        <button class="btn btn-warning btn-sm" onclick="promptCancelAppt(${a.appointment_id})">✗ Cancel</button>
      </td>
    </tr>`;
  document.getElementById('dash-new-appts').innerHTML     = newA.length  ? newA.map(a=>row(a,true)).join('')  : emptyRow(7,'No new appointments');
  document.getElementById('dash-ongoing-appts').innerHTML = confA.length ? confA.map(a=>row(a,false)).join('') : emptyRow(7,'No confirmed appointments');
}

/* ══════════════════════════════════════════════════════════
   VERIFY PSYCHOLOGISTS
   ══════════════════════════════════════════════════════════ */
async function loadVerifyPsychs() {
  document.getElementById('verify-grid').innerHTML = '<p style="color:var(--text-muted)">⏳ Loading psychologists...</p>';
  try {
    const data = await apiFetch('/psychologists');
    cache.psychologists = data.psychologists || [];
    renderVerifyGrid();
  } catch (e) {
    toast('Failed to load psychologists.', 'error');
    document.getElementById('verify-grid').innerHTML = '<p style="color:var(--danger)">⚠️ Could not connect to database.</p>';
  }
}

function renderVerifyGrid() {
  const sorted = [
    ...cache.psychologists.filter(p=>p.status==='NotChecked'),
    ...cache.psychologists.filter(p=>p.status==='NotVerified'),
    ...cache.psychologists.filter(p=>p.status==='Verified'),
  ];
  document.getElementById('verify-grid').innerHTML = sorted.length
    ? sorted.map(p=>`
      <div class="psych-card" id="psych-card-${p.psychologist_id}">
        <div class="psych-card-header">
          <div class="psych-card-avatar">${p.first_name[0]}</div>
          <div>
            <div class="psych-card-name">Dr. ${esc(p.first_name)} ${esc(p.last_name)}</div>
            <div class="psych-card-spec">${esc(p.specialization)}</div>
          </div>
        </div>
        <div class="psych-card-detail"><strong>Email:</strong> ${esc(p.email)}</div>
        <div class="psych-card-detail"><strong>Phone:</strong> ${esc(p.phone_number)}</div>
        <div class="psych-card-detail"><strong>License:</strong> ${esc(p.license_number)}</div>
        <div class="psych-card-detail"><strong>Experience:</strong> ${p.experience_years} yrs</div>
        <div class="psych-card-detail"><strong>Fee:</strong> Rs. ${p.consultation_fee}/session</div>
        <div class="psych-card-detail"><strong>Location:</strong> ${esc(p.clinic_location)}</div>
        <div class="psych-card-detail"><strong>Status:</strong> ${statusBadge(p.status)}</div>
        <div class="psych-card-actions">
          ${p.status!=='Verified'
            ?`<button class="btn btn-primary btn-sm" onclick="verifyPsych(${p.psychologist_id},'Verified')">✅ Approve</button>`:''}
          ${p.status!=='NotVerified'
            ?`<button class="btn btn-danger btn-sm" onclick="verifyPsych(${p.psychologist_id},'NotVerified')">✗ Reject</button>`:''}
          ${p.status==='Verified'
            ?`<button class="btn btn-outline btn-sm" onclick="verifyPsych(${p.psychologist_id},'NotChecked')">↩ Revoke</button>`:''}
        </div>
      </div>`).join('')
    : '<p style="color:var(--text-muted)">No psychologists found.</p>';
}

async function verifyPsych(id, status) {
  try {
    await apiFetch(`/psychologists/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    const p = cache.psychologists.find(x=>x.psychologist_id===id);
    if (p) p.status = status;
    renderVerifyGrid();
    const msgs = { Verified:'Psychologist approved!', NotVerified:'Psychologist rejected.', NotChecked:'Verification revoked.' };
    toast(msgs[status], status==='Verified'?'success':'error');
  } catch (e) { toast('Failed to update status: '+e.message, 'error'); }
}

/* ══════════════════════════════════════════════════════════
   ADD PSYCHOLOGIST
   ══════════════════════════════════════════════════════════ */
async function addPsychologist() {
  const g = id => document.getElementById(id).value.trim();
  const firstName=g('ap-first-name'), lastName=g('ap-last-name');
  const email=g('ap-email'), spec=g('ap-specialization');
  const license=g('ap-license'), fee=g('ap-fee');
  if (!firstName||!lastName||!email||!spec||!license||!fee) {
    toast('Please fill all required (*) fields.','error'); return;
  }
  const payload = {
    first_name:firstName, last_name:lastName, email,
    phone_number:g('ap-phone'), gender:g('ap-gender'),
    date_of_birth:g('ap-dob')||null,
    specialization:spec, qualification:g('ap-qualification'),
    license_number:license,
    experience_years:parseInt(g('ap-experience'))||0,
    years_of_experience:parseInt(g('ap-experience'))||0,
    consultation_fee:parseFloat(fee)||0,
    hourly_rate:parseFloat(fee)||0,
    clinic_location:g('ap-location'), available_days:g('ap-days'),
    bio:g('ap-bio'),
    status:document.getElementById('ap-status').value,
    is_available:document.getElementById('ap-available').checked?1:0,
    is_active:1,
  };
  try {
    await apiFetch('/psychologists',{ method:'POST', body:JSON.stringify(payload) });
    closeModal('add-psych-modal');
    clearAddPsychForm();
    toast(`Dr. ${firstName} ${lastName} added successfully!`,'success');
    await loadVerifyPsychs();
    await loadPsychsTable();
  } catch(e) { toast('Failed to add: '+e.message,'error'); }
}

function clearAddPsychForm() {
  ['ap-first-name','ap-last-name','ap-email','ap-phone','ap-dob',
   'ap-specialization','ap-license','ap-qualification','ap-experience',
   'ap-fee','ap-location','ap-days','ap-bio'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('ap-available').checked=true;
  document.getElementById('ap-status').value='NotChecked';
  document.getElementById('ap-gender').value='';
}

/* ══════════════════════════════════════════════════════════
   EDIT PSYCHOLOGIST  ← NEW FEATURE
   Reads all 16 psychologist columns from DB and saves back.
   ══════════════════════════════════════════════════════════ */
function openEditPsych(id) {
  // Try cache first for instant open; data was already fetched from DB
  const p = cache.psychologists.find(x => x.psychologist_id === id);
  if (!p) { toast('Psychologist not found — try refreshing the page.','error'); return; }

  document.getElementById('ep-id').value = p.psychologist_id;
  document.getElementById('edit-psych-modal-title').textContent =
    `Edit — Dr. ${p.first_name} ${p.last_name}`;

  // Map every DB column to its form field
  const map = {
    'ep-first-name':   p.first_name,
    'ep-last-name':    p.last_name,
    'ep-email':        p.email,
    'ep-phone':        p.phone_number,
    'ep-dob':          p.date_of_birth ? String(p.date_of_birth).split('T')[0] : '',
    'ep-specialization': p.specialization,
    'ep-license':      p.license_number,
    'ep-qualification':p.qualification,
    'ep-experience':   p.experience_years,
    'ep-fee':          p.consultation_fee,
    'ep-location':     p.clinic_location,
    'ep-days':         p.available_days,
    'ep-bio':          p.bio,
  };
  Object.entries(map).forEach(([id,val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  });

  document.getElementById('ep-gender').value   = p.gender    || '';
  document.getElementById('ep-status').value   = p.status    || 'NotChecked';
  document.getElementById('ep-available').checked = !!p.is_available;
  document.getElementById('ep-active').checked    = !!p.is_active;
  document.getElementById('ep-saving').style.display = 'none';

  openModal('edit-psych-modal');
}

async function savePsychEdit() {
  const g   = id => document.getElementById(id).value.trim();
  const id  = parseInt(document.getElementById('ep-id').value);
  const firstName=g('ep-first-name'), lastName=g('ep-last-name');
  const email=g('ep-email'), spec=g('ep-specialization');
  const license=g('ep-license'), fee=g('ep-fee');

  if (!firstName||!lastName||!email||!spec||!license||!fee) {
    toast('Please fill all required (*) fields.','error'); return;
  }

  // Build payload matching all psychologists table columns
  const payload = {
    first_name:        firstName,
    last_name:         lastName,
    email,
    phone_number:      g('ep-phone'),
    gender:            g('ep-gender'),
    date_of_birth:     g('ep-dob') || null,
    specialization:    spec,
    license_number:    license,
    qualification:     g('ep-qualification'),
    experience_years:  parseInt(g('ep-experience'))  || 0,
    years_of_experience: parseInt(g('ep-experience')) || 0,
    consultation_fee:  parseFloat(fee) || 0,
    hourly_rate:       parseFloat(fee) || 0,
    clinic_location:   g('ep-location'),
    available_days:    g('ep-days'),
    bio:               g('ep-bio'),
    status:            document.getElementById('ep-status').value,
    is_available:      document.getElementById('ep-available').checked ? 1 : 0,
    is_active:         document.getElementById('ep-active').checked    ? 1 : 0,
  };

  document.getElementById('ep-saving').style.display = 'block';

  try {
    // PUT /api/psychologists/:id  → UPDATE psychologists SET ... WHERE psychologist_id = @id
    await apiFetch(`/psychologists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    // Update local cache so UI reflects change without re-fetch
    const idx = cache.psychologists.findIndex(x => x.psychologist_id === id);
    if (idx !== -1) cache.psychologists[idx] = { ...cache.psychologists[idx], ...payload, psychologist_id:id };

    document.getElementById('ep-saving').style.display = 'none';
    closeModal('edit-psych-modal');
    toast(`Dr. ${firstName} ${lastName} updated successfully!`, 'success');
    renderVerifyGrid();
    renderPsychsTableFromCache();
  } catch (e) {
    document.getElementById('ep-saving').style.display = 'none';
    toast('Save failed: ' + e.message, 'error');
  }
}

/* ══════════════════════════════════════════════════════════
   THERAPY ANIMALS
   ══════════════════════════════════════════════════════════ */
let currentAnimalFilter = 'all';

async function loadTherapyAnimals() {
  document.getElementById('animals-grid').innerHTML =
    '<p style="color:var(--text-muted);grid-column:1/-1">⏳ Loading animals...</p>';
  try {
    const data = await apiFetch('/therapy-animals');
    cache.therapyAnimals = data.animals || [];
    renderAnimalsGrid(currentAnimalFilter);
  } catch (e) { toast('Failed to load therapy animals.','error'); }
}

function filterAnimals(type, btn) {
  currentAnimalFilter = type;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAnimalsGrid(type);
}

function renderAnimalsGrid(filter) {
  const list = filter==='all' ? cache.therapyAnimals
    : cache.therapyAnimals.filter(a=>a.type===filter);
  const emoji = a => a.type==='Cat'?'🐈':'🐕';
  document.getElementById('animals-grid').innerHTML = list.length
    ? list.map(a=>`
      <div class="animal-card" id="animal-card-${a.dog_id}">
        <div class="animal-card-top">
          <div class="animal-emoji">${emoji(a)}</div>
          <div>
            <div class="animal-card-name">${esc(a.dog_name)}</div>
            <div class="animal-card-breed">${esc(a.breed)}</div>
            <span class="badge ${a.type==='Cat'?'badge-orange':'badge-green'}">${a.type}</span>
          </div>
        </div>
        <div class="animal-card-detail"><strong>Specialization:</strong> ${esc(a.specialization)}</div>
        <div class="animal-card-detail"><strong>Trainer:</strong> ${esc(a.trainer_name)}</div>
        <div class="animal-card-detail"><strong>Experience:</strong> ${a.experience} yrs</div>
        <div class="animal-card-detail"><strong>Success Rate:</strong> ${a.success_rate}%</div>
        <div class="animal-card-detail"><strong>Health:</strong> ${healthBadge(a.health_status)}</div>
        <div class="animal-card-detail"><strong>Cert:</strong> ${esc(a.certification_level)}</div>
        <div class="animal-card-detail"><strong>Active:</strong> ${boolBadge(a.is_active)}</div>
        <div class="animal-card-actions">
          <button class="btn btn-info btn-sm" onclick="viewAnimal(${a.dog_id})">👁 View</button>
          <button class="btn ${a.is_active?'btn-outline':'btn-primary'} btn-sm" onclick="toggleAnimal(${a.dog_id})">
            ${a.is_active?'⏸ Deactivate':'▶ Activate'}
          </button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteAnimal(${a.dog_id})">🗑</button>
        </div>
      </div>`).join('')
    : '<p style="color:var(--text-muted);grid-column:1/-1">No animals found.</p>';
}

function viewAnimal(id) {
  const a = cache.therapyAnimals.find(x=>x.dog_id===id);
  if (!a) return;
  const emoji = a.type==='Cat'?'🐈':'🐕';
  document.getElementById('view-animal-title').textContent=`${emoji} ${a.dog_name} — Details`;
  document.getElementById('view-animal-body').innerHTML=`
    <div class="detail-header">
      <div style="font-size:52px">${emoji}</div>
      <div><div class="detail-header-name">${esc(a.dog_name)}</div>
      <div class="detail-header-sub">${esc(a.breed)} · ${esc(a.type)}</div></div>
    </div>
    <div class="detail-grid">
      ${[['Animal Type',a.type],['Breed',a.breed],['Age',`${a.age} yrs`],
        ['Birthday',a.birthday_date],['Temperament',a.temperament],
        ['Specialization',a.specialization],['Experience',`${a.experience} yrs`],
        ['Certification',a.certification_level],['Health',a.health_status],
        ['Success Rate',`${a.success_rate}%`],['Trainer',a.trainer_name],
        ['Specialties',a.therapy_specialities],
        ['Active',a.is_active?'Yes':'No'],['Description',a.description],
      ].map(([k,v])=>`
        <div class="detail-item">
          <div class="detail-item-label">${k}</div>
          <div class="detail-item-value">${esc(v)}</div>
        </div>`).join('')}
    </div>`;
  openModal('view-animal-modal');
}

async function toggleAnimal(id) {
  const a = cache.therapyAnimals.find(x=>x.dog_id===id);
  if (!a) return;
  const newVal = a.is_active ? 0 : 1;
  try {
    await apiFetch(`/therapy-animals/${id}/toggle`,{ method:'PATCH', body:JSON.stringify({is_active:newVal}) });
    a.is_active = newVal;
    renderAnimalsGrid(currentAnimalFilter);
    toast(`${a.dog_name} ${newVal?'activated':'deactivated'}.`, newVal?'success':'warning');
  } catch(e) { toast('Failed to update status.','error'); }
}

async function confirmDeleteAnimal(id) {
  const a = cache.therapyAnimals.find(x=>x.dog_id===id);
  if (!a) return;
  showConfirm('Remove Animal', `Remove "${a.dog_name}" permanently from the database?`,
    async () => {
      try {
        await apiFetch(`/therapy-animals/${id}`,{method:'DELETE'});
        cache.therapyAnimals = cache.therapyAnimals.filter(x=>x.dog_id!==id);
        renderAnimalsGrid(currentAnimalFilter);
        toast(`${a.dog_name} removed.`,'error');
      } catch(e) { toast('Delete failed: '+e.message,'error'); }
    },'🗑 Remove');
}

async function addAnimal() {
  const g = id => document.getElementById(id).value.trim();
  const name=g('aa-name'), breed=g('aa-breed');
  const trainer=g('aa-trainer'), spec=g('aa-specialization'), desc=g('aa-desc');
  if (!name||!breed||!trainer||!spec||!desc) {
    toast('Please fill all required (*) fields.','error'); return;
  }
  const payload = {
    dog_name:name,
    type:document.getElementById('aa-type').value,
    breed, age:parseInt(g('aa-age'))||0,
    birthday_date:g('aa-birthday')||null,
    temperament:g('aa-temperament'),
    specialization:spec,
    experience:parseInt(g('aa-experience'))||0,
    certification_level:document.getElementById('aa-cert').value,
    health_status:document.getElementById('aa-health').value,
    success_rate:parseFloat(g('aa-rate'))||0,
    trainer_name:trainer,
    therapy_specialities:g('aa-specialties'),
    description:desc,
    is_active:document.getElementById('aa-active').checked?1:0,
  };
  try {
    const data = await apiFetch('/therapy-animals',{method:'POST',body:JSON.stringify(payload)});
    payload.dog_id = data.dog_id;
    cache.therapyAnimals.push(payload);
    closeModal('add-animal-modal');
    clearAddAnimalForm();
    renderAnimalsGrid(currentAnimalFilter);
    toast(`${payload.type} "${name}" added!`,'success');
  } catch(e) { toast('Failed to add: '+e.message,'error'); }
}

function clearAddAnimalForm() {
  ['aa-name','aa-breed','aa-age','aa-birthday','aa-temperament',
   'aa-specialization','aa-experience','aa-rate','aa-trainer','aa-specialties','aa-desc']
   .forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('aa-type').value='Dog';
  document.getElementById('aa-cert').value='Level 1 - Basic';
  document.getElementById('aa-health').value='Excellent';
  document.getElementById('aa-active').checked=true;
}
function updateAnimalTypeLabel(){}

/* ══════════════════════════════════════════════════════════
   USERS TABLE  (view only)
   ══════════════════════════════════════════════════════════ */
async function loadUsers() {
  document.getElementById('users-tbody').innerHTML = loadingRow(12);
  document.getElementById('users-cards').innerHTML = '';
  try {
    const data = await apiFetch('/users');
    cache.users = data.users || [];
    renderUsersTable();
  } catch(e) {
    toast('Failed to load users.','error');
    document.getElementById('users-tbody').innerHTML = emptyRow(12,'⚠️ Could not load users');
  }
}

function renderUsersTable() {
  const search=(document.getElementById('user-search')?.value||'').toLowerCase();
  const list=cache.users.filter(u=>
    !search||u.full_name?.toLowerCase().includes(search)||
    u.email?.toLowerCase().includes(search)||u.city?.toLowerCase().includes(search));

  document.getElementById('users-tbody').innerHTML = list.length
    ? list.map(u=>`<tr>
        <td>${u.user_id}</td>
        <td><strong>${esc(u.full_name)}</strong></td>
        <td>${esc(u.email)}</td>
        <td>${esc(u.phone)}</td>
        <td>${esc(u.date_of_birth||'—')}</td>
        <td>${esc(u.gender)}</td>
        <td>${esc(u.city)}</td>
        <td>${esc(u.country)}</td>
        <td>${esc(u.account_type)}</td>
        <td>${boolBadge(u.is_active)}</td>
        <td>${boolBadge(u.email_verified)}</td>
        <td class="td-actions">
          <button class="btn btn-info btn-sm" onclick="viewUser(${u.user_id})">👁 View</button>
        </td>
      </tr>`).join('')
    : emptyRow(12);

  document.getElementById('users-cards').innerHTML = list.map(u=>`
    <div class="m-card">
      <div class="m-card-title">${esc(u.full_name)} ${boolBadge(u.is_active)}</div>
      <div class="m-card-row"><span class="m-label">Email</span><span class="m-val">${esc(u.email)}</span></div>
      <div class="m-card-row"><span class="m-label">Phone</span><span class="m-val">${esc(u.phone)}</span></div>
      <div class="m-card-row"><span class="m-label">City</span><span class="m-val">${esc(u.city)}</span></div>
      <div class="m-card-actions">
        <button class="btn btn-info btn-sm" onclick="viewUser(${u.user_id})">👁 View Details</button>
      </div>
    </div>`).join('');
}
function filterUsers() { renderUsersTable(); }

function viewUser(id) {
  const u=cache.users.find(x=>x.user_id===id);
  if(!u) return;
  document.getElementById('view-user-title').textContent=`User — ${u.full_name}`;
  document.getElementById('view-user-body').innerHTML=`
    <div class="detail-header">
      <div class="detail-header-avatar">${u.full_name[0]}</div>
      <div>
        <div class="detail-header-name">${esc(u.full_name)}</div>
        <div class="detail-header-sub">${esc(u.account_type)} · ${esc(u.city)}, ${esc(u.country)}</div>
        <div style="margin-top:4px">${boolBadge(u.is_active)}</div>
      </div>
    </div>
    <div class="detail-grid">
      ${[['User ID',u.user_id],['Email',u.email],['Phone',u.phone],
        ['Date of Birth',u.date_of_birth||'—'],['Gender',u.gender],
        ['Account Type',u.account_type],['Address',u.address||'—'],
        ['City',u.city],['Country',u.country],
        ['Emergency Contact',u.emergency_contact_name||'—'],
        ['Emergency Phone',u.emergency_contact_phone||'—'],
        ['Email Verified',u.email_verified?'Yes':'No'],
        ['Active',u.is_active?'Yes':'No'],['Joined',u.created_at],
      ].map(([k,v])=>`
        <div class="detail-item">
          <div class="detail-item-label">${k}</div>
          <div class="detail-item-value">${esc(v)}</div>
        </div>`).join('')}
    </div>`;
  openModal('view-user-modal');
}

/* ══════════════════════════════════════════════════════════
   PSYCHOLOGISTS DATA TABLE
   ══════════════════════════════════════════════════════════ */
async function loadPsychsTable() {
  document.getElementById('psychs-tbody').innerHTML = loadingRow(16);
  try {
    const data = await apiFetch('/psychologists');
    cache.psychologists = data.psychologists || [];
    renderPsychsTableFromCache();
  } catch(e) {
    toast('Failed to load psychologists.','error');
    document.getElementById('psychs-tbody').innerHTML = emptyRow(16,'⚠️ Could not load data');
  }
}

function renderPsychsTableFromCache() {
  const search=(document.getElementById('psych-search')?.value||'').toLowerCase();
  const list=cache.psychologists.filter(p=>
    !search||`${p.first_name} ${p.last_name}`.toLowerCase().includes(search)||
    p.email?.toLowerCase().includes(search)||p.specialization?.toLowerCase().includes(search));

  document.getElementById('psychs-tbody').innerHTML = list.length
    ? list.map(p=>`<tr>
        <td>${p.psychologist_id}</td>
        <td>ALi</td>
        <td>${esc(p.last_name)}</td>
        <td>${esc(p.email)}</td>
        <td>${esc(p.phone_number)}</td>
        <td>${esc(p.gender)}</td>
        <td>${esc(p.specialization)}</td>
        <td style="max-width:150px;white-space:normal;font-size:12px">${esc(p.qualification)}</td>
        <td>${esc(p.license_number)}</td>
        <td>${p.experience_years} yrs</td>
        <td>Rs. ${p.consultation_fee}</td>
        <td style="max-width:130px;white-space:normal;font-size:12px">${esc(p.clinic_location)}</td>
        <td style="font-size:12px">${esc(p.available_days)}</td>
        <td>${statusBadge(p.status)}</td>
        <td>${boolBadge(p.is_available)}</td>
        <td class="td-actions">
          <button class="btn btn-edit btn-sm" onclick="openEditPsych(${p.psychologist_id})">✏ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeletePsych(${p.psychologist_id})">🗑</button>
        </td>
      </tr>`).join('')
    : emptyRow(16);

  document.getElementById('psychs-cards').innerHTML = list.map(p=>`
    <div class="m-card">
      <div class="m-card-title">Dr. ${esc(p.first_name)} ${esc(p.last_name)} ${statusBadge(p.status)}</div>
      <div class="m-card-row"><span class="m-label">Spec.</span><span class="m-val">${esc(p.specialization)}</span></div>
      <div class="m-card-row"><span class="m-label">Email</span><span class="m-val">${esc(p.email)}</span></div>
      <div class="m-card-row"><span class="m-label">Fee</span><span class="m-val">Rs. ${p.consultation_fee}</span></div>
      <div class="m-card-actions">
        <button class="btn btn-edit btn-sm" onclick="openEditPsych(${p.psychologist_id})">✏ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="confirmDeletePsych(${p.psychologist_id})">🗑 Delete</button>
      </div>
    </div>`).join('');
}
function filterPsychs() { renderPsychsTableFromCache(); }

async function confirmDeletePsych(id) {
  const p=cache.psychologists.find(x=>x.psychologist_id===id);
  if(!p) return;
  showConfirm('Delete Psychologist',
    `Permanently delete Dr. ${p.first_name} ${p.last_name} from the database?`,
    async()=>{
      try {
        await apiFetch(`/psychologists/${id}`,{method:'DELETE'});
        cache.psychologists=cache.psychologists.filter(x=>x.psychologist_id!==id);
        renderPsychsTableFromCache(); renderVerifyGrid();
        toast(`Dr. ${p.first_name} ${p.last_name} deleted.`,'error');
      } catch(e) { toast('Delete failed: '+e.message,'error'); }
    },'🗑 Delete');
}

/* ══════════════════════════════════════════════════════════
   APPOINTMENTS PAGE
   ══════════════════════════════════════════════════════════ */
async function loadAppointmentsPage() {
  document.getElementById('new-appts-tbody').innerHTML       = loadingRow(9);
  document.getElementById('confirmed-appts-tbody').innerHTML = loadingRow(9);
  try {
    const [apptsRes, cancelRes] = await Promise.all([
      apiFetch('/appointments?status=Scheduled,Confirmed'),
      apiFetch('/appointments/cancel-requests'),
    ]);
    cache.appointments   = apptsRes.appointments || [];
    cache.cancelRequests = cancelRes.requests    || [];
    renderAppointmentsPage();
  } catch(e) { toast('Failed to load appointments.','error'); }
}

function renderAppointmentsPage() {
  renderApptCancelRequests();
  const sched = cache.appointments.filter(a=>a.status==='Scheduled');
  const conf  = cache.appointments.filter(a=>a.status==='Confirmed');
  const row = (a, showApprove) =>
    `<tr>
      <td>0${a.appointment_id}</td>
      <td><strong>${esc(a.psychologist_name)}</strong></td>
      <td>${esc(a.user_name)}</td>
      <td>${fmtTime(a.appointment_time)}</td>
      <td>${esc(a.appointment_date)}</td>
      <td><span class="badge badge-blue">${esc(a.appointment_type)}</span></td>
      <td>${fmtFee(a.consultation_fee)}</td>
      <td>${statusBadge(a.status)}</td>
      <td class="td-actions">
        ${showApprove?`<button class="btn btn-primary btn-sm" onclick="approveAppt(${a.appointment_id})">✅ Approve</button>`:''}
        <button class="btn btn-warning btn-sm" onclick="promptCancelAppt(${a.appointment_id})">✗ Cancel</button>
      </td>
    </tr>`;
  document.getElementById('new-appts-tbody').innerHTML =
    sched.length ? sched.map(a=>row(a,true)).join('')  : emptyRow(9,'No scheduled appointments');
  document.getElementById('confirmed-appts-tbody').innerHTML =
    conf.length  ? conf.map(a=>row(a,false)).join('') : emptyRow(9,'No confirmed appointments');
}

function renderApptCancelRequests() {
  const sec=document.getElementById('appt-cancel-requests');
  const list=document.getElementById('appt-cancel-list');
  if(!cache.cancelRequests.length){sec.style.display='none';return;}
  sec.style.display='';
  list.innerHTML=cache.cancelRequests.map(r=>
    `<div class="cancel-request-row">
      <div class="cancel-request-info">
        <strong>${esc(r.user_name)} → ${esc(r.psychologist_name)}</strong>
        <span>${esc(r.appointment_date)} at ${fmtTime(r.appointment_time)} | Reason: ${esc(r.reason)}</span>
      </div>
      <div class="cancel-request-actions">
        <button class="btn btn-primary btn-sm" onclick="approveCancelReq(${r.request_id},${r.appointment_id})">✅ Approve Cancel</button>
        <button class="btn btn-danger btn-sm"  onclick="rejectCancelReq(${r.request_id})">✗ Reject</button>
      </div>
    </div>`).join('');
}

async function approveAppt(id) {
  try {
    await apiFetch(`/appointments/${id}/status`,{method:'PATCH',body:JSON.stringify({status:'Confirmed'})});
    const a=cache.appointments.find(x=>x.appointment_id===id);
    if(a) a.status='Confirmed';
    renderAppointmentsPage(); renderDashAppointments();
    toast(`Appointment #0${id} confirmed!`,'success');
  } catch(e){toast('Failed: '+e.message,'error');}
}

function promptCancelAppt(id) {
  const a=cache.appointments.find(x=>x.appointment_id===id);
  if(!a) return;
  if(!canCancel(a.appointment_date,a.appointment_time)){
    toast('Cannot cancel: less than 12 hours before appointment.','error'); return;
  }
  document.getElementById('cancel-appt-id').value=id;
  document.getElementById('cancel-reason-input').value='';
  openModal('cancel-reason-modal');
}

async function executeCancelAppt() {
  const id=parseInt(document.getElementById('cancel-appt-id').value);
  const reason=document.getElementById('cancel-reason-input').value.trim();
  const a=cache.appointments.find(x=>x.appointment_id===id);
  if(!a){closeModal('cancel-reason-modal');return;}
  if(!canCancel(a.appointment_date,a.appointment_time)){
    toast('Cannot cancel: less than 12 hours before appointment.','error');
    closeModal('cancel-reason-modal');return;
  }
  try {
    await apiFetch(`/appointments/${id}/status`,{
      method:'PATCH',
      body:JSON.stringify({status:'Cancelled',cancellation_reason:reason}),
    });
    cache.appointmentHistory.push({...a,status:'Cancelled'});
    cache.appointments=cache.appointments.filter(x=>x.appointment_id!==id);
    closeModal('cancel-reason-modal');
    renderAppointmentsPage(); renderHistoryTable(); renderDashAppointments();
    toast(`Appointment #0${id} cancelled.`,'warning');
  } catch(e){toast('Cancel failed: '+e.message,'error');}
}

async function approveCancelReq(reqId,apptId) {
  const a=cache.appointments.find(x=>x.appointment_id===apptId);
  const req=cache.cancelRequests.find(r=>r.request_id===reqId);
  if(!a||!req){
    cache.cancelRequests=cache.cancelRequests.filter(r=>r.request_id!==reqId);
    renderDashboard(); return;
  }
  if(!canCancel(a.appointment_date,a.appointment_time)){
    toast('Cannot approve: appointment is within 12 hours.','error');
    cache.cancelRequests=cache.cancelRequests.filter(r=>r.request_id!==reqId);
    renderDashboard(); renderAppointmentsPage(); return;
  }
  try {
    await apiFetch(`/appointments/cancel-requests/${reqId}/approve`,{method:'POST'});
    cache.appointmentHistory.push({...a,status:'Cancelled'});
    cache.appointments=cache.appointments.filter(x=>x.appointment_id!==apptId);
    cache.cancelRequests=cache.cancelRequests.filter(r=>r.request_id!==reqId);
    renderDashboard(); renderAppointmentsPage(); renderHistoryTable();
    toast('Cancel request approved.','success');
  } catch(e){toast('Failed: '+e.message,'error');}
}

async function rejectCancelReq(reqId) {
  try {
    await apiFetch(`/appointments/cancel-requests/${reqId}/reject`,{method:'POST'});
    cache.cancelRequests=cache.cancelRequests.filter(r=>r.request_id!==reqId);
    renderDashboard(); renderAppointmentsPage();
    toast('Cancel request rejected.','warning');
  } catch(e){toast('Failed: '+e.message,'error');}
}

/* ══════════════════════════════════════════════════════════
   APPOINTMENT HISTORY
   ══════════════════════════════════════════════════════════ */
async function loadHistoryTable() {
  document.getElementById('history-tbody').innerHTML = loadingRow(8);
  try {
    const data = await apiFetch('/appointments?status=Completed,Cancelled');
    cache.appointmentHistory = data.appointments || [];
    renderHistoryTable();
  } catch(e){
    toast('Failed to load history.','error');
    document.getElementById('history-tbody').innerHTML=emptyRow(8,'⚠️ Could not load data');
  }
}

function renderHistoryTable() {
  document.getElementById('history-tbody').innerHTML = cache.appointmentHistory.length
    ? cache.appointmentHistory.map(a=>
        `<tr>
          <td>0${a.appointment_id}</td>
          <td><strong>${esc(a.psychologist_name)}</strong></td>
          <td>${esc(a.user_name)}</td>
          <td>${fmtTime(a.appointment_time)}</td>
          <td>${esc(a.appointment_date)}</td>
          <td>${fmtFee(a.consultation_fee)}</td>
          <td>${statusBadge(a.status)}</td>
          <td class="td-actions">
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteHistory(${a.appointment_id})">🗑 Delete</button>
          </td>
        </tr>`).join('')
    : emptyRow(8,'No history records');
}

async function confirmDeleteHistory(id) {
  showConfirm('Delete Record',`Permanently delete appointment record #0${id}?`,
    async()=>{
      try {
        await apiFetch(`/appointments/${id}`,{method:'DELETE'});
        cache.appointmentHistory=cache.appointmentHistory.filter(a=>a.appointment_id!==id);
        renderHistoryTable(); toast('Record deleted.','error');
      } catch(e){toast('Delete failed: '+e.message,'error');}
    },'🗑 Delete');
}

/* ──────────────────────────────────────────────────────────
   MISC
   ────────────────────────────────────────────────────────── */
function refreshAll() { loadDashboard(); }

function confirmLogout() {
  showConfirm('Log Out','Are you sure you want to log out?',
    ()=>{ window.location.href='../HTML/admin_login.html'; },'Log Out');
}

/* ──────────────────────────────────────────────────────────
   INIT
   ────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});