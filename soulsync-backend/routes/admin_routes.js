/* ═══════════════════════════════════════════════════════════
   SOULSYNC — Express API Routes (admin_routes.js)
   Place this file in your routes/ folder and require it in
   your main app.js / server.js like:
       const adminRoutes = require('./routes/admin_routes');
       app.use('/api', adminRoutes);
   ═══════════════════════════════════════════════════════════ */

const express = require('express');
const router  = express.Router();
const sql     = require('mssql');
const bcrypt = require('bcrypt');
/* ──────────────────────────────────────────────────────────
   DB CONFIG  — put real credentials in .env
   ────────────────────────────────────────────────────────── */
const dbConfig = {
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || 'StrongPass123!',
  server:   process.env.DB_SERVER   || 'localhost',
  database: process.env.DB_NAME     || 'SoulSync',
  options: {
    encrypt:              false,   // true if Azure
    trustServerCertificate: true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

/* ── Shared connection pool (created once on first use) ── */
let _pool = null;
async function getPool() {
  if (!_pool) _pool = await sql.connect(dbConfig);
  return _pool;
}

/* ── Tiny query helper ── */
async function query(qStr, params = {}) {
  const pool = await getPool();
  const req  = pool.request();
  Object.entries(params).forEach(([k, { type, value }]) => req.input(k, type, value));
  return req.query(qStr);
}

/* ── Error responder ── */
function dbErr(res, e, context = '') {
  console.error(`DB Error${context ? ' ['+context+']' : ''}:`, e.message);
  res.status(500).json({ success: false, message: e.message });
}

/* ══════════════════════════════════════════════════════════
   ADMIN STATS  —  GET /api/admin/stats
   Returns counts for dashboard stat cards
   ══════════════════════════════════════════════════════════ */
router.get('/admin/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        (SELECT COUNT(*) FROM users         WHERE is_active = 1) AS totalUsers,
        (SELECT COUNT(*) FROM psychologists  WHERE is_active = 1) AS totalPsychs,
        (SELECT COUNT(*) FROM TherapyDogs    WHERE is_active = 1) AS totalAnimals,
        (SELECT COUNT(*) FROM appointments   WHERE status = 'Scheduled') AS pendingAppts,
        (SELECT COUNT(*) FROM appointments
           WHERE cancel_requested = 1
             AND status NOT IN ('Cancelled','Completed')) AS cancelRequests
    `);
    res.json(result.recordset[0]);
  } catch (e) { dbErr(res, e, 'GET /admin/stats'); }
});

/* ══════════════════════════════════════════════════════════
   USERS  —  GET /api/users
   Fetches all columns from the users table
   ══════════════════════════════════════════════════════════ */
router.get('/users', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        user_id, full_name, email, phone,
        CONVERT(VARCHAR(10), date_of_birth, 23) AS date_of_birth,
        gender, account_type, address,
        city, country,
        emergency_contact_name, emergency_contact_phone,
        is_active, email_verified,
        CONVERT(VARCHAR(10), created_at, 23) AS created_at
      FROM users
      ORDER BY user_id
    `);
    res.json({ success: true, users: result.recordset });
  } catch (e) { dbErr(res, e, 'GET /users'); }
});

/* ══════════════════════════════════════════════════════════
   PSYCHOLOGISTS  —  GET /api/psychologists
   Fetches all columns matching the psychologists table schema
   ══════════════════════════════════════════════════════════ */
