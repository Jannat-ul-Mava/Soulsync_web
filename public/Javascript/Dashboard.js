/* ═══════════════════════════════════════════════════
   SOULSYNC DASHBOARD JS - FIXED
═══════════════════════════════════════════════════ */

// Global variables
let currentUser = null;
let customRoutines = [];
let deleteTargetId = null;
let psychologists = [];

// DOM Elements
const routineListEl = document.querySelector('.routine-list');
const routineSubEl = document.getElementById('routineSub');
const statDoneEl = document.getElementById('statDone');
const statPctEl = document.getElementById('statPct');
const statHistoryEl = document.getElementById('statHistory');
const streakCountEl = document.getElementById('streakCount');
const welcomeNameEl = document.querySelector('.welcome-name em');
const sbUserNameEl = document.querySelector('.sb-uname');
const greetingTextEl = document.getElementById('greetingText');
const dateLineEl = document.getElementById('dateLine');

// Toast notification
function showToast(message, isError = false) {
  let toast = document.getElementById('customToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'customToast';
    toast.className = 'upload-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.background = isError ? '#e74c3c' : 'var(--deep)';
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    toast.style.background = 'var(--deep)';
  }, 2000);
}

// Check authentication
async function checkAuth() {
  try {
    const response = await fetch('/api/me');
    const data = await response.json();
    
    if (data.loggedIn) {
      currentUser = data.user;
      if (welcomeNameEl) welcomeNameEl.textContent = currentUser.full_name.split(' ')[0] + '!';
      if (sbUserNameEl) sbUserNameEl.textContent = currentUser.full_name;
      
      // Update avatar initials
      const initials = currentUser.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
      const avatarCircle = document.querySelector('.sb-avatar-circle');
      if (avatarCircle) avatarCircle.textContent = initials.substring(0, 2);
      
      await loadCustomRoutines();
      await loadPsychologists();
      await loadStats();
      updateGreeting();
      updateDate();
      
      // Inject add routine button and form
      injectCustomRoutineUI();
      // Initialize appointment button
      initAppointmentButton();
      // Load saved profile picture
      loadSavedProfilePicture();
    } else {
      window.location.href = '/login.html';
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    showToast('Authentication failed', true);
  }
}

// Load psychologists from database for dashboard
async function loadPsychologists() {
  try {
    const response = await fetch('/api/psychologists');
    const data = await response.json();
    
    if (data.success && data.psychologists.length > 0) {
      psychologists = data.psychologists;
      renderPsychologistCard();
    }
  } catch (error) {
    console.error('Error loading psychologists:', error);
  }
}

// Render psychologist card with dynamic data
function renderPsychologistCard() {
  // Get a random psychologist or first one
 // const psychologist = psychologists[0];
  if (!psychologist) return;
  
  // Update doctor name
  const doctorNameEl = "";
  const doctorSpecEl = document.querySelector('.doctor-spec');
  const doctorAvatarCanvas = document.getElementById('doctorAvatarCanvas');
  
  if (doctorNameEl) {
    doctorNameEl.textContent = `Dr. ${psychologist.first_name} ${psychologist.last_name}`;
  }
  if (doctorSpecEl) {
    doctorSpecEl.textContent = psychologist.specialization || 'Clinical Psychologist';
  }
  
  // Draw doctor avatar on canvas
  if (doctorAvatarCanvas) {
    const ctx = doctorAvatarCanvas.getContext('2d');
    const img = new Image();
    
    // Use doctor image based on name
    const imageNumber = (psychologist.psychologist_id % 4) + 1;
    const imagePath = `/media/doctor${imageNumber}.jpg`;
    
    img.onload = function() {
      doctorAvatarCanvas.width = 72;
      doctorAvatarCanvas.height = 72;
      ctx.clearRect(0, 0, 72, 72);
      ctx.beginPath();
      ctx.arc(36, 36, 36, 0, 2 * Math.PI);
      ctx.clip();
      ctx.drawImage(img, 0, 0, 72, 72);
    };
    img.onerror = function() {
      // Fallback - draw initials
      ctx.fillStyle = '#5AB89A';
      ctx.fillRect(0, 0, 72, 72);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 24px "DM Sans"';
      ctx.fillText(`${psychologist.first_name="Asif"}${psychologist.last_name.charAt(0)}`, 22, 48);
    };
    img.src = imagePath;
  }
  
  // Update next session info (mock data - can be replaced with real data)
  const nextSessionEl = document.querySelector('.sii-val');
  if (nextSessionEl) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const randomDay = days[Math.floor(Math.random() * days.length)];
    const randomHour = Math.floor(Math.random() * 4) + 9; // 9 AM to 12 PM
    nextSessionEl.textContent = `${randomDay}, ${randomHour} PM`;
  }
}

