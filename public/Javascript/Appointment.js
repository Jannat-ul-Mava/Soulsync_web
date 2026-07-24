/* ═══════════════════════════════════════════════════
   SOULSYNC APPOINTMENT BOOKING JS - USING NUMBERED IMAGES
═══════════════════════════════════════════════════ */

// Global variables
let currentUser = null;
let psychologists = [];
let therapyDogs = [];
let selectedPsychologist = null;
let selectedDog = null;
let includeDog = false;

// DOM Elements
const psychologistsContainer = document.getElementById('psychologistsContainer');
const therapyDogsContainer = document.getElementById('therapyDogsContainer');
const selectedPsychologistLabel = document.getElementById('selectedPsychologistLabel');
const selectedDogLabel = document.getElementById('selectedDogLabel');
const includeTherapyDogCheckbox = document.getElementById('includeTherapyDogCheckbox');
const appointmentDate = document.getElementById('appointmentDate');
const timeSlot = document.getElementById('timeSlot');
const duration = document.getElementById('duration');
const notes = document.getElementById('notes');
const totalFeeLabel = document.getElementById('totalFeeLabel');
const confirmBtn = document.getElementById('confirmBookingBtn');
const therapyDogSection = document.getElementById('therapyDogSection');

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
    }, 3000);
}

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/me');
        const data = await response.json();
        
        if (data.loggedIn) {
            currentUser = data.user;
            await loadPsychologists();
            await loadTherapyDogs();
            setMinDate();
            setupEventListeners();
        } else {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showToast('Authentication failed', true);
    }
}

// Set minimum date for appointment
function setMinDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const minDate = tomorrow.toISOString().split('T')[0];
    appointmentDate.min = minDate;
    appointmentDate.value = minDate;
}

// Load psychologists from database
async function loadPsychologists() {
    try {
        const response = await fetch('/api/psychologists');
        const data = await response.json();
        
        if (data.success) {
            psychologists = data.psychologists;
            renderPsychologists();
            console.log('Psychologists loaded:', psychologists.length);
        } else {
            showToast('Failed to load psychologists', true);
        }
    } catch (error) {
        console.error('Error loading psychologists:', error);
        showToast('Network error loading psychologists', true);
    }
}

// Render psychologists with numbered images (doctor1.jpg, doctor2.jpg, etc.)
function renderPsychologists() {
    if (!psychologistsContainer) return;
    
    if (psychologists.length === 0) {
        psychologistsContainer.innerHTML = '<div class="loading-spinner">No psychologists available</div>';
        return;
    }
    
    // Use document fragment to prevent flickering
    const fragment = document.createDocumentFragment();
    
    psychologists.forEach((psych, index) => {
        const card = document.createElement('div');
        card.className = 'psychologist-card';
        card.setAttribute('data-id', psych.psychologist_id);
        card.onclick = () => selectPsychologist(psych.psychologist_id);
        
        // Use numbered images: doctor1.jpg, doctor2.jpg, doctor3.jpg
        // Index + 1 to start from 1 (doctor1.jpg, doctor2.jpg, doctor3.jpg)
        const imageNumber = (index % 4) + 1; // Cycles through 1,2,3,4
        const imagePath = `/media/doctor${imageNumber}.jpg`;
        
        card.innerHTML = `
            <div class="doctor-avatar">
                <img src="${imagePath}" alt="${psych.first_name}" loading="lazy" onerror="this.src='/media/default-avatar.png'">
            </div>
            <div class="doctor-info">
                <div class="doctor-name">Dr. ${escapeHtml(psych.first_name)} ${escapeHtml(psych.last_name)}</div>
                <div class="doctor-specialty">${escapeHtml(psych.specialization || 'Clinical Psychologist')}</div>
                <div class="doctor-qualification">${escapeHtml(psych.qualification || 'PhD, Licensed Therapist')}</div>
                <div class="doctor-fee">Rs. ${psych.consultation_fee || 3000}/session</div>
            </div>
        `;
        fragment.appendChild(card);
    });
    
    // Clear and append once to prevent flickering
    psychologistsContainer.innerHTML = '';
    psychologistsContainer.appendChild(fragment);
}

// Select psychologist
function selectPsychologist(id) {
    selectedPsychologist = psychologists.find(p => p.psychologist_id === id);
    
    document.querySelectorAll('.psychologist-card').forEach(card => {
        card.classList.remove('selected');
        if (parseInt(card.dataset.id) === id) {
            card.classList.add('selected');
        }
    });
    
    selectedPsychologistLabel.textContent = `Dr. ${selectedPsychologist.first_name} ${selectedPsychologist.last_name} - ${selectedPsychologist.specialization || 'Clinical Psychologist'}`;
    
    updateTotalFee();
    validateForm();
}

// Load therapy dogs from database
async function loadTherapyDogs() {
    try {
        const response = await fetch('/api/therapy-dogs');
        const data = await response.json();
        
        if (data.success) {
            therapyDogs = data.dogs;
            renderTherapyDogs();
            console.log('Therapy dogs loaded:', therapyDogs.length);
        } else {
            therapyDogsContainer.innerHTML = '<div class="loading-spinner">No therapy animals available</div>';
        }
    } catch (error) {
        console.error('Error loading therapy dogs:', error);
        therapyDogsContainer.innerHTML = '<div class="loading-spinner">Error loading therapy animals</div>';
    }
}