router.get('/psychologists', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        psychologist_id, first_name, last_name, email, phone_number,
        gender, specialization, license_number,
        experience_years, consultation_fee,
        clinic_location, available_days,
        bio, status, is_available, is_active,
        CONVERT(VARCHAR(10), created_at, 23) AS created_at
      FROM psychologists
      ORDER BY psychologist_id
    `);
    res.json({ success: true, psychologists: result.recordset });
  } catch (e) { dbErr(res, e, 'GET /psychologists'); }
});

/* ──────────────────────────────────────────────────────────
   POST /api/psychologists  — Add new psychologist
   Mirrors RegisterPsychologist stored procedure logic
   ────────────────────────────────────────────────────────── */
router.post('/psychologists', async (req, res) => {
  const {
    first_name, last_name, email, phone_number, gender,
    specialization, license_number, experience_years,
    consultation_fee, clinic_location, available_days,
    bio, status, is_available, is_active,
  } = req.body;

  if (!first_name || !last_name || !email || !specialization || !license_number || !consultation_fee) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('first_name',       sql.NVarChar(100),    first_name);
    request.input('last_name',        sql.NVarChar(100),    last_name);
    request.input('email',            sql.NVarChar(100),    email);
    request.input('phone_number',     sql.NVarChar(20),     phone_number   || null);
    request.input('gender',           sql.NVarChar(20),     gender         || null);
    request.input('specialization',   sql.NVarChar(200),    specialization);
    request.input('license_number',   sql.NVarChar(100),    license_number);
    request.input('experience_years', sql.Int,              parseInt(experience_years) || 0);
    request.input('consultation_fee', sql.Decimal(10,2),    parseFloat(consultation_fee) || 0);
    request.input('clinic_location',  sql.NVarChar(255),    clinic_location || null);
    request.input('available_days',   sql.NVarChar(100),    available_days  || null);
    request.input('bio',              sql.NVarChar(sql.MAX), bio            || null);
    request.input('status',           sql.NVarChar(50),     status         || 'NotChecked');
    request.input('is_available',     sql.Bit,              is_available   ?? 1);
    request.input('is_active',        sql.Bit,              is_active      ?? 1);

    const result = await request.query(`
      INSERT INTO psychologists (
        first_name, last_name, email, phone_number, gender,
        specialization, license_number, experience_years,
        consultation_fee, clinic_location, available_days,
        bio, status, is_available, is_active
      ) OUTPUT INSERTED.psychologist_id
      VALUES (
        @first_name, @last_name, @email, @phone_number, @gender,
        @specialization, @license_number, @experience_years,
        @consultation_fee, @clinic_location, @available_days,
        @bio, @status, @is_available, @is_active
      )
    `);

    const newId = result.recordset[0].psychologist_id;
    res.status(201).json({ success: true, psychologist_id: newId });
  } catch (e) { dbErr(res, e, 'POST /psychologists'); }
});

/* ──────────────────────────────────────────────────────────
   PUT /api/psychologists/:id  — Edit/update psychologist
   Updates ALL editable columns from psychologists table
   ────────────────────────────────────────────────────────── */
router.put('/psychologists/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid ID' });

  const {
    first_name, last_name, email, phone_number, gender, date_of_birth,
    specialization, qualification, license_number,
    experience_years, years_of_experience,
    consultation_fee, hourly_rate, clinic_location, available_days,
    bio, status, is_available, is_active,
  } = req.body;

  if (!first_name || !last_name || !email || !specialization || !license_number) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('id',                  sql.Int,           id);
    request.input('first_name',          sql.NVarChar(100), first_name);
    request.input('last_name',           sql.NVarChar(100), last_name);
    request.input('email',               sql.NVarChar(100), email);
    request.input('phone_number',        sql.NVarChar(20),  phone_number  || null);
    request.input('gender',              sql.NVarChar(20),  gender        || null);
    request.input('date_of_birth',       sql.Date,          date_of_birth || null);
    request.input('specialization',      sql.NVarChar(200), specialization);
    request.input('qualification',       sql.NVarChar(255), qualification  || null);
    request.input('license_number',      sql.NVarChar(100), license_number);
    request.input('experience_years',    sql.Int,           experience_years    || 0);
    request.input('years_of_experience', sql.Int,           years_of_experience || 0);
    request.input('consultation_fee',    sql.Decimal(10,2), parseFloat(consultation_fee) || 0);
    request.input('hourly_rate',         sql.Decimal(10,2), parseFloat(hourly_rate)      || 0);
    request.input('clinic_location',     sql.NVarChar(255), clinic_location || null);
    request.input('available_days',      sql.NVarChar(100), available_days  || null);
    request.input('bio',                 sql.NVarChar(sql.MAX), bio        || null);
    request.input('status',              sql.NVarChar(50),  status         || 'NotChecked');
    request.input('is_available',        sql.Bit,           is_available   ?? 1);
    request.input('is_active',           sql.Bit,           is_active      ?? 1);

    await request.query(`
      UPDATE psychologists SET
        first_name          = @first_name,
        last_name           = @last_name,
        email               = @email,
        phone_number        = @phone_number,
        gender              = @gender,
        date_of_birth       = @date_of_birth,
        specialization      = @specialization,
        qualification       = @qualification,
        license_number      = @license_number,
        experience_years    = @experience_years,
        years_of_experience = @years_of_experience,
        consultation_fee    = @consultation_fee,
        hourly_rate         = @hourly_rate,
        clinic_location     = @clinic_location,
        available_days      = @available_days,
        bio                 = @bio,
        status              = @status,
        is_available        = @is_available,
        is_active           = @is_active,
        updated_at          = GETDATE()
      WHERE psychologist_id = @id
    `);

    res.json({ success: true, message: 'Psychologist updated successfully' });
  } catch (e) { dbErr(res, e, 'PUT /psychologists/:id'); }
});

/* ──────────────────────────────────────────────────────────
   PATCH /api/psychologists/:id/status  — Verify / reject
   ────────────────────────────────────────────────────────── */
router.patch('/psychologists/:id/status', async (req, res) => {
  const id     = parseInt(req.params.id);
  const { status } = req.body;
  const allowed = ['Verified','NotVerified','NotChecked'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }
  try {
    await query(`
      UPDATE psychologists
      SET status = @status, updated_at = GETDATE()
      WHERE psychologist_id = @id
    `, {
      status: { type: sql.NVarChar(50), value: status },
      id:     { type: sql.Int,          value: id     },
    });
    res.json({ success: true });
  } catch (e) { dbErr(res, e, 'PATCH /psychologists/:id/status'); }
});

/* ──────────────────────────────────────────────────────────
   DELETE /api/psychologists/:id
   ────────────────────────────────────────────────────────── */
router.delete('/psychologists/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await query(
      'DELETE FROM psychologists WHERE psychologist_id = @id',
      { id: { type: sql.Int, value: id } }
    );
    res.json({ success: true });
  } catch (e) { dbErr(res, e, 'DELETE /psychologists/:id'); }
});

/* ══════════════════════════════════════════════════════════
   THERAPY ANIMALS  —  GET /api/therapy-animals
   Fetches all columns from TherapyDogs table
   (dogs AND cats — type column added by your team)
   ══════════════════════════════════════════════════════════ */
router.get('/therapy-animals', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        dog_id, dog_name,
        -- If you added a 'type' column: type,
        -- Otherwise default to 'Dog':
        ISNULL(type, 'Dog') AS type,
        breed, age, temperament, specialization,
        experience, certification_level, health_status,
        image_path, description,
        CONVERT(VARCHAR(10), birthday_date, 23) AS birthday_date,
        trainer_name, therapy_specialities,
        CAST(success_rate AS FLOAT) AS success_rate,
        is_active,
        CONVERT(VARCHAR(10), created_date, 23) AS created_date
      FROM TherapyDogs
      ORDER BY dog_id
    `);
    res.json({ success: true, animals: result.recordset });
  } catch (e) { dbErr(res, e, 'GET /therapy-animals'); }
});