// Load saved profile picture from localStorage
function loadSavedProfilePicture() {
  const savedAvatar = localStorage.getItem('userAvatar');
  const avatarCanvas = document.getElementById('sbUserCanvas');
  
  if (savedAvatar && avatarCanvas) {
    const img = new Image();
    img.onload = function() {
      const ctx = avatarCanvas.getContext('2d');
      avatarCanvas.width = 42;
      avatarCanvas.height = 42;
      ctx.clearRect(0, 0, 42, 42);
      ctx.beginPath();
      ctx.arc(21, 21, 20, 0, 2 * Math.PI);
      ctx.clip();
      ctx.drawImage(img, 0, 0, 42, 42);
    };
    img.src = savedAvatar;
  } else if (avatarCanvas) {
    // Draw default avatar with initials
    const ctx = avatarCanvas.getContext('2d');
    ctx.fillStyle = '#5AB89A';
    ctx.fillRect(0, 0, 42, 42);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px "DM Sans"';
    const initials = currentUser?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'JD';
    ctx.fillText(initials.substring(0, 2), 12, 28);
  }
}

// Profile picture upload
function initProfileUpload() {
  const fileInput = document.getElementById('profileUpload');
  const avatarCanvas = document.getElementById('sbUserCanvas');
  
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          const img = new Image();
          img.onload = function() {
            const ctx = avatarCanvas.getContext('2d');
            avatarCanvas.width = 42;
            avatarCanvas.height = 42;
            ctx.clearRect(0, 0, 42, 42);
            ctx.beginPath();
            ctx.arc(21, 21, 20, 0, 2 * Math.PI);
            ctx.clip();
            ctx.drawImage(img, 0, 0, 42, 42);
            
            // Save to localStorage
            localStorage.setItem('userAvatar', event.target.result);
            showToast('Profile photo updated!');
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

// Update greeting
function updateGreeting() {
  const hour = new Date().getHours();
  if (greetingTextEl) {
    if (hour < 12) greetingTextEl.textContent = 'Good morning';
    else if (hour < 17) greetingTextEl.textContent = 'Good afternoon';
    else greetingTextEl.textContent = 'Good evening';
  }
}

// Update date
function updateDate() {
  if (dateLineEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateLineEl.textContent = new Date().toLocaleDateString('en-US', options);
  }
}

// Initialize Appointment Button
function initAppointmentButton() {
    const scheduleBtn = document.querySelector('.schedule-btn');
    if (scheduleBtn) {
        const newScheduleBtn = scheduleBtn.cloneNode(true);
        scheduleBtn.parentNode.replaceChild(newScheduleBtn, scheduleBtn);
        
        newScheduleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/appointment.html';
        });
    }
}

