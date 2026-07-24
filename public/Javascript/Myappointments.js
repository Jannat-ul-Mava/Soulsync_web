/* ═══════════════════════════════════════════════════
   SOULSYNC MY APPOINTMENTS JS - WITH DOCTOR IMAGES
═══════════════════════════════════════════════════ */

// Global variables
let currentUser = null;
let upcomingAppointments = [];
let pastAppointments = [];
let cancelAppointmentId = null;

// Doctor image mapping based on name (same as appointment page)
function getDoctorImage(doctorName) {
    // Map doctor names to image numbers
    const doctorImages = {
        'sarah': 1,
        'ahmed': 2,
        'fatima': 3,
        'johnson': 1,
        'hassan': 2,
        'khan': 3
    };
    
    const nameLower = (doctorName || '').toLowerCase();
    let imageNumber = 1;
    
    // Find matching doctor
    for (const [key, value] of Object.entries(doctorImages)) {
        if (nameLower.includes(key)) {
            imageNumber = value;
            break;
        }
    }
    
    return `/media/doctor${imageNumber}.jpg`;
}

// Get dog image
function getDogImage(dogName) {
    const dogImages = {
        'max': 1,
        'luna': 2,
        'bailey': 3,
        'cooper': 4,
        'bella': 1,
        'scout': 2
    };
    
    const nameLower = (dogName || '').toLowerCase();
    let imageNumber = 1;
    
    for (const [key, value] of Object.entries(dogImages)) {
        if (nameLower.includes(key)) {
            imageNumber = value;
            break;
        }
    }
    
    return `/media/dog${imageNumber}.jpg`;
}

// DOM Elements
const upcomingContainer = document.getElementById('upcomingContainer');
const historyContainer = document.getElementById('historyContainer');
const upcomingCountLabel = document.getElementById('upcomingCountLabel');
const historyCountLabel = document.getElementById('historyCountLabel');

// Toast notification
function showToast(message, isError = false) {
    let toast = document.getElementById('customToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'customToast';
        toast.className = 'upload-toast';
        document.body.appendChild(toast);
        
        const style = document.createElement('style');
        style.textContent = `
            .upload-toast {
                position: fixed;
                bottom: 28px;
                right: 28px;
                background: #2D5244;
                color: white;
                padding: 12px 20px;
                border-radius: 50px;
                font-size: 13px;
                font-weight: 500;
                box-shadow: 0 8px 30px rgba(0,0,0,0.15);
                transform: translateY(80px);
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: none;
                z-index: 1000;
            }
            .upload-toast.show {
                transform: translateY(0);
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }
    toast.textContent = message;
    toast.style.background = isError ? '#e74c3c' : '#2D5244';
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
}

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/me');
        const data = await response.json();
        
        if (data.loggedIn) {
            currentUser = data.user;
            await loadAppointments();
        } else {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showToast('Authentication failed', true);
    }
}

// Load appointments from database
async function loadAppointments() {
    try {
        const response = await fetch('/api/appointments');
        const data = await response.json();
        
        if (data.success) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            upcomingAppointments = [];
            pastAppointments = [];
            
            data.appointments.forEach(appointment => {
                const appDate = new Date(appointment.appointment_date);
                if (appDate >= today && appointment.status !== 'Cancelled') {
                    upcomingAppointments.push(appointment);
                } else {
                    pastAppointments.push(appointment);
                }
            });
            
            upcomingAppointments.sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
            pastAppointments.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));
            
            renderUpcomingAppointments();
            renderPastAppointments();
            updateCounts();
        } else {
            showToast('Failed to load appointments', true);
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
        showToast('Network error', true);
    }
}

// Render upcoming appointments with images
function renderUpcomingAppointments() {
    if (!upcomingContainer) return;
    
    if (upcomingAppointments.length === 0) {
        upcomingContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📅</div>
                <h3 class="empty-title">No Upcoming Appointments</h3>
                <p class="empty-text">You don't have any scheduled appointments.</p>
                <button class="btn-primary" onclick="window.location.href='/appointment.html'">Book an Appointment</button>
            </div>
        `;
        return;
    }
    
    upcomingContainer.innerHTML = upcomingAppointments.map(app => {
        const doctorImage = getDoctorImage(app.psychologist_first_name);
        const dogImage = app.therapy_dog_name ? getDogImage(app.therapy_dog_name) : null;
        
        return `
        <div class="appointment-card" data-id="${app.appointment_id}">
            <div class="card-header">
                <div class="appointment-date">
                    <span class="date-icon">📅</span>
                    <div>
                        <div class="date-text">${formatDate(app.appointment_date)}</div>
                        <div class="time-text">${formatTime(app.appointment_time)} • ${app.duration_minutes} min</div>
                    </div>
                </div>
                <span class="status-badge status-${app.status.toLowerCase()}">${app.status}</span>
            </div>
            <div class="card-body">
                <div class="info-row doctor-info-row">
                    <div class="doctor-avatar-small">
                        <img src="${doctorImage}" alt="${app.psychologist_first_name}" onerror="this.src='/media/default-avatar.png'">
                    </div>
                    <div>
                        <span class="info-label">Psychologist</span>
                        <div class="info-value">Dr. ${escapeHtml(app.psychologist_first_name)} ${escapeHtml(app.psychologist_last_name)}</div>
                        <div class="info-small">${escapeHtml(app.specialization || 'Clinical Psychologist')}</div>
                    </div>
                </div>
                ${app.therapy_dog_name ? `
                <div class="info-row dog-info-row">
                    <div class="dog-avatar-small">
                        <img src="${dogImage}" alt="${app.therapy_dog_name}" onerror="this.src='/media/default-dog.png'">
                    </div>
                    <div>
                        <span class="info-label">Therapy Animal</span>
                        <div class="info-value">${escapeHtml(app.therapy_dog_name)} (${escapeHtml(app.therapy_dog_breed)})</div>
                    </div>
                </div>
                ` : ''}
                <div class="info-row">
                    <span class="info-icon">📍</span>
                    <div>
                        <span class="info-label">Location</span>
                        <div class="info-value">${escapeHtml(app.clinic_location)}</div>
                    </div>
                </div>
                ${app.booking_notes ? `
                <div class="info-row">
                    <span class="info-icon">📝</span>
                    <div>
                        <span class="info-label">Notes</span>
                        <div class="info-value">${escapeHtml(app.booking_notes)}</div>
                    </div>
                </div>
                ` : ''}
            </div>
            <div class="card-actions">
                <button class="btn-secondary" onclick="window.location.href='/appointment.html'">Reschedule</button>
                <button class="btn-danger" onclick="openCancelModal(${app.appointment_id})">Cancel</button>
            </div>
        </div>
    `}).join('');
}