/* ──────────────────────────────────────────────────────────
   POST /api/therapy-animals  — Add new animal (dog or cat)
   ────────────────────────────────────────────────────────── */
router.post('/therapy-animals', async (req, res) => {
  const {
    dog_name, type, breed, age, birthday_date, temperament,
    specialization, experience, certification_level,
    health_status, success_rate, trainer_name,
    therapy_specialities, description, is_active,
  } = req.body;

  if (!dog_name || !breed || !trainer_name || !specialization || !description) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('dog_name',             sql.NVarChar(100), dog_name);
    request.input('type',                 sql.NVarChar(20),  type          || 'Dog');
    request.input('breed',                sql.NVarChar(100), breed);
    request.input('age',                  sql.Int,           age           || 0);
    request.input('birthday_date',        sql.Date,          birthday_date || null);
    request.input('temperament',          sql.NVarChar(500), temperament   || '');
    request.input('specialization',       sql.NVarChar(200), specialization);
    request.input('experience',           sql.Int,           experience    || 0);
    request.input('certification_level',  sql.NVarChar(100), certification_level || 'Level 1 - Basic');
    request.input('health_status',        sql.NVarChar(100), health_status || 'Excellent');
    request.input('success_rate',         sql.Decimal(5,2),  parseFloat(success_rate) || 0);
    request.input('trainer_name',         sql.NVarChar(150), trainer_name);
    request.input('therapy_specialities', sql.NVarChar(500), therapy_specialities || '');
    request.input('description',          sql.NVarChar(sql.MAX), description);
    request.input('is_active',            sql.Bit,           is_active     ?? 1);

    // Note: if your TherapyDogs table does NOT yet have a 'type' column,
    // remove the 'type' line from INSERT below and add it via ALTER TABLE:
    //   ALTER TABLE TherapyDogs ADD type NVARCHAR(20) NOT NULL DEFAULT 'Dog';
    const result = await request.query(`
      INSERT INTO TherapyDogs (
        dog_name, type, breed, age, birthday_date, temperament,
        specialization, experience, certification_level,
        health_status, success_rate, trainer_name,
        therapy_specialities, description, is_active
      ) OUTPUT INSERTED.dog_id
      VALUES (
        @dog_name, @type, @breed, @age, @birthday_date, @temperament,
        @specialization, @experience, @certification_level,
        @health_status, @success_rate, @trainer_name,
        @therapy_specialities, @description, @is_active
      )
    `);

    res.status(201).json({ success: true, dog_id: result.recordset[0].dog_id });
  } catch (e) { dbErr(res, e, 'POST /therapy-animals'); }
});