// Inject Add Routine button and form
function injectCustomRoutineUI() {
  const routinesCard = document.querySelector('.bottom-grid .card:first-child');
  if (!routinesCard) return;
  
  const cardHeader = routinesCard.querySelector('.card-header');
  
  if (document.getElementById('customAddRoutineBtn')) return;
  
  const viewAllLink = cardHeader.querySelector('.card-link');
  if (viewAllLink) {
    viewAllLink.remove();
  }
  
  const addRoutineBtn = document.createElement('button');
  addRoutineBtn.id = 'customAddRoutineBtn';
  addRoutineBtn.className = 'add-routine-btn';
  addRoutineBtn.innerHTML = '+ Add Custom';
  addRoutineBtn.style.cssText = 'background: var(--mint); color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; border: none; cursor: pointer;';
  cardHeader.appendChild(addRoutineBtn);
  
  const addRoutineForm = document.createElement('div');
  addRoutineForm.id = 'customAddRoutineForm';
  addRoutineForm.style.cssText = 'display: none; margin-top: 14px; flex-direction: column; gap: 8px;';
  addRoutineForm.innerHTML = `
    <input type="text" id="customRoutineName" class="routine-input" placeholder="Routine name" maxlength="50" style="padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; font-size: 13px;">
    <input type="time" id="customRoutineTime" class="routine-input" value="09:00" style="padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; font-size: 13px;">
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button id="customCancelBtn" style="padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #eee; color: var(--txt-soft); border: none; cursor: pointer;">Cancel</button>
      <button id="customSaveBtn" style="padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; background: var(--mint); color: white; border: none; cursor: pointer;">Save</button>
    </div>
  `;
  
  const routineList = routinesCard.querySelector('.routine-list');
  if (routineList) {
    routineList.parentNode.insertBefore(addRoutineForm, routineList.nextSibling);
  }
  
  if (!document.getElementById('customDeleteModal')) {
    const deleteModal = document.createElement('div');
    deleteModal.id = 'customDeleteModal';
    deleteModal.className = 'modal-overlay';
    deleteModal.style.display = 'none';
    deleteModal.innerHTML = `
      <div class="modal-box">
        <p class="modal-msg">Delete this routine?</p>
        <div class="modal-btns">
          <button class="btn-cancel" id="customModalCancel" style="padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #eee; cursor: pointer;">Cancel</button>
          <button class="btn-delete" id="customModalConfirm" style="padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #e74c3c; color: white; border: none; cursor: pointer;">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(deleteModal);
  }
  
  addRoutineBtn.addEventListener('click', () => toggleAddForm(addRoutineForm));
  document.getElementById('customCancelBtn')?.addEventListener('click', () => toggleAddForm(addRoutineForm));
  document.getElementById('customSaveBtn')?.addEventListener('click', () => saveRoutine());
  document.getElementById('customModalCancel')?.addEventListener('click', closeModal);
  document.getElementById('customModalConfirm')?.addEventListener('click', confirmDelete);
}

let isFormVisible = false;
function toggleAddForm(form) {
  if (form) {
    isFormVisible = !isFormVisible;
    form.style.display = isFormVisible ? 'flex' : 'none';
    if (isFormVisible) {
      document.getElementById('customRoutineName')?.focus();
    }
  }
}

// Save new routine
async function saveRoutine() {
  const nameInput = document.getElementById('customRoutineName');
  const timeInput = document.getElementById('customRoutineTime');
  
  const name = nameInput ? nameInput.value : '';
  const time = timeInput ? timeInput.value : '12:00';
  
  if (!name.trim()) {
    showToast('Please enter a routine name', true);
    return;
  }
  
  try {
    const response = await fetch('/api/routines/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), time: time })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Routine added successfully!');
      if (nameInput) nameInput.value = '';
      toggleAddForm(document.getElementById('customAddRoutineForm'));
      await loadCustomRoutines();
    } else {
      showToast(data.message || 'Failed to add routine', true);
    }
  } catch (error) {
    console.error('Error adding routine:', error);
    showToast('Network error', true);
  }
}

// Load custom routines
async function loadCustomRoutines() {
  try {
    const response = await fetch('/api/routines/custom');
    const data = await response.json();
    
    if (data.success) {
      customRoutines = data.routines || [];
      renderCustomRoutines();
      updateProgress();
    }
  } catch (error) {
    console.error('Error loading routines:', error);
  }
}

// Render custom routines
function renderCustomRoutines() {
  const routineList = document.querySelector('.bottom-grid .card:first-child .routine-list');
  if (!routineList) return;
  
  const completedCount = customRoutines.filter(r => r.completed).length;
  const totalCount = customRoutines.length;
  
  if (totalCount === 0) {
    routineList.innerHTML = `
      <div class="routine-empty" style="text-align: center; padding: 30px 20px; color: var(--txt-soft); background: var(--pale-mid); border-radius: 16px;">
        <span style="font-size: 40px; display: block; margin-bottom: 10px;">📝</span>
        <p>No custom routines yet.<br>Click "+ Add Custom" to create your first habit!</p>
      </div>
    `;
    if (routineSubEl) routineSubEl.textContent = '0 of 0 completed';
    return;
  }
  
  if (routineSubEl) routineSubEl.textContent = `${completedCount} of ${totalCount} completed`;
  
  let html = '';
  customRoutines.forEach(routine => {
    html += `
      <div class="routine-row" data-id="${routine.id}" style="display: flex; align-items: center; gap: 12px; padding: 8px 6px; border-radius: 10px; transition: background .15s;">
        <div class="custom-checkbox" data-id="${routine.id}" style="width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0; border: 2px solid var(--border); background: ${routine.completed ? 'var(--mint)' : 'var(--bg)'}; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" style="opacity: ${routine.completed ? 1 : 0}; transition: opacity .15s;"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <span class="rname" style="flex: 1; font-size: 13px; font-weight: 500; color: var(--txt-mid); ${routine.completed ? 'text-decoration: line-through; color: var(--txt-soft);' : ''}">
          ${escapeHtml(routine.name)}
        </span>
        <span class="rtime" style="font-size: 11px; color: var(--txt-light); flex-shrink: 0;">${routine.time || '—'}</span>
        <button class="routine-delete-btn" data-id="${routine.id}" style="background: none; border: none; cursor: pointer; color: var(--txt-light); padding: 4px; border-radius: 6px; font-size: 14px;" title="Delete routine">🗑️</button>
      </div>
    `;
  });
  
  routineList.innerHTML = html;
  
  document.querySelectorAll('.custom-checkbox').forEach(checkbox => {
    checkbox.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(checkbox.dataset.id);
      const routine = customRoutines.find(r => r.id === id);
      if (routine) {
        await toggleRoutineCompletion(id, !routine.completed);
      }
    });
  });
  
  document.querySelectorAll('.routine-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTargetId = parseInt(btn.dataset.id);
      const modal = document.getElementById('customDeleteModal');
      if (modal) modal.style.display = 'flex';
    });
  });
}

// Toggle routine completion
async function toggleRoutineCompletion(routineId, completed) {
  try {
    const response = await fetch('/api/routines/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routineId, completed })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const routine = customRoutines.find(r => r.id === routineId);
      if (routine) routine.completed = completed;
      renderCustomRoutines();
      updateProgress();
      showToast(completed ? '✓ Great job! Routine completed!' : 'Routine unchecked');
      await loadStats();
    } else {
      showToast(data.message || 'Failed to update', true);
    }
  } catch (error) {
    console.error('Error toggling routine:', error);
    showToast('Network error', true);
  }
}

// Update progress indicators
function updateProgress() {
  const completedCount = customRoutines.filter(r => r.completed).length;
  const totalCount = customRoutines.length;
  const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  
  if (statDoneEl) statDoneEl.textContent = `${completedCount}/${totalCount}`;
  if (statPctEl) statPctEl.textContent = `${percentage}%`;
  
  const progFill = document.querySelector('.prog-fill');
  if (progFill) {
    progFill.style.width = `${percentage}%`;
    progFill.style.setProperty('--pw', `${percentage}%`);
  }
  
  const progValue = document.querySelector('.prog-value');
  if (progValue) progValue.textContent = `${completedCount}/${totalCount}`;
  
  if (routineSubEl) routineSubEl.textContent = `${completedCount} of ${totalCount} completed`;
}

// Load statistics
async function loadStats() {
  try {
    const response = await fetch('/api/routines/stats');
    const data = await response.json();
    
    if (data.success) {
      if (streakCountEl) streakCountEl.textContent = data.streak || 0;
      if (statHistoryEl) statHistoryEl.textContent = data.daysTracked || 0;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Delete routine
async function deleteCustomRoutine(id) {
  try {
    const response = await fetch(`/api/routines/custom/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast('Routine deleted');
      await loadCustomRoutines();
      await loadStats();
      return true;
    }
  } catch (error) {
    console.error('Error deleting routine:', error);
    showToast('Error deleting routine', true);
    return false;
  }
}