// Render past appointments with images
function renderPastAppointments() {
    if (!historyContainer) return;
    
    if (pastAppointments.length === 0) {
        historyContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3 class="empty-title">No Appointment History</h3>
                <p class="empty-text">Your past appointments will appear here.</p>
            </div>
        `;
        return;
    }
    
    historyContainer.innerHTML = pastAppointments.map(app => {
        const doctorImage = getDoctorImage(app.psychologist_first_name);
        const dogImage = app.therapy_dog_name ? getDogImage(app.therapy_dog_name) : null;
        
        return `
        <div class="appointment-card-past">
            <div class="card-header">
                <div class="appointment-date">
                    <span class="date-icon">📅</span>
                    <div>
                        <div class="date-text">${formatDate(app.appointment_date)}</div>
                        <div class="time-text">${formatTime(app.appointment_time)} • ${app.duration_minutes} min</div>
                    </div>
                </div>
                <span class="status-badge status-${app.status.toLowerCase()}">${app.status}</span>
            </div>
            <div class="card-body">
                <div class="info-row doctor-info-row">
                    <div class="doctor-avatar-small">
                        <img src="${doctorImage}" alt="${app.psychologist_first_name}" onerror="this.src='/media/default-avatar.png'">
                    </div>
                    <div>
                        <span class="info-label">Psychologist</span>
                        <div class="info-value">Dr. ${escapeHtml(app.psychologist_first_name)} ${escapeHtml(app.psychologist_last_name)}</div>
                        <div class="info-small">${escapeHtml(app.specialization || 'Clinical Psychologist')}</div>
                    </div>
                </div>
                ${app.therapy_dog_name ? `
                <div class="info-row dog-info-row">
                    <div class="dog-avatar-small">
                        <img src="${dogImage}" alt="${app.therapy_dog_name}" onerror="this.src='/media/default-dog.png'">
                    </div>
                    <div>
                        <span class="info-label">Therapy Animal</span>
                        <div class="info-value">${escapeHtml(app.therapy_dog_name)}</div>
                    </div>
                </div>
                ` : ''}
                <div class="info-row">
                    <span class="info-icon">📍</span>
                    <div>
                        <span class="info-label">Location</span>
                        <div class="info-value">${escapeHtml(app.clinic_location)}</div>
                    </div>
                </div>
            </div>
        </div>
    `}).join('');
}

// Update count badges
function updateCounts() {
    const upcomingCount = upcomingAppointments.length;
    const historyCount = pastAppointments.length;
    
    if (upcomingCountLabel) {
        upcomingCountLabel.textContent = `${upcomingCount} Upcoming`;
    }
    if (historyCountLabel) {
        historyCountLabel.textContent = `${historyCount} Past`;
    }
}

// Format date
function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Format time
function formatTime(timeString) {
    if (!timeString) return '—';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Open cancel modal
function openCancelModal(appointmentId) {
    cancelAppointmentId = appointmentId;
    const modal = document.getElementById('cancelModal');
    modal.classList.add('show');
}

// Close cancel modal
function closeCancelModal() {
    const modal = document.getElementById('cancelModal');
    modal.classList.remove('show');
    cancelAppointmentId = null;
}

// Confirm cancel appointment
async function confirmCancel() {
    if (!cancelAppointmentId) return;
    
    try {
        const response = await fetch(`/api/appointments/${cancelAppointmentId}/cancel`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cancellation_reason: 'Cancelled by user' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            closeCancelModal();
            showSuccessModal();
            await loadAppointments();
        } else {
            showToast(data.message || 'Failed to cancel appointment', true);
        }
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showToast('Network error', true);
    }
}

// Show success modal
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.add('show');
}

// Close success modal
function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.remove('show');
}

// Tab switching
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`${tabId}Tab`).classList.add('active');
        });
    });
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

// Initialize
async function init() {
    initTabs();
    await checkAuth();
}

// Make functions global
window.openCancelModal = openCancelModal;
window.closeCancelModal = closeCancelModal;
window.confirmCancel = confirmCancel;
window.closeSuccessModal = closeSuccessModal;

// Add confirm cancel listener
document.getElementById('confirmCancelBtn')?.addEventListener('click', confirmCancel);

// Start the app
init();