/* ──────────────────────────────────────────────────────────
   PATCH /api/therapy-animals/:id/toggle  — Activate/Deactivate
   ────────────────────────────────────────────────────────── */
router.patch('/therapy-animals/:id/toggle', async (req, res) => {
  const id       = parseInt(req.params.id);
  const is_active = req.body.is_active ?? 1;
  try {
    await query(`
      UPDATE TherapyDogs
      SET is_active = @is_active, updated_date = GETDATE()
      WHERE dog_id = @id
    `, {
      is_active: { type: sql.Bit, value: is_active },
      id:        { type: sql.Int, value: id        },
    });
    res.json({ success: true });
  } catch (e) { dbErr(res, e, 'PATCH /therapy-animals/:id/toggle'); }
});

/* ──────────────────────────────────────────────────────────
   DELETE /api/therapy-animals/:id
   ────────────────────────────────────────────────────────── */
router.delete('/therapy-animals/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await query(
      'DELETE FROM TherapyDogs WHERE dog_id = @id',
      { id: { type: sql.Int, value: id } }
    );
    res.json({ success: true });
  } catch (e) { dbErr(res, e, 'DELETE /therapy-animals/:id'); }
});

/* ══════════════════════════════════════════════════════════
   CANCEL REQUESTS  —  GET /api/appointments/cancel-requests
   These are appointments where the patient has requested
   cancellation (you can store them as a separate table or
   use a flag column — this example uses a flag approach).
   ══════════════════════════════════════════════════════════
   NOTE: Add this column to appointments table if not there:
     ALTER TABLE appointments ADD cancel_requested BIT DEFAULT 0;
     ALTER TABLE appointments ADD cancel_reason NVARCHAR(MAX);
     ALTER TABLE appointments ADD cancel_requested_at DATETIME;
   ══════════════════════════════════════════════════════════ */