// Modal handlers
function closeModal() {
  const modal = document.getElementById('customDeleteModal');
  if (modal) modal.style.display = 'none';
  deleteTargetId = null;
}

async function confirmDelete() {
  if (deleteTargetId) {
    await deleteCustomRoutine(deleteTargetId);
  }
  closeModal();
}

// Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Logout
async function logout() {
  try {
    await fetch('/api/logout');
    localStorage.removeItem('userAvatar');
    window.location.href = '/login.html';
  } catch (error) {
    window.location.href = '/login.html';
  }
}

// Mobile menu handler
function initMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobOverlay');
  const menuBtn = document.getElementById('mobMenuBtn');
  
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      if (sidebar) sidebar.classList.add('open');
      if (overlay) overlay.classList.add('show');
    });
  }
  
  if (overlay) {
    overlay.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('show');
    });
  }
}

// Initialize dashboard
async function init() {
  initMobileMenu();
  initProfileUpload();
  await checkAuth();
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
}

// Start the app
init();

// Modal functions for routines modal
window.closeRoutinesModal = function() {
  const modal = document.getElementById('routinesModal');
  if (modal) modal.style.display = 'none';
};

window.closeModalDeleteConfirm = function() {
  const modal = document.getElementById('modalDeleteConfirm');
  if (modal) modal.style.display = 'none';
};