// Render therapy dogs with numbered images (dog1.jpg, dog2.jpg, dog3.jpg, dog4.jpg)
function renderTherapyDogs() {
    if (!therapyDogsContainer) return;
    
    if (therapyDogs.length === 0) {
        therapyDogsContainer.innerHTML = '<div class="loading-spinner">No therapy animals available</div>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    therapyDogs.forEach((dog, index) => {
        const card = document.createElement('div');
        card.className = 'dog-card';
        card.setAttribute('data-id', dog.dog_id);
        card.onclick = () => selectTherapyDog(dog.dog_id);
        
        // Use numbered images: dog1.jpg, dog2.jpg, dog3.jpg, dog4.jpg
        // Index + 1 to start from 1 (dog1.jpg, dog2.jpg, dog3.jpg, dog4.jpg)
        const imageNumber = (index % 4) + 1; // Cycles through 1,2,3,4
        const imagePath = `/media/dog${imageNumber}.jpg`;
        
        card.innerHTML = `
            <div class="dog-avatar">
                <img src="${imagePath}" alt="${dog.dog_name}" loading="lazy" onerror="this.src='/media/default-dog.png'">
            </div>
            <div class="dog-name">${escapeHtml(dog.dog_name)}</div>
            <div class="dog-breed">${escapeHtml(dog.breed)}</div>
            <div class="dog-specialty">${escapeHtml(dog.specialization)}</div>
        `;
        fragment.appendChild(card);
    });
    
    therapyDogsContainer.innerHTML = '';
    therapyDogsContainer.appendChild(fragment);
    
    // Initially disable dog cards
    if (!includeDog) {
        document.querySelectorAll('.dog-card').forEach(card => {
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';
        });
    }
}

// Select therapy dog
function selectTherapyDog(id) {
    if (!includeDog) {
        showToast('Please enable Pet Therapy option first', true);
        return;
    }
    
    selectedDog = therapyDogs.find(d => d.dog_id === id);
    
    document.querySelectorAll('.dog-card').forEach(card => {
        card.classList.remove('selected');
        if (parseInt(card.dataset.id) === id) {
            card.classList.add('selected');
        }
    });
    
    selectedDogLabel.textContent = `${selectedDog.dog_name} (${selectedDog.breed}) - Specializes in ${selectedDog.specialization}`;
    
    updateTotalFee();
    validateForm();
}

// Update total fee
function updateTotalFee() {
    let total = 0;
    
    if (selectedPsychologist) {
        total += selectedPsychologist.consultation_fee || 3000;
    }
    
    if (includeDog && selectedDog) {
        total += 1500;
    }
    
    totalFeeLabel.textContent = `Rs. ${total}`;
}

// Validate form
function validateForm() {
    const isValid = selectedPsychologist && 
                    appointmentDate.value && 
                    timeSlot.value;
    
    confirmBtn.disabled = !isValid;
}

// Book appointment
async function bookAppointment() {
    if (!selectedPsychologist) {
        showToast('Please select a psychologist', true);
        return;
    }
    
    if (!appointmentDate.value) {
        showToast('Please select a date', true);
        return;
    }
    
    if (!timeSlot.value) {
        showToast('Please select a time slot', true);
        return;
    }
    
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Booking...';
    
    const appointmentData = {
        psychologist_id: selectedPsychologist.psychologist_id,
        appointment_date: appointmentDate.value,
        appointment_time: timeSlot.value,
        duration_minutes: parseInt(duration.value),
        appointment_type: includeDog && selectedDog ? 'Combined' : 'Psychologist',
        therapy_dog_id: includeDog && selectedDog ? selectedDog.dog_id : null,
        notes: notes.value || null,
        total_fee: parseInt(totalFeeLabel.textContent.replace('Rs. ', ''))
    };
    
    try {
        const response = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointmentData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccessModal();
        } else if (response.status === 409) {
            showToast('❌ This time slot is already booked. Please select a different time.', true);
        } else {
            showToast(data.message || 'Failed to book appointment', true);
        }
    } catch (error) {
        console.error('Error booking appointment:', error);
        showToast('Network error. Please try again.', true);
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirm Appointment';
    }
}

// Show success modal
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    modal.classList.add('show');
    
    setTimeout(() => {
        modal.classList.remove('show');
        window.location.href = '/myappointments.html';
    }, 3000);
}

// Reset form
function resetForm() {
    selectedPsychologist = null;
    selectedDog = null;
    includeDog = false;
    
    document.querySelectorAll('.psychologist-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelectorAll('.dog-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    selectedPsychologistLabel.textContent = 'Not selected';
    selectedDogLabel.textContent = 'Not selected';
    includeTherapyDogCheckbox.checked = false;
    notes.value = '';
    timeSlot.value = '';
    
    updateTotalFee();
    validateForm();
}

// Close modal
function closeModal() {
    const modal = document.getElementById('successModal');
    modal.classList.remove('show');
    window.location.href = '/dashboard.html';
}

// Toggle therapy dog section
function toggleTherapyDog() {
    includeDog = includeTherapyDogCheckbox.checked;
    
    const dogCards = document.querySelectorAll('.dog-card');
    
    if (!includeDog) {
        selectedDog = null;
        selectedDogLabel.textContent = 'Not selected';
        dogCards.forEach(card => {
            card.classList.remove('selected');
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';
        });
    } else {
        dogCards.forEach(card => {
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
        });
        
        if (therapyDogs.length === 0) {
            loadTherapyDogs();
        }
    }
    
    updateTotalFee();
    validateForm();
}

// Setup event listeners
function setupEventListeners() {
    includeTherapyDogCheckbox.addEventListener('change', toggleTherapyDog);
    appointmentDate.addEventListener('change', validateForm);
    timeSlot.addEventListener('change', validateForm);
    duration.addEventListener('change', updateTotalFee);
    confirmBtn.addEventListener('click', bookAppointment);
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
    await checkAuth();
}

// Make functions global
window.selectPsychologist = selectPsychologist;
window.selectTherapyDog = selectTherapyDog;
window.closeModal = closeModal;

// Start the app
init();