router.get('/appointments/cancel-requests', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        a.appointment_id                               AS request_id,
        a.appointment_id,
        u.full_name                                    AS user_name,
        p.first_name + ' ' + p.last_name              AS psychologist_name,
        CONVERT(VARCHAR(10), a.appointment_date, 23)   AS appointment_date,
        CONVERT(VARCHAR(5),  a.appointment_time, 108)  AS appointment_time,
        ISNULL(a.cancel_reason, 'Not specified')       AS reason,
        CONVERT(VARCHAR(19), a.cancel_requested_at, 120) AS requested_at
      FROM appointments a
      LEFT JOIN users         u ON a.user_id         = u.user_id
      LEFT JOIN psychologists p ON a.psychologist_id = p.psychologist_id
      WHERE a.cancel_requested = 1
        AND a.status NOT IN ('Cancelled','Completed')
      ORDER BY a.cancel_requested_at
    `);
    res.json({ success: true, requests: result.recordset });
  } catch (e) { dbErr(res, e, 'GET /appointments/cancel-requests'); }
});

/* ──────────────────────────────────────────────────────────
   POST /api/appointments/cancel-requests/:reqId/approve
   Admin approves a patient cancel request
   ────────────────────────────────────────────────────────── */
router.post('/appointments/cancel-requests/:reqId/approve', async (req, res) => {
  const apptId = parseInt(req.params.reqId);   // reqId = appointment_id in this schema

  // 12-hour rule check
  try {
    const check = await query(`
      SELECT appointment_date, appointment_time
      FROM appointments WHERE appointment_id = @id
    `, { id: { type: sql.Int, value: apptId } });

    if (!check.recordset.length)
      return res.status(404).json({ success: false, message: 'Appointment not found' });

    const { appointment_date, appointment_time } = check.recordset[0];
    const apptDt = new Date(`${String(appointment_date).split('T')[0]}T${String(appointment_time).padStart(5,'0')}:00`);
    const diffH  = (apptDt - new Date()) / 3_600_000;

    if (diffH <= 12)
      return res.status(400).json({
        success: false,
        message: 'Cannot approve cancel: less than 12 hours before appointment.'
      });

    await query(`
      UPDATE appointments
      SET status              = 'Cancelled',
          cancel_requested    = 0,
          updated_at          = GETDATE()
      WHERE appointment_id = @id
    `, { id: { type: sql.Int, value: apptId } });

    res.json({ success: true, message: 'Cancel request approved' });
  } catch (e) { dbErr(res, e, 'POST /cancel-requests/:reqId/approve'); }
});

/* ──────────────────────────────────────────────────────────
   POST /api/appointments/cancel-requests/:reqId/reject
   Admin rejects a patient cancel request (keep appointment)
   ────────────────────────────────────────────────────────── */
router.post('/appointments/cancel-requests/:reqId/reject', async (req, res) => {
  const apptId = parseInt(req.params.reqId);
  try {
    await query(`
      UPDATE appointments
      SET cancel_requested = 0,
          updated_at       = GETDATE()
      WHERE appointment_id = @id
    `, { id: { type: sql.Int, value: apptId } });
    res.json({ success: true, message: 'Cancel request rejected' });
  } catch (e) { dbErr(res, e, 'POST /cancel-requests/:reqId/reject'); }
});

/* ══════════════════════════════════════════════════════════
   APPOINTMENTS  —  GET /api/appointments?status=Scheduled,Confirmed
   Joins appointments with users and psychologists for display names
   ══════════════════════════════════════════════════════════ */
router.get('/appointments', async (req, res) => {
  const statusParam = req.query.status || '';
  const pool = await getPool();
  const request = pool.request();

  let whereClause = '';
  if (statusParam) {
    const statuses = statusParam.split(',').map(s => s.trim());
    const paramNames = statuses.map((s, i) => {
      request.input(`status${i}`, sql.NVarChar(50), s);
      return `@status${i}`;
    });
    whereClause = `WHERE a.status IN (${paramNames.join(',')})`;
  }

  try {
    const result = await request.query(`
      SELECT
        a.appointment_id,
        a.user_id,
        ISNULL(u.full_name, 'Unknown')                        AS user_name,
        a.psychologist_id,
        ISNULL(p.first_name + ' ' + p.last_name, 'Unknown')  AS psychologist_name,
        a.therapy_dog_id,
        CONVERT(VARCHAR(10), a.appointment_date, 23)          AS appointment_date,
        CONVERT(VARCHAR(5),  a.appointment_time, 108)         AS appointment_time,
        a.duration_minutes,
        a.appointment_type,
        a.status,
        a.clinic_location,
        a.booking_notes,
        a.cancellation_reason,
        ISNULL(a.consultation_fee, p.consultation_fee)        AS consultation_fee,
        CONVERT(VARCHAR(19), a.created_at, 120)               AS created_at
      FROM appointments a
      LEFT JOIN users         u ON a.user_id         = u.user_id
      LEFT JOIN psychologists p ON a.psychologist_id = p.psychologist_id
      ${whereClause}
      ORDER BY a.appointment_date ASC, a.appointment_time ASC
    `);

    res.json({ success: true, appointments: result.recordset });
  } catch (e) { dbErr(res, e, 'GET /appointments'); }
});

/* ──────────────────────────────────────────────────────────
   PATCH /api/appointments/:id/status  — Approve or Cancel
   ────────────────────────────────────────────────────────── */
router.patch('/appointments/:id/status', async (req, res) => {
  const id     = parseInt(req.params.id);
  const { status, cancellation_reason } = req.body;
  const allowed = ['Scheduled','Confirmed','Completed','Cancelled','No-Show','Rescheduled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  // Enforce 12-hour cancellation rule for Cancelled status
  if (status === 'Cancelled') {
    try {
      const check = await query(`
        SELECT appointment_date, appointment_time
        FROM appointments WHERE appointment_id = @id
      `, { id: { type: sql.Int, value: id } });

      if (!check.recordset.length) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      const { appointment_date, appointment_time } = check.recordset[0];
      const apptDt = new Date(`${String(appointment_date).split('T')[0]}T${String(appointment_time).padStart(5,'0')}:00`);
      const diffH  = (apptDt - new Date()) / 3_600_000;

      if (diffH <= 12) {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel an appointment within 12 hours of its scheduled time.'
        });
      }
    } catch (e) { return dbErr(res, e, 'PATCH /appointments/:id/status — 12h check'); }
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('id',                   sql.Int,          id);
    request.input('status',               sql.NVarChar(50), status);
    request.input('cancellation_reason',  sql.NVarChar(sql.MAX), cancellation_reason || null);

    await request.query(`
      UPDATE appointments
      SET status               = @status,
          cancellation_reason  = CASE WHEN @status = 'Cancelled' THEN @cancellation_reason ELSE cancellation_reason END,
          updated_at           = GETDATE()
      WHERE appointment_id = @id
    `);

    res.json({ success: true, message: `Appointment status updated to ${status}` });
  } catch (e) { dbErr(res, e, 'PATCH /appointments/:id/status'); }
});

/* ──────────────────────────────────────────────────────────
   DELETE /api/appointments/:id  — Delete history record
   ────────────────────────────────────────────────────────── */
router.delete('/appointments/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await query(
      'DELETE FROM appointments WHERE appointment_id = @id',
      { id: { type: sql.Int, value: id } }
    );
    res.json({ success: true });
  } catch (e) { dbErr(res, e, 'DELETE /appointments/:id'); }
});

router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    // Join logins table (password lives there) with admin table
    const result = await query(`
      SELECT
        l.login_id,
        l.password_hash,
        l.is_locked,
        l.login_attempts,
        a.admin_id,
        a.full_name,
        a.email,
        a.is_active
      FROM logins l
      JOIN admin a ON l.reference_id = a.admin_id
      WHERE l.email     = @email
        AND l.user_type = 'Admin'
    `, {
      email: { type: sql.NVarChar(100), value: email }
    });

    if (!result.recordset.length) {
      return res.status(401).json({ success: false, message: 'No admin account found with this email.' });
    }

    const admin = result.recordset[0];

    if (admin.is_locked) {
      return res.status(403).json({ success: false, message: 'Account is locked. Contact support.' });
    }

    if (!admin.is_active) {
      return res.status(403).json({ success: false, message: 'This admin account is inactive.' });
    }

    // Support both bcrypt hashes and plain-text (dev fallback)
    let passwordMatch = false;
    const stored = admin.password_hash || '';
    if (stored.startsWith('$2')) {
      passwordMatch = await bcrypt.compare(password, stored);
    } else {
      passwordMatch = (password === stored);
    }

    if (!passwordMatch) {
      await query(`
        UPDATE logins
        SET login_attempts = login_attempts + 1,
            is_locked = CASE WHEN login_attempts + 1 >= 5 THEN 1 ELSE 0 END,
            updated_at = GETDATE()
        WHERE login_id = @id
      `, { id: { type: sql.Int, value: admin.login_id } });
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
    }

    // Successful login — reset attempts
    await query(`
      UPDATE logins SET login_attempts = 0, last_login = GETDATE(), updated_at = GETDATE()
      WHERE login_id = @id
    `, { id: { type: sql.Int, value: admin.login_id } });

    await query(`
      UPDATE admin SET last_login = GETDATE(), updated_at = GETDATE()
      WHERE admin_id = @id
    `, { id: { type: sql.Int, value: admin.admin_id } });

    res.json({
      success: true,
      admin: {
        admin_id:  admin.admin_id,
        full_name: admin.full_name,
        email:     admin.email,
      }
    });

  } catch (e) { dbErr(res, e, 'POST /admin/login'); }
});
 
module.exports = router;