// Make sure the routines modal link works
document.addEventListener('DOMContentLoaded', () => {
  const routinesLink = document.getElementById('routinesMenuLink');
  if (routinesLink) {
    routinesLink.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = document.getElementById('routinesModal');
      if (modal) modal.style.display = 'flex';
    });
  }
  
  // Modal add button
  const modalAddBtn = document.getElementById('modalAddBtn');
  if (modalAddBtn) {
    modalAddBtn.addEventListener('click', async () => {
      const name = document.getElementById('modalRoutineName').value;
      const time = document.getElementById('modalRoutineTime').value;
      if (!name.trim()) {
        showToast('Please enter a routine name', true);
        return;
      }
      try {
        const response = await fetch('/api/routines/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), time: time })
        });
        const data = await response.json();
        if (data.success) {
          showToast('Routine added!');
          document.getElementById('modalRoutineName').value = '';
          await loadCustomRoutines();
          // Also reload modal routines if needed
          const modalList = document.getElementById('modalRoutinesList');
          if (modalList) {
            loadCustomRoutines();
          }
        }
      } catch (error) {
        showToast('Error adding routine', true);
      }
    });
  }
});
// Function to load routines into modal
async function loadModalRoutines() {
  try {
    const response = await fetch('/api/routines/custom');
    const data = await response.json();
    
    if (data.success) {
      const routines = data.routines || [];
      const modalList = document.getElementById('modalRoutinesList');
      const modalCount = document.getElementById('modalRoutinesCount');
      const modalStatDone = document.getElementById('modalStatDone');
      const modalStatPct = document.getElementById('modalStatPct');
      const modalProgressFill = document.getElementById('modalProgressFill');
      const modalProgressText = document.getElementById('modalProgressText');
      
      const completedCount = routines.filter(r => r.completed).length;
      const totalCount = routines.length;
      const percentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
      
      if (modalCount) {
        modalCount.textContent = `${totalCount} routine${totalCount !== 1 ? 's' : ''}`;
      }
      if (modalStatDone) modalStatDone.textContent = `${completedCount}/${totalCount}`;
      if (modalStatPct) modalStatPct.textContent = `${percentage}%`;
      if (modalProgressFill) modalProgressFill.style.width = `${percentage}%`;
      if (modalProgressText) modalProgressText.textContent = `${percentage}%`;
      
      if (totalCount === 0) {
        if (modalList) {
          modalList.innerHTML = `
            <div class="modal-empty-state">
              <span>✨</span>
              <p>No routines yet. Add your first habit above!</p>
            </div>
          `;
        }
        return;
      }
      
      if (modalList) {
        modalList.innerHTML = routines.map(routine => `
          <div class="modal-routine-item" data-id="${routine.id}">
            <input type="checkbox" class="modal-routine-check" data-id="${routine.id}" ${routine.completed ? 'checked' : ''}>
            <span class="modal-routine-name ${routine.completed ? 'completed' : ''}">${escapeHtml(routine.name)}</span>
            <span class="modal-routine-time">${routine.time || '—'}</span>
            <button class="modal-routine-delete" data-id="${routine.id}">🗑️</button>
          </div>
        `).join('');
        
        // Add event listeners for modal checkboxes
        document.querySelectorAll('.modal-routine-check').forEach(checkbox => {
          checkbox.addEventListener('change', async (e) => {
            e.stopPropagation();
            const id = parseInt(checkbox.dataset.id);
            const completed = checkbox.checked;
            
            const response = await fetch('/api/routines/toggle', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ routineId: id, completed })
            });
            
            const data = await response.json();
            if (data.success) {
              await loadCustomRoutines();
              await loadModalRoutines();
              showToast(completed ? 'Routine completed!' : 'Routine unchecked');
            }
          });
        });
        
        // Add event listeners for modal delete buttons
        document.querySelectorAll('.modal-routine-delete').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            if (confirm('Delete this routine?')) {
              const response = await fetch(`/api/routines/custom/${id}`, { method: 'DELETE' });
              const data = await response.json();
              if (data.success) {
                await loadCustomRoutines();
                await loadModalRoutines();
                showToast('Routine deleted');
              }
            }
          });
        });
      }
    }
  } catch (error) {
    console.error('Error loading modal routines:', error);
  }
}

