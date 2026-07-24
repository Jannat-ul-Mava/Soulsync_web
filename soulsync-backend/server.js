const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const adminRoutes = require('./routes/admin_routes');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── All API routes handled by admin_routes.js
app.use('/api', adminRoutes);

// ── Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

/* ═══════════════════════════════════════════════════
   SOULSYNC — server.js (CORRECTED - Uses your table names)
   Express + SQL Server (Windows Auth / ODBC Driver 18)
═══════════════════════════════════════════════════ */

const sql = require('mssql/msnodesqlv8');
const bcrypt = require('bcryptjs');
const session = require('express-session');


/* ── Middleware ── */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* Session */
app.use(session({
  secret: 'soulsync-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

/* Serve static files */
app.use(express.static(path.join(__dirname, 'public')));

/* ── SQL Server config ── */
const config = {
  connectionString:
    'Driver={ODBC Driver 18 for SQL Server};' +
    'Server=localhost;' +
    'Database=SoulSync;' +
    'Trusted_Connection=Yes;' +
    'TrustServerCertificate=Yes;'
};

/* ═══════════════════════════════════════════════════
   STARTUP
═══════════════════════════════════════════════════ */
async function startServer() {
  try {
    await sql.connect(config);
    console.log('✅ Database connected — SoulSync');

    // Ensure logins table exists
    await sql.query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='logins' AND xtype='U')
      CREATE TABLE logins (
        login_id INT PRIMARY KEY IDENTITY(1,1),
        user_id INT NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT GETDATE()
      )
    `);
    console.log('✅ logins table ready');

    app.listen(3000, () =>
      console.log('🚀 SoulSync server running → http://localhost:3000')
    );
  } catch (err) {
    console.error('❌ Startup error:', err.message);
    process.exit(1);
  }
}

startServer();

/* ═══════════════════════════════════════════════════
   AUTHENTICATION ROUTES
═══════════════════════════════════════════════════ */
app.post('/api/signup', async (req, res) => {
  const {
    full_name, email, password, phone, date_of_birth,
    gender, city, country, emergency_contact_name, emergency_contact_phone
  } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }

  try {
    const existing = await sql.query`SELECT user_id FROM users WHERE email = ${email}`;
    if (existing.recordset.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already exists.' });
    }

    const userResult = await sql.query`
      INSERT INTO users (
        full_name, email, phone, date_of_birth, gender,
        city, country, emergency_contact_name, emergency_contact_phone,
        account_type, is_active, email_verified
      )
      OUTPUT INSERTED.user_id AS new_id
      VALUES (
        ${full_name}, ${email}, ${phone || null}, ${date_of_birth || null},
        ${gender || null}, ${city || null}, ${country || null},
        ${emergency_contact_name || null}, ${emergency_contact_phone || null},
        'Patient', 1, 0
      )
    `;
    const userId = userResult.recordset[0].new_id;

    const hash = await bcrypt.hash(password, 12);
    await sql.query`INSERT INTO logins (user_id, password_hash) VALUES (${userId}, ${hash})`;

    console.log(`✅ New user registered: ${email}`);
    return res.status(201).json({ success: true, message: 'Account created successfully!' });

  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required.' });
  }

  try {
    const result = await sql.query`
      SELECT u.user_id AS uid, u.full_name, u.email, u.is_active, l.password_hash
      FROM users u
      JOIN logins l ON l.user_id = u.user_id
      WHERE u.email = ${email}
    `;

    if (result.recordset.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const user = result.recordset[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account deactivated.' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    await sql.query`UPDATE users SET last_login = GETDATE() WHERE user_id = ${user.uid}`;

    req.session.user = {
      user_id: user.uid,
      full_name: user.full_name,
      email: user.email
    };

    console.log(`✅ Login: ${email}`);
    return res.json({ success: true, message: 'Login successful!', user: { full_name: user.full_name, email: user.email } });

  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, message: 'Logged out.' });
});

app.get('/api/me', (req, res) => {
  if (req.session.user) {
    return res.json({ loggedIn: true, user: req.session.user });
  }
  return res.json({ loggedIn: false });
});

/* ═══════════════════════════════════════════════════
   ROUTINES API - ONLY CUSTOM ROUTINES
═══════════════════════════════════════════════════ */

// Get custom routines for logged-in user with today's completion status
app.get('/api/routines/custom', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    const userId = req.session.user.user_id;
    const today = new Date().toISOString().slice(0, 10);

    try {
        // Query using your existing table names: custom_routines and custom_routine_progress
        const result = await sql.query`
            SELECT 
                cr.custom_routine_id as id,
                cr.routine_name as name,
                cr.routine_time as time,
                cr.description,
                cr.category,
                cr.is_completed,
                CASE 
                    WHEN cp.progress_id IS NOT NULL THEN 1 
                    ELSE 0 
                END as completed_today,
                cr.display_order
            FROM custom_routines cr
            LEFT JOIN custom_routine_progress cp 
                ON cr.custom_routine_id = cp.custom_routine_id 
                AND cp.completion_date = ${today}
                AND cp.user_id = ${userId}
            WHERE cr.user_id = ${userId} 
                AND cr.is_active = 1
            ORDER BY cr.display_order, cr.created_at
        `;

        // Map the data for frontend
        const routines = result.recordset.map(routine => ({
            id: routine.id,
            name: routine.name,
            time: routine.time,
            description: routine.description,
            category: routine.category,
            completed: routine.completed_today === 1 || routine.is_completed === 1
        }));

        res.json({ success: true, routines: routines });
    } catch (err) {
        console.error('Error fetching custom routines:', err);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// Add custom routine
app.post('/api/routines/custom', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    const userId = req.session.user.user_id;
    const { name, time, description, category } = req.body;

    if (!name || !time) {
        return res.status(400).json({ success: false, message: 'Name and time required' });
    }

    try {
        // Check limit (max 10 custom routines)
        const countResult = await sql.query`
            SELECT COUNT(*) as count FROM custom_routines 
            WHERE user_id = ${userId} AND is_active = 1
        `;
        
        if (countResult.recordset[0].count >= 10) {
            return res.status(400).json({ success: false, message: 'Maximum 10 custom routines allowed' });
        }

        // Get max display order
        const orderResult = await sql.query`
            SELECT ISNULL(MAX(display_order), 0) + 1 as next_order
            FROM custom_routines 
            WHERE user_id = ${userId}
        `;
        const nextOrder = orderResult.recordset[0].next_order;

        const result = await sql.query`
            INSERT INTO custom_routines (
                user_id, routine_name, routine_time, description, category, 
                display_order, is_active, created_at, updated_at
            )
            OUTPUT INSERTED.custom_routine_id as id
            VALUES (
                ${userId}, ${name}, ${time}, ${description || null}, 
                ${category || 'Personal'}, ${nextOrder}, 1, GETDATE(), GETDATE()
            )
        `;

        console.log(`✅ Added custom routine for user ${userId}: ${name}`);
        res.json({ success: true, message: 'Routine added', id: result.recordset[0].id });
    } catch (err) {
        console.error('Error adding custom routine:', err);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// Delete custom routine (soft delete)
app.delete('/api/routines/custom/:id', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    const userId = req.session.user.user_id;
    const routineId = req.params.id;

    try {
        // Soft delete - just mark as inactive
        await sql.query`
            UPDATE custom_routines 
            SET is_active = 0, updated_at = GETDATE()
            WHERE custom_routine_id = ${routineId} AND user_id = ${userId}
        `;
        
        console.log(`✅ Deleted custom routine ${routineId} for user ${userId}`);
        res.json({ success: true, message: 'Routine deleted' });
    } catch (err) {
        console.error('Error deleting routine:', err);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// Toggle routine completion (uses your custom_routine_progress table)
app.post('/api/routines/toggle', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    const userId = req.session.user.user_id;
    const { routineId, completed, date } = req.body;
    const today = date || new Date().toISOString().slice(0, 10);

    try {
        if (completed) {
            // Add completion record to custom_routine_progress
            await sql.query`
                INSERT INTO custom_routine_progress (custom_routine_id, user_id, completion_date, completed_at)
                VALUES (${routineId}, ${userId}, ${today}, GETDATE())
            `;
            
            // Update the custom routine's is_completed flag
            await sql.query`
                UPDATE custom_routines 
                SET is_completed = 1, 
                    updated_at = GETDATE()
                WHERE custom_routine_id = ${routineId} AND user_id = ${userId}
            `;
            
            console.log(`✅ Completed routine ${routineId} for user ${userId}`);
        } else {
            // Remove completion record
            await sql.query`
                DELETE FROM custom_routine_progress 
                WHERE custom_routine_id = ${routineId} 
                    AND user_id = ${userId} 
                    AND completion_date = ${today}
            `;
            
            // Check if routine has any other completions on other dates
            const otherCompletions = await sql.query`
                SELECT COUNT(*) as count FROM custom_routine_progress 
                WHERE custom_routine_id = ${routineId} AND user_id = ${userId}
            `;
            
            const hasOtherCompletions = otherCompletions.recordset[0].count > 0;
            
            // Update the custom routine's is_completed flag
            await sql.query`
                UPDATE custom_routines 
                SET is_completed = ${hasOtherCompletions ? 1 : 0},
                    updated_at = GETDATE()
                WHERE custom_routine_id = ${routineId} AND user_id = ${userId}
            `;
            
            console.log(`✅ Unchecked routine ${routineId} for user ${userId}`);
        }
        
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        console.error('Error toggling routine:', err);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// Get routine statistics (streak, days tracked)
app.get('/api/routines/stats', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    const userId = req.session.user.user_id;

    try {
        // Get days tracked (distinct dates with at least one completion)
        const daysResult = await sql.query`
            SELECT COUNT(DISTINCT completion_date) as days_tracked
            FROM custom_routine_progress
            WHERE user_id = ${userId}
        `;
        
        // Calculate current streak
        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 30; i++) {
            const dateStr = currentDate.toISOString().slice(0, 10);
            const checkResult = await sql.query`
                SELECT COUNT(*) as has_completion 
                FROM custom_routine_progress 
                WHERE user_id = ${userId} AND completion_date = ${dateStr}
            `;
            
            if (checkResult.recordset[0].has_completion > 0) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        res.json({
            success: true,
            streak: streak,
            daysTracked: daysResult.recordset[0]?.days_tracked || 0
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// Optional: Add sample routines for a user (for testing)
app.post('/api/routines/add-sample', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    const userId = req.session.user.user_id;

    try {
        // Check if user already has routines
        const existing = await sql.query`
            SELECT COUNT(*) as count FROM custom_routines 
            WHERE user_id = ${userId} AND is_active = 1
        `;
        
        if (existing.recordset[0].count === 0) {
            // Add sample routines
            const sampleRoutines = [
                { name: 'Morning Meditation', time: '07:00', category: 'Mindfulness' },
                { name: 'Drink Water', time: '10:00', category: 'Health' },
                { name: 'Afternoon Walk', time: '15:00', category: 'Exercise' },
                { name: 'Read a Book', time: '20:00', category: 'Learning' },
                { name: 'Journaling', time: '21:30', category: 'Mental Health' }
            ];
            
            for (let i = 0; i < sampleRoutines.length; i++) {
                const routine = sampleRoutines[i];
                await sql.query`
                    INSERT INTO custom_routines (user_id, routine_name, routine_time, category, display_order, is_active, created_at, updated_at)
                    VALUES (${userId}, ${routine.name}, ${routine.time}, ${routine.category}, ${i + 1}, 1, GETDATE(), GETDATE())
                `;
            }
            
            console.log(`✅ Added sample routines for user ${userId}`);
            res.json({ success: true, message: 'Sample routines added!' });
        } else {
            res.json({ success: true, message: 'User already has routines' });
        }
    } catch (err) {
        console.error('Error adding sample routines:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});
/* ═══════════════════════════════════════════════════
   APPOINTMENT BOOKING API ENDPOINTS
   Add these to the end of your existing server.js
═══════════════════════════════════════════════════ */

// Get all psychologists
app.get('/api/psychologists', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    try {
        const result = await sql.query`
            SELECT 
                psychologist_id,
                first_name,
                last_name,
                specialization,
                qualification,
                experience_years,
                consultation_fee,
                bio,
                is_available
            FROM psychologists
            WHERE is_active = 1 AND status = 'Verified'
            ORDER BY first_name
        `;

        res.json({ success: true, psychologists: result.recordset });
    } catch (err) {
        console.error('Error fetching psychologists:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Get all therapy dogs
app.get('/api/therapy-dogs', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    try {
        const result = await sql.query`
            SELECT 
                dog_id,
                dog_name,
                breed,
                age,
                specialization,
                experience,
                description,
                is_active
            FROM TherapyDogs
            WHERE is_active = 1
            ORDER BY dog_name
        `;

        res.json({ success: true, dogs: result.recordset });
    } catch (err) {
        console.error('Error fetching therapy dogs:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Book appointment
app.post('/api/appointments', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    const userId = req.session.user.user_id;
    const { 
        psychologist_id, 
        appointment_date, 
        appointment_time, 
        duration_minutes,
        appointment_type,
        therapy_dog_id,
        notes,
        total_fee
    } = req.body;

    if (!psychologist_id || !appointment_date || !appointment_time) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        // Check if slot is available
        const slotCheck = await sql.query`
            SELECT COUNT(*) as count 
            FROM appointments 
            WHERE psychologist_id = ${psychologist_id} 
                AND appointment_date = ${appointment_date} 
                AND appointment_time = ${appointment_time}
                AND status NOT IN ('Cancelled', 'Completed')
        `;

        if (slotCheck.recordset[0].count > 0) {
            return res.status(409).json({ success: false, message: 'Time slot already booked' });
        }

        // Get clinic location from psychologist
        const psychResult = await sql.query`
            SELECT clinic_location FROM psychologists WHERE psychologist_id = ${psychologist_id}
        `;
        
        const clinicLocation = psychResult.recordset[0]?.clinic_location || 'SoulSync Clinic';

        // Insert appointment
        const result = await sql.query`
            INSERT INTO appointments (
                user_id, 
                psychologist_id, 
                therapy_dog_id,
                appointment_date, 
                appointment_time, 
                duration_minutes,
                appointment_type,
                status,
                clinic_location,
                booking_notes,
                created_at,
                updated_at
            )
            OUTPUT INSERTED.appointment_id as id
            VALUES (
                ${userId},
                ${psychologist_id},
                ${therapy_dog_id || null},
                ${appointment_date},
                ${appointment_time},
                ${duration_minutes || 60},
                ${appointment_type || 'Psychologist'},
                'Scheduled',
                ${clinicLocation},
                ${notes || null},
                GETDATE(),
                GETDATE()
            )
        `;

        const appointmentId = result.recordset[0].id;

        console.log(`✅ Appointment booked: ID ${appointmentId} for user ${userId}`);
        
        res.json({ 
            success: true, 
            message: 'Appointment booked successfully!',
            appointment_id: appointmentId
        });

    } catch (err) {
        console.error('Error booking appointment:', err);
        res.status(500).json({ success: false, message: 'Database error: ' + err.message });
    }
});

// Get user's appointments
app.get('/api/appointments', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    const userId = req.session.user.user_id;

    try {
        const result = await sql.query`
            SELECT 
                a.appointment_id,
                a.appointment_date,
                a.appointment_time,
                a.duration_minutes,
                a.appointment_type,
                a.status,
                a.clinic_location,
                a.booking_notes,
                p.first_name as psychologist_first_name,
                p.last_name as psychologist_last_name,
                p.specialization,
                d.dog_name as therapy_dog_name,
                d.breed as therapy_dog_breed
            FROM appointments a
            LEFT JOIN psychologists p ON a.psychologist_id = p.psychologist_id
            LEFT JOIN TherapyDogs d ON a.therapy_dog_id = d.dog_id
            WHERE a.user_id = ${userId}
            ORDER BY a.appointment_date DESC, a.appointment_time DESC
        `;

        res.json({ success: true, appointments: result.recordset });
    } catch (err) {
        console.error('Error fetching appointments:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Get all psychologists with image path
app.get('/api/psychologists', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    try {
        const result = await sql.query`
            SELECT 
                psychologist_id,
                first_name,
                last_name,
                specialization,
                qualification,
                experience_years,
                consultation_fee,
                bio,
                is_available,
                profile_picture_path
            FROM psychologists
            WHERE is_active = 1 AND status = 'Verified'
            ORDER BY first_name
        `;

        res.json({ success: true, psychologists: result.recordset });
    } catch (err) {
        console.error('Error fetching psychologists:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Get all therapy dogs with image path
app.get('/api/therapy-dogs', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    try {
        const result = await sql.query`
            SELECT 
                dog_id,
                dog_name,
                breed,
                age,
                specialization,
                experience,
                description,
                is_active,
                image_path
            FROM TherapyDogs
            WHERE is_active = 1
            ORDER BY dog_name
        `;

        res.json({ success: true, dogs: result.recordset });
    } catch (err) {
        console.error('Error fetching therapy dogs:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

// Cancel appointment
app.put('/api/appointments/:id/cancel', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    const userId = req.session.user.user_id;
    const appointmentId = req.params.id;
    const { cancellation_reason } = req.body;

    try {
        await sql.query`
            UPDATE appointments 
            SET status = 'Cancelled',
                cancellation_reason = ${cancellation_reason || null},
                updated_at = GETDATE()
            WHERE appointment_id = ${appointmentId} AND user_id = ${userId}
        `;

        res.json({ success: true, message: 'Appointment cancelled successfully' });
    } catch (err) {
        console.error('Error cancelling appointment:', err);
        res.status(500).json({ success: false, message: 'Database error' });
    }
});

console.log('✅ Appointment booking API endpoints loaded');