// Override the open modal function to load routines
window.openRoutinesModal = function() {
  const modal = document.getElementById('routinesModal');
  if (modal) {
    modal.style.display = 'flex';
    loadModalRoutines();
  }
};

// Make sure the routines link opens the modal with content
document.addEventListener('DOMContentLoaded', () => {
  const routinesLink = document.getElementById('routinesMenuLink');
  if (routinesLink) {
    routinesLink.addEventListener('click', (e) => {
      e.preventDefault();
      const modal = document.getElementById('routinesModal');
      if (modal) {
        modal.style.display = 'flex';
        loadModalRoutines();
      }
    });
  }
  
  // Modal add button
  const modalAddBtn = document.getElementById('modalAddBtn');
  if (modalAddBtn) {
    modalAddBtn.addEventListener('click', async () => {
      const name = document.getElementById('modalRoutineName').value;
      const time = document.getElementById('modalRoutineTime').value;
      if (!name.trim()) {
        showToast('Please enter a routine name', true);
        return;
      }
      try {
        const response = await fetch('/api/routines/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), time: time })
        });
        const data = await response.json();
        if (data.success) {
          showToast('Routine added!');
          document.getElementById('modalRoutineName').value = '';
          await loadCustomRoutines();
          await loadModalRoutines();
        }
      } catch (error) {
        showToast('Error adding routine', true);
      }
    });
  }
});
