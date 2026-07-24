
-- ============================================
-- SOULSYNC COMPLETE INTEGRATED DATABASE SCHEMA
-- SQL Server Version - IN-PERSON ONLY
-- Integrated: Users, Psychologists (Normalized), TherapyDogs
-- ============================================
CREATE DATABASE SoulSync;
GO

USE SoulSync;
GO



-- ============================================
-- USERS TABLE (Password removed - handled by logins table)
-- ============================================
CREATE TABLE users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    full_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    phone NVARCHAR(20),
    date_of_birth DATE,
    gender NVARCHAR(20),
    account_type NVARCHAR(50) DEFAULT 'Patient', -- Patient, Admin
    profile_picture NVARCHAR(500),
    image_url NVARCHAR(500),
    address NVARCHAR(MAX),
    city NVARCHAR(100),
    country NVARCHAR(100),
    emergency_contact_name NVARCHAR(150),
    emergency_contact_phone NVARCHAR(20),
    is_active BIT DEFAULT 1,
    email_verified BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    last_login DATETIME NULL,
    updated_at DATETIME DEFAULT GETDATE()
);


CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_active ON users(is_active);
GO

-- ============================================
-- PSYCHOLOGISTS TABLE (Normalized - Password removed)
-- Combines both team member schemas
-- ============================================
CREATE TABLE psychologists (
    psychologist_id INT PRIMARY KEY IDENTITY(1,1),
    
    -- Basic Information
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    phone_number NVARCHAR(20),
    gender NVARCHAR(20),
    date_of_birth DATE,
    
    -- Professional Information
    specialization NVARCHAR(200),
    qualification NVARCHAR(255),
    license_number NVARCHAR(100) UNIQUE,
    experience_years INT,
    years_of_experience INT, -- Alias for compatibility
    
    -- Profile
    profile_picture VARBINARY(MAX),
    profile_picture_path NVARCHAR(500),
    image_url NVARCHAR(500),
    bio NVARCHAR(MAX),
    website NVARCHAR(500),
    
    -- Consultation
    consultation_fee DECIMAL(10, 2),
    hourly_rate DECIMAL(10,2),
    clinic_location NVARCHAR(255),
    available_days NVARCHAR(100), -- e.g., "Mon,Tue,Wed,Thu,Fri"
    
    -- Verification Status
    status NVARCHAR(50) DEFAULT 'NotChecked' 
        CHECK (status IN ('NotChecked', 'Verified', 'NotVerified')),
    verification_notes NVARCHAR(MAX),
    verified_by INT NULL,
    verified_date DATETIME,
    
    -- Status flags
    is_available BIT DEFAULT 1,
    is_active BIT DEFAULT 1,
    email_verified BIT DEFAULT 0,
    
    -- Timestamps
    created_at DATETIME DEFAULT GETDATE(),
    last_login DATETIME NULL,
    updated_at DATETIME DEFAULT GETDATE()
);

CREATE INDEX idx_psychologist_email ON psychologists(email);
CREATE INDEX idx_psychologist_status ON psychologists(status);
CREATE INDEX idx_psychologist_available ON psychologists(is_available);
CREATE INDEX idx_psychologist_active ON psychologists(is_active);
GO

-- ============================================
-- ADDRESSES TABLE (3NF - For Psychologists)
-- ============================================
CREATE TABLE Addresses (
    address_id INT PRIMARY KEY IDENTITY(1,1),
    psychologist_id INT NOT NULL FOREIGN KEY REFERENCES psychologists(psychologist_id) ON DELETE CASCADE,
    address_line1 NVARCHAR(255) NOT NULL,
    address_line2 NVARCHAR(255),
    city NVARCHAR(100) NOT NULL,
    state_province NVARCHAR(100),
    postal_code NVARCHAR(20),
    country NVARCHAR(100) NOT NULL,
    is_primary BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE INDEX idx_address_psychologist ON Addresses(psychologist_id);
GO

-- ============================================
-- QUALIFICATIONS TABLE (For Psychologists)
-- ============================================
CREATE TABLE Qualifications (
    qualification_id INT PRIMARY KEY IDENTITY(1,1),
    psychologist_id INT NOT NULL FOREIGN KEY REFERENCES psychologists(psychologist_id) ON DELETE CASCADE,
    degree NVARCHAR(200) NOT NULL,
    institution NVARCHAR(300) NOT NULL,
    year_completed INT,
    certificate_path NVARCHAR(500),
    created_at DATETIME DEFAULT GETDATE()
);

CREATE INDEX idx_qualification_psychologist ON Qualifications(psychologist_id);
GO

-- ============================================
-- PSYCHOLOGIST REVIEWS TABLE
-- ============================================
CREATE TABLE PsychologistReviews (
    review_id INT PRIMARY KEY IDENTITY(1,1),
    psychologist_id INT NOT NULL FOREIGN KEY REFERENCES psychologists(psychologist_id) ON DELETE CASCADE,
    rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
    review_text NVARCHAR(MAX),
    is_visible BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

CREATE INDEX idx_review_psychologist ON PsychologistReviews(psychologist_id);
CREATE INDEX idx_review_visible ON PsychologistReviews(is_visible);
GO

-- ============================================
-- AVAILABILITY TABLE (For Psychologists)
-- ============================================
CREATE TABLE Availability (
    availability_id INT PRIMARY KEY IDENTITY(1,1),
    psychologist_id INT NOT NULL FOREIGN KEY REFERENCES psychologists(psychologist_id) ON DELETE CASCADE,
    day_of_week NVARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE INDEX idx_availability_psychologist ON Availability(psychologist_id);
GO

-- ============================================
-- THERAPY DOGS TABLE
-- ============================================
CREATE TABLE TherapyDogs (
    dog_id INT PRIMARY KEY IDENTITY(1,1),
    dog_name NVARCHAR(100) NOT NULL,
    breed NVARCHAR(100) NOT NULL,
    age INT NOT NULL,
    temperament NVARCHAR(500) NOT NULL,
    specialization NVARCHAR(200) NOT NULL,
    experience INT NOT NULL,  -- Years of experience in therapy
    certification_level NVARCHAR(100) NOT NULL,
    health_status NVARCHAR(100) NOT NULL,
    image_path NVARCHAR(500),
    description NVARCHAR(MAX) NOT NULL,
    birthday_date DATE NOT NULL,
    trainer_name NVARCHAR(150) NOT NULL,
    therapy_specialities NVARCHAR(500) NOT NULL,
    success_rate DECIMAL(5, 2) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_date DATETIME DEFAULT GETDATE(),
    updated_date DATETIME DEFAULT GETDATE()
);

CREATE INDEX idx_therapy_dog_active ON TherapyDogs(is_active);
GO

-- ============================================
-- LOGINS TABLE (Unified authentication)
-- KEEP THIS SAME - NO CHANGES
-- ============================================
CREATE TABLE logins (
    login_id INT PRIMARY KEY IDENTITY(1,1),
    email NVARCHAR(100) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    user_type NVARCHAR(20) NOT NULL, -- 'User' or 'Psychologist'or'Admin'
    reference_id INT NOT NULL, -- user_id or psychologist_id
    last_login DATETIME NULL,
    login_attempts INT DEFAULT 0,
    is_locked BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT chk_user_type CHECK (user_type IN ('User', 'Psychologist','Admin'))
);

CREATE INDEX idx_login_email ON logins(email);
CREATE INDEX idx_login_type ON logins(user_type);
GO

-- ============================================
-- DAILY ROUTINES TABLE
-- ============================================
CREATE TABLE daily_routines (
    routine_id INT PRIMARY KEY IDENTITY(1,1),
    routine_name NVARCHAR(100) NOT NULL,
    routine_time NVARCHAR(20) NOT NULL,
    description NVARCHAR(MAX),
    category NVARCHAR(50),
    display_order INT DEFAULT 0,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE INDEX idx_routine_active ON daily_routines(is_active);
CREATE INDEX idx_routine_order ON daily_routines(display_order);
GO

-- ============================================
-- USER ROUTINE PROGRESS TABLE
-- ============================================
CREATE TABLE user_routine_progress (
    progress_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    routine_id INT NOT NULL,
    completion_date DATE NOT NULL,
    completed_at DATETIME DEFAULT GETDATE(),
    notes NVARCHAR(MAX),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (routine_id) REFERENCES daily_routines(routine_id) ON DELETE CASCADE,
    CONSTRAINT unique_user_routine_date UNIQUE (user_id, routine_id, completion_date)
);

CREATE INDEX idx_progress_user_date ON user_routine_progress(user_id, completion_date);
CREATE INDEX idx_progress_date ON user_routine_progress(completion_date);
GO

-- ============================================
-- APPOINTMENTS TABLE (IN-PERSON ONLY)
-- ============================================
CREATE TABLE appointments (
    appointment_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    psychologist_id INT NULL,
    therapy_dog_id INT NULL,
    
    -- Appointment details
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INT DEFAULT 60,
    
    -- Types and Status
    appointment_type NVARCHAR(50) NOT NULL,
    status NVARCHAR(50) DEFAULT 'Scheduled',
    
    -- Location (always in-person)
    clinic_location NVARCHAR(255) NOT NULL,
    room_number NVARCHAR(50),
    
    -- Additional info
    booking_notes NVARCHAR(MAX),
    special_requirements NVARCHAR(MAX),
    cancellation_reason NVARCHAR(MAX),
    reminder_sent BIT DEFAULT 0,
    confirmed_by_patient BIT DEFAULT 0,
    
    -- Metadata
    rescheduled_from INT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (psychologist_id) REFERENCES psychologists(psychologist_id),
    FOREIGN KEY (therapy_dog_id) REFERENCES TherapyDogs(dog_id),
    
    CONSTRAINT chk_appt_type CHECK (appointment_type IN ('Psychologist', 'TherapyDog', 'Combined')),
    CONSTRAINT chk_appt_status CHECK (status IN ('Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Rescheduled', 'No-Show')),
    CONSTRAINT chk_appt_has_provider CHECK ((psychologist_id IS NOT NULL) OR (therapy_dog_id IS NOT NULL))
);

CREATE INDEX idx_appt_user ON appointments(user_id, appointment_date);
CREATE INDEX idx_appt_psychologist ON appointments(psychologist_id, appointment_date, appointment_time);
CREATE INDEX idx_appt_dog ON appointments(therapy_dog_id, appointment_date, appointment_time);
CREATE INDEX idx_appt_status ON appointments(status);
CREATE INDEX idx_appt_type ON appointments(appointment_type);
CREATE INDEX idx_appt_date ON appointments(appointment_date);
GO

-- ============================================
-- THERAPY DOG BOOKINGS TABLE (Legacy support)
-- ============================================
CREATE TABLE TherapyDogBookings (
    booking_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    dog_id INT NOT NULL,
    booking_date DATETIME NOT NULL,
    session_date DATETIME NOT NULL,
    session_duration INT NOT NULL,
    status NVARCHAR(50) NOT NULL DEFAULT 'Pending',
    notes NVARCHAR(MAX),
    created_date DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (dog_id) REFERENCES TherapyDogs(dog_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX idx_dog_booking_user ON TherapyDogBookings(user_id);
CREATE INDEX idx_dog_booking_dog ON TherapyDogBookings(dog_id);
CREATE INDEX idx_dog_booking_session ON TherapyDogBookings(session_date);
GO

-- ============================================
-- SESSIONS TABLE (Legacy from normalized schema)
-- ============================================
CREATE TABLE Sessions (
    session_id INT PRIMARY KEY IDENTITY(1,1),
    psychologist_id INT NOT NULL,
    patient_id INT NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status NVARCHAR(50) DEFAULT 'Scheduled' 
        CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'NoShow')),
    session_notes NVARCHAR(MAX),
    amount DECIMAL(10,2),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (psychologist_id) REFERENCES psychologists(psychologist_id),
    FOREIGN KEY (patient_id) REFERENCES users(user_id)
);

CREATE INDEX idx_session_psychologist ON Sessions(psychologist_id);
CREATE INDEX idx_session_patient ON Sessions(patient_id);
GO

-- ============================================
-- THERAPY SESSIONS TABLE (Detailed session records)
-- ============================================
CREATE TABLE therapy_sessions (
    session_id INT PRIMARY KEY IDENTITY(1,1),
    appointment_id INT NOT NULL,
    user_id INT NOT NULL,
    
    -- Session providers
    psychologist_id INT NULL,
    therapy_dog_id INT NULL,
    
    -- Session timing
    session_date DATE NOT NULL,
    session_time TIME NOT NULL,
    actual_duration_minutes INT NOT NULL,
    
    -- Location
    clinic_location NVARCHAR(255) NOT NULL,
    room_number NVARCHAR(50),
    
    -- Psychologist Notes
    session_summary NVARCHAR(MAX),
    diagnosis_notes NVARCHAR(MAX),
    treatment_plan NVARCHAR(MAX),
    therapy_techniques_used NVARCHAR(500),
    medications_prescribed NVARCHAR(500),
    
    -- Patient Assessment
    patient_mood_before NVARCHAR(50),
    patient_mood_after NVARCHAR(50),
    anxiety_level_before INT,
    anxiety_level_after INT,
    depression_level_before INT,
    depression_level_after INT,
    
    -- Progress Tracking
    goals_achieved NVARCHAR(MAX),
    homework_assigned NVARCHAR(MAX),
    progress_notes NVARCHAR(MAX),
    
    -- Patient Feedback
    patient_rating INT,
    patient_feedback NVARCHAR(MAX),
    patient_concerns NVARCHAR(MAX),
    
    -- Therapy Dog Specific
    dog_behavior_notes NVARCHAR(MAX),
    patient_dog_interaction NVARCHAR(MAX),
    dog_activities_performed NVARCHAR(500),
    
    -- Follow-up
    next_session_recommended BIT DEFAULT 0,
    recommended_frequency NVARCHAR(100),
    next_session_date DATE NULL,
    follow_up_required BIT DEFAULT 0,
    emergency_flag BIT DEFAULT 0,
    
    -- Metadata
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (psychologist_id) REFERENCES psychologists(psychologist_id),
    FOREIGN KEY (therapy_dog_id) REFERENCES TherapyDogs(dog_id)
);

CREATE INDEX idx_therapy_session_user ON therapy_sessions(user_id, session_date);
CREATE INDEX idx_therapy_session_appointment ON therapy_sessions(appointment_id);
CREATE INDEX idx_therapy_session_psychologist ON therapy_sessions(psychologist_id);
CREATE INDEX idx_therapy_session_dog ON therapy_sessions(therapy_dog_id);
CREATE INDEX idx_therapy_session_date ON therapy_sessions(session_date);
GO

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Get visible psychologist reviews
CREATE PROCEDURE GetVisiblePsychologistReviews
    @Limit INT = 6
AS
BEGIN
    SELECT TOP (@Limit)
        pr.review_id,
        p.first_name,
        p.last_name,
        pr.rating,
        pr.review_text,
        pr.created_at AS review_date,
        p.profile_picture_path
    FROM PsychologistReviews pr
    INNER JOIN psychologists p ON pr.psychologist_id = p.psychologist_id
    WHERE pr.is_visible = 1
        AND p.status = 'Verified'
    ORDER BY pr.created_at DESC;
END
GO

-- Register new psychologist
CREATE PROCEDURE RegisterPsychologist
    @Email NVARCHAR(255),
    @PasswordHash NVARCHAR(255),
    @FirstName NVARCHAR(100),
    @LastName NVARCHAR(100),
    @PhoneNumber NVARCHAR(20),
    @LicenseNumber NVARCHAR(100),
    @Specialization NVARCHAR(200),
    @YearsOfExperience INT,
    @Bio NVARCHAR(MAX)
AS
BEGIN
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Insert into psychologists table (no password)
        INSERT INTO psychologists (
            first_name, last_name, email, phone_number,
            license_number, specialization, experience_years, 
            years_of_experience, bio, status
        ) VALUES (
            @FirstName, @LastName, @Email, @PhoneNumber,
            @LicenseNumber, @Specialization, @YearsOfExperience,
            @YearsOfExperience, @Bio, 'NotChecked'
        );
        
        DECLARE @NewPsychID INT = SCOPE_IDENTITY();
        
        -- Insert into logins table
        INSERT INTO logins (email, password_hash, user_type, reference_id)
        VALUES (@Email, @PasswordHash, 'Psychologist', @NewPsychID);
        
        COMMIT TRANSACTION;
        SELECT 'Success' AS Result, @NewPsychID AS PsychologistID;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SELECT 'Error: ' + ERROR_MESSAGE() AS Result, NULL AS PsychologistID;
    END CATCH
END
GO

-- Login psychologist
CREATE PROCEDURE LoginPsychologist
    @Email NVARCHAR(255),
    @PasswordHash NVARCHAR(255)
AS
BEGIN
    SELECT 
        l.reference_id AS psychologist_id,
        p.first_name,
        p.last_name,
        p.email,
        p.status,
        p.profile_picture_path,
        p.specialization,
        p.experience_years
    FROM logins l
    INNER JOIN psychologists p ON l.reference_id = p.psychologist_id
    WHERE l.email = @Email 
        AND l.password_hash = @PasswordHash
        AND l.user_type = 'Psychologist'
        AND l.is_locked = 0;
        
    -- Update last login
    IF @@ROWCOUNT > 0
    BEGIN
        UPDATE logins SET last_login = GETDATE() WHERE email = @Email;
        UPDATE psychologists SET last_login = GETDATE() WHERE email = @Email;
    END
END
GO

-- ============================================
-- INSERT SAMPLE DATA
-- ============================================

-- Insert Sample Psychologists
INSERT INTO psychologists (
    first_name, last_name, email, phone_number, specialization, 
    qualification, experience_years, years_of_experience, license_number, 
    bio, consultation_fee, hourly_rate, clinic_location, available_days, 
    status, is_available
) VALUES
('Sarah', 'Johnson', 'sarah.johnson@soulsync.com', '+92-321-1234567', 
 'Clinical Psychology', 'PhD in Clinical Psychology, Licensed Therapist', 
 12, 12, 'PSY-12345', 
 'Specializes in anxiety, depression, and trauma therapy with over 12 years of experience.', 
 3000.00, 3000.00, 'SoulSync Clinic, Karachi', 'Mon,Tue,Wed,Thu,Fri', 
 'Verified', 1),
 
('Ahmed', 'Hassan', 'ahmed.hassan@soulsync.com', '+92-322-2345678', 
 'Child Psychology', 'PhD in Child Psychology, Child Specialist', 
 8, 8, 'PSY-23456', 
 'Expert in child and adolescent mental health, behavioral issues, and family counseling.', 
 2500.00, 2500.00, 'SoulSync Clinic, Lahore', 'Mon,Wed,Fri,Sat', 
 'Verified', 1),
 
('Fatima', 'Khan', 'fatima.khan@soulsync.com', '+92-333-3456789', 
 'Cognitive Behavioral Therapy', 'MS in Psychology, CBT Certified', 
 10, 10, 'PSY-34567', 
 'Focuses on CBT techniques for depression, anxiety disorders, and stress management.', 
 2800.00, 2800.00, 'SoulSync Clinic, Islamabad', 'Tue,Thu,Sat,Sun', 
 'Verified', 1);
GO

-- Insert Therapy Dogs
INSERT INTO TherapyDogs (
    dog_name, breed, age, temperament, specialization, experience, 
    certification_level, health_status, image_path, description, 
    birthday_date, trainer_name, therapy_specialities, success_rate, is_active
) VALUES
('Max', 'Golden Retriever', 5, 'Calm, gentle, and patient', 'Anxiety & Depression', 5,
 'Level 3 - Advanced', 'Excellent', 'file:///E:/SoulSync/resources/soulsync/media/Dogs/Max.jpeg',
 'Max is an exceptional therapy dog with 5 years of experience helping patients with anxiety and depression.',
 '2019-03-15', 'Dr. Sarah Mitchell', 'Anxiety Relief, Depression Support, PTSD, Stress Management', 94.50, 1),
 
('Luna', 'Labrador Retriever', 4, 'Energetic, friendly, and encouraging', 'ADHD & Hyperactivity', 4,
 'Level 2 - Certified', 'Excellent', 'file:///E:/SoulSync/resources/soulsync/media/Dogs/Luna.jpeg',
 'Luna brings joy and energy to every session. She specializes in working with ADHD patients.',
 '2020-07-22', 'James Chen', 'ADHD Support, Behavioral Therapy, Social Skills, Motivation', 91.75, 1),
 
('Bailey', 'English Springer Spaniel', 6, 'Nurturing, empathetic, and attentive', 'Grief & Loss', 6,
 'Level 3 - Advanced', 'Good', 'file:///E:/SoulSync/resources/soulsync/media/Dogs/Bailey.jpeg',
 'Bailey has a special gift for helping patients work through grief and loss.',
 '2018-11-10', 'Dr. Maria Rodriguez', 'Grief Counseling, Loss Support, Emotional Healing, Comfort', 96.25, 1),
 
('Cooper', 'Bernese Mountain Dog', 5, 'Loyal, protective, and grounding', 'Trauma & Safety', 5,
 'Level 3 - Advanced', 'Excellent', 'file:///E:/SoulSync/resources/soulsync/media/Dogs/Cooper.jpeg',
 'Cooper specializes in trauma-informed care, providing a safe, grounding presence.',
 '2019-05-18', 'Dr. David Thompson', 'Trauma Recovery, PTSD, Safety, Grounding Techniques', 95.00, 1),
 
('Bella', 'Cavalier King Charles Spaniel', 3, 'Affectionate, playful, and comforting', 'Child Therapy & Developmental', 3,
 'Level 2 - Certified', 'Excellent', 'file:///E:/SoulSync/resources/soulsync/media/Dogs/Bella.jpeg',
 'Bella is perfect for working with children and adolescents.',
 '2021-08-30', 'Dr. Emily Watson', 'Child Therapy, Play Therapy, Developmental Support, Confidence', 92.00, 1),
 
('Scout', 'Australian Shepherd', 4, 'Intelligent, responsive, and adaptable', 'Autism & Social Skills', 4,
 'Level 2 - Certified', 'Excellent', 'file:///E:/SoulSync/resources/soulsync/media/Dogs/Scout.jpeg',
 'Scout excels at working with autism spectrum patients.',
 '2020-02-14', 'Dr. Lisa Park', 'Autism Support, Social Skills, Communication, Sensory Regulation', 93.50, 1);
GO

-- Insert Daily Routines
INSERT INTO daily_routines (routine_name, routine_time, description, category, display_order, is_active) VALUES
('Morning Meditation', '07:00 AM', '10 minutes of mindfulness meditation', 'Mental Health', 1, 1),
('Healthy Breakfast', '08:00 AM', 'Nutritious breakfast', 'Physical Health', 2, 1),
('Morning Walk', '09:00 AM', '20-30 minutes outdoor walk', 'Physical Health', 3, 1),
('Hydration Check', '11:00 AM', 'Drink water - stay hydrated', 'Physical Health', 4, 1),
('Afternoon Break', '02:00 PM', '15 minutes break for stretching', 'Mental Health', 5, 1),
('Evening Journaling', '06:00 PM', 'Reflect on your day', 'Mental Health', 6, 1),
('Maghrib Prayer', '07:00 PM', 'Evening prayer', 'Spiritual Health', 7, 1),
('Family Time', '08:00 PM', 'Quality time with family', 'Social Health', 8, 1),
('Isha Prayer', '09:00 PM', 'Night prayer', 'Spiritual Health', 9, 1),
('Sleep Preparation', '10:00 PM', 'Wind down routine', 'Physical Health', 10, 1);
GO

-- Insert Sample Users
INSERT INTO users (full_name, email, phone, gender, account_type, city, country, emergency_contact_name, emergency_contact_phone, is_active) VALUES
('John Doe', 'john.doe@example.com', '+92-300-1234567', 'Male', 'Patient', 'Karachi', 'Pakistan', 'Jane Doe', '+92-300-7654321', 1),
('Sarah Ali', 'sarah.ali@example.com', '+92-301-2345678', 'Female', 'Patient', 'Lahore', 'Pakistan', 'Ahmed Ali', '+92-301-8765432', 1);
GO

-- Insert Login Records
INSERT INTO logins (email, password_hash, user_type, reference_id) VALUES
('john.doe@example.com', 'hashed_password_user1', 'User', 1),
('sarah.ali@example.com', 'hashed_password_user2', 'User', 2),
('sarah.johnson@soulsync.com', 'hashed_password_psych1', 'Psychologist', 1),
('ahmed.hassan@soulsync.com', 'hashed_password_psych2', 'Psychologist', 2),
('fatima.khan@soulsync.com', 'hashed_password_psych3', 'Psychologist', 3);




-- Insert Sample Review
INSERT INTO PsychologistReviews (psychologist_id, rating, review_text, is_visible) VALUES
(1, 5, 'Excellent platform for connecting with patients. The interface is intuitive and comprehensive.', 1);
GO

-- ============================================
-- VERIFICATION QUERIES
-- ============================================


SELECT COUNT(*) as TotalUsers FROM users;
SELECT COUNT(*) as TotalPsychologists FROM psychologists;
SELECT COUNT(*) as TotalLogins FROM logins;
SELECT COUNT(*) as TotalRoutines FROM daily_routines WHERE is_active = 1;
SELECT COUNT(*) as TotalTherapyDogs FROM TherapyDogs WHERE is_active = 1;


select * from users

select * from logins
-- ============================================
-- MENTAL HEALTH TEST DATABASE SCHEMA
-- Stores test questions, user responses, and results
-- ============================================



-- ============================================
-- TEST QUESTIONS TABLE
-- Stores all mental health screening questions
-- ============================================
CREATE TABLE test_questions (
    question_id INT PRIMARY KEY IDENTITY(1,1),
    question_number INT NOT NULL UNIQUE,
    category NVARCHAR(50) NOT NULL, -- Depression, Anxiety, Sleep, Energy, etc.
    question_text NVARCHAR(MAX) NOT NULL,
    answer_type NVARCHAR(50) DEFAULT 'frequency', -- 'frequency' or 'satisfaction'
    max_score INT DEFAULT 3, -- Maximum score for this question (0-3)
    is_active BIT DEFAULT 1,
    display_order INT NOT NULL,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);

CREATE INDEX idx_question_number ON test_questions(question_number);
CREATE INDEX idx_question_category ON test_questions(category);
CREATE INDEX idx_question_active ON test_questions(is_active);
GO

-- ============================================
-- TEST RESULTS TABLE
-- Stores overall test results for each user
-- ============================================
CREATE TABLE test_results (
    test_result_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT NOT NULL,
    
    -- Overall Scores
    total_score INT NOT NULL,
    max_possible_score INT DEFAULT 60, -- 20 questions × 3 points each
    
    -- Category Scores
    depression_score INT DEFAULT 0,
    anxiety_score INT DEFAULT 0,
    other_score INT DEFAULT 0,
    
    -- Score Percentages
    total_percentage DECIMAL(5,2),
    depression_percentage DECIMAL(5,2),
    anxiety_percentage DECIMAL(5,2),
    other_percentage DECIMAL(5,2),
    
    -- Severity Assessment
    severity_level NVARCHAR(20), -- 'Mild', 'Moderate', 'Severe'
    
    -- Recommendations
    recommendation_text NVARCHAR(MAX),
    requires_professional_help BIT DEFAULT 0,
    
    -- Test Metadata
    test_completed_at DATETIME DEFAULT GETDATE(),
    test_duration_minutes INT, -- How long it took to complete
    is_guest_test BIT DEFAULT 0, -- Was this taken by a guest?
    
    -- Follow-up
    follow_up_scheduled BIT DEFAULT 0,
    follow_up_date DATETIME NULL,
    
    -- Timestamps
    created_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_test_user ON test_results(user_id);
CREATE INDEX idx_test_date ON test_results(test_completed_at);
CREATE INDEX idx_test_severity ON test_results(severity_level);
GO

-- ============================================
-- TEST ANSWERS TABLE
-- Stores individual question answers for each test
-- ============================================
CREATE TABLE test_answers (
    answer_id INT PRIMARY KEY IDENTITY(1,1),
    test_result_id INT NOT NULL,
    question_id INT NOT NULL,
    question_number INT NOT NULL,
    
    -- Answer Details
    answer_value INT NOT NULL CHECK (answer_value BETWEEN 0 AND 3),
    answer_text NVARCHAR(100) NOT NULL, -- e.g., "Not at all", "Several days"
    
    -- Question Context (denormalized for historical record)
    question_category NVARCHAR(50) NOT NULL,
    question_text NVARCHAR(MAX) NOT NULL,
    
    -- Timestamp
    answered_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (test_result_id) REFERENCES test_results(test_result_id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES test_questions(question_id)
);

CREATE INDEX idx_answer_test ON test_answers(test_result_id);
CREATE INDEX idx_answer_question ON test_answers(question_id);
CREATE INDEX idx_answer_category ON test_answers(question_category);
GO

-- ============================================
-- INSERT TEST QUESTIONS
-- Based on your MentalHealthScreeningController questions
-- ============================================

-- Depression Questions (0-6) - Max 21 points
INSERT INTO test_questions (question_number, category, question_text, answer_type, display_order) VALUES
(1, 'Depression', 'Over the past two weeks, how often have you felt little interest or pleasure in doing things?', 'frequency', 1),
(2, 'Depression', 'Over the past two weeks, how often have you felt down, depressed, or hopeless?', 'frequency', 2),
(3, 'Sleep', 'How often do you have trouble falling asleep, staying asleep, or sleeping too much?', 'frequency', 3),
(4, 'Energy', 'How often do you feel tired or have little energy during the day?', 'frequency', 4),
(5, 'Appetite', 'Over the past two weeks, how often have you had poor appetite or been overeating?', 'frequency', 5),
(6, 'Self-Esteem', 'How often do you feel bad about yourself, or that you are a failure, or have let yourself or your family down?', 'frequency', 6),
(7, 'Concentration', 'How often do you have trouble concentrating on things, such as reading or watching television?', 'frequency', 7);

-- Anxiety Questions (7-10, 13-14) - Max 18 points
INSERT INTO test_questions (question_number, category, question_text, answer_type, display_order) VALUES
(8, 'Anxiety', 'How often do you feel nervous, anxious, or on edge?', 'frequency', 8),
(9, 'Anxiety', 'How often are you unable to stop or control worrying?', 'frequency', 9),
(10, 'Anxiety', 'How often do you worry too much about different things?', 'frequency', 10),
(11, 'Stress', 'How often do you have trouble relaxing?', 'frequency', 11);

-- Other Mental Health Issues (11-12, 15-19) - Max 21 points
INSERT INTO test_questions (question_number, category, question_text, answer_type, display_order) VALUES
(12, 'Restlessness', 'How often are you so restless that it''s hard to sit still?', 'frequency', 12),
(13, 'Mood', 'How often do you become easily annoyed or irritable?', 'frequency', 13),
(14, 'Anxiety', 'How often do you feel afraid that something awful might happen?', 'frequency', 14),
(15, 'Social', 'How often do you avoid social situations because of fear or anxiety?', 'frequency', 15),
(16, 'Panic', 'How often do you experience sudden episodes of intense fear or discomfort (panic attacks)?', 'frequency', 16),
(17, 'Trauma', 'How often do you have recurring thoughts or memories that are distressing?', 'frequency', 17),
(18, 'Relationships', 'How satisfied are you with your relationships with family and friends?', 'satisfaction', 18),
(19, 'Stress', 'How often do you feel overwhelmed by your daily responsibilities?', 'frequency', 19),
(20, 'Safety', 'Have you thought about harming yourself or that you would be better off dead?', 'frequency', 20);

-- ============================================
-- STORED PROCEDURES
-- ============================================

-- Get all active test questions in order
CREATE PROCEDURE GetTestQuestions
AS
BEGIN
    SELECT 
        question_id,
        question_number,
        category,
        question_text,
        answer_type,
        max_score,
        display_order
    FROM test_questions
    WHERE is_active = 1
    ORDER BY display_order;
END
GO

-- Save test results
CREATE PROCEDURE SaveTestResult
    @UserId INT,
    @TotalScore INT,
    @DepressionScore INT,
    @AnxietyScore INT,
    @OtherScore INT,
    @SeverityLevel NVARCHAR(20),
    @IsGuestTest BIT = 0,
    @TestResultId INT OUTPUT
AS
BEGIN
    BEGIN TRY
        -- Calculate percentages
        DECLARE @TotalPercent DECIMAL(5,2) = (@TotalScore * 100.0) / 60.0;
        DECLARE @DepressionPercent DECIMAL(5,2) = (@DepressionScore * 100.0) / 21.0;
        DECLARE @AnxietyPercent DECIMAL(5,2) = (@AnxietyScore * 100.0) / 18.0;
        DECLARE @OtherPercent DECIMAL(5,2) = (@OtherScore * 100.0) / 21.0;
        
        -- Determine if professional help is needed
        DECLARE @RequiresHelp BIT = 0;
        IF @TotalScore > 40 OR @SeverityLevel = 'Severe'
            SET @RequiresHelp = 1;
        
        -- Generate recommendation
        DECLARE @Recommendation NVARCHAR(MAX);
        IF @SeverityLevel = 'Mild'
            SET @Recommendation = 'Your results suggest mild symptoms. Consider implementing self-care strategies and monitoring your mental health regularly.';
        ELSE IF @SeverityLevel = 'Moderate'
            SET @Recommendation = 'Your results indicate moderate symptoms. We recommend scheduling a consultation with a mental health professional for proper evaluation.';
        ELSE
            SET @Recommendation = 'Your results show significant symptoms that require professional attention. Please schedule an appointment with a mental health professional as soon as possible.';
        
        -- Insert test result
        INSERT INTO test_results (
            user_id,
            total_score,
            max_possible_score,
            depression_score,
            anxiety_score,
            other_score,
            total_percentage,
            depression_percentage,
            anxiety_percentage,
            other_percentage,
            severity_level,
            recommendation_text,
            requires_professional_help,
            is_guest_test,
            test_completed_at
        ) VALUES (
            @UserId,
            @TotalScore,
            60,
            @DepressionScore,
            @AnxietyScore,
            @OtherScore,
            @TotalPercent,
            @DepressionPercent,
            @AnxietyPercent,
            @OtherPercent,
            @SeverityLevel,
            @Recommendation,
            @RequiresHelp,
            @IsGuestTest,
            GETDATE()
        );
        
        SET @TestResultId = SCOPE_IDENTITY();
        
        SELECT 'Success' AS Result, @TestResultId AS TestResultId;
        
    END TRY
    BEGIN CATCH
        SELECT 'Error: ' + ERROR_MESSAGE() AS Result, NULL AS TestResultId;
        SET @TestResultId = NULL;
    END CATCH
END
GO

-- Save individual test answer
CREATE PROCEDURE SaveTestAnswer
    @TestResultId INT,
    @QuestionNumber INT,
    @AnswerValue INT,
    @AnswerText NVARCHAR(100)
AS
BEGIN
    BEGIN TRY
        -- Get question details
        DECLARE @QuestionId INT;
        DECLARE @Category NVARCHAR(50);
        DECLARE @QuestionText NVARCHAR(MAX);
        
        SELECT 
            @QuestionId = question_id,
            @Category = category,
            @QuestionText = question_text
        FROM test_questions
        WHERE question_number = @QuestionNumber;
        
        -- Insert answer
        INSERT INTO test_answers (
            test_result_id,
            question_id,
            question_number,
            answer_value,
            answer_text,
            question_category,
            question_text
        ) VALUES (
            @TestResultId,
            @QuestionId,
            @QuestionNumber,
            @AnswerValue,
            @AnswerText,
            @Category,
            @QuestionText
        );
        
        SELECT 'Answer saved successfully' AS Result;
        
    END TRY
    BEGIN CATCH
        SELECT 'Error: ' + ERROR_MESSAGE() AS Result;
    END CATCH
END
GO

-- Get user's test history
CREATE PROCEDURE GetUserTestHistory
    @UserId INT
AS
BEGIN
    SELECT 
        test_result_id,
        total_score,
        max_possible_score,
        total_percentage,
        depression_score,
        anxiety_score,
        other_score,
        severity_level,
        test_completed_at,
        requires_professional_help,
        recommendation_text
    FROM test_results
    WHERE user_id = @UserId
    ORDER BY test_completed_at DESC;
END
GO

-- Get specific test result with all answers
CREATE PROCEDURE GetTestResultDetails
    @TestResultId INT
AS
BEGIN
    -- Get overall result
    SELECT 
        tr.test_result_id,
        tr.user_id,
        u.full_name,
        tr.total_score,
        tr.max_possible_score,
        tr.total_percentage,
        tr.depression_score,
        tr.depression_percentage,
        tr.anxiety_score,
        tr.anxiety_percentage,
        tr.other_score,
        tr.other_percentage,
        tr.severity_level,
        tr.recommendation_text,
        tr.requires_professional_help,
        tr.test_completed_at
    FROM test_results tr
    INNER JOIN users u ON tr.user_id = u.user_id
    WHERE tr.test_result_id = @TestResultId;
    
    -- Get all answers for this test
    SELECT 
        ta.answer_id,
        ta.question_number,
        ta.question_category,
        ta.question_text,
        ta.answer_value,
        ta.answer_text,
        ta.answered_at
    FROM test_answers ta
    WHERE ta.test_result_id = @TestResultId
    ORDER BY ta.question_number;
END
GO

-- Get user's latest test result
CREATE PROCEDURE GetLatestTestResult
    @UserId INT
AS
BEGIN
    SELECT TOP 1
        test_result_id,
        total_score,
        max_possible_score,
        total_percentage,
        depression_score,
        anxiety_score,
        other_score,
        severity_level,
        recommendation_text,
        requires_professional_help,
        test_completed_at
    FROM test_results
    WHERE user_id = @UserId
    ORDER BY test_completed_at DESC;
END
GO

-- Get test statistics
CREATE PROCEDURE GetTestStatistics
AS
BEGIN
    SELECT 
        COUNT(DISTINCT user_id) AS TotalUsers,
        COUNT(*) AS TotalTests,
        AVG(CAST(total_score AS FLOAT)) AS AverageScore,
        AVG(CAST(depression_score AS FLOAT)) AS AverageDepressionScore,
        AVG(CAST(anxiety_score AS FLOAT)) AS AverageAnxietyScore,
        SUM(CASE WHEN severity_level = 'Mild' THEN 1 ELSE 0 END) AS MildCases,
        SUM(CASE WHEN severity_level = 'Moderate' THEN 1 ELSE 0 END) AS ModerateCases,
        SUM(CASE WHEN severity_level = 'Severe' THEN 1 ELSE 0 END) AS SevereCases,
        SUM(CASE WHEN requires_professional_help = 1 THEN 1 ELSE 0 END) AS RequiresHelp
    FROM test_results
    WHERE is_guest_test = 0;
END
GO

-- ============================================
-- UPDATED ADMIN TABLE SCHEMA
-- Simplified structure similar to users table
-- ============================================

-- Drop existing admin table if you need to recreate
 

-- Create admin table with simplified structure
CREATE TABLE admin (
    admin_id INT PRIMARY KEY IDENTITY(1,1),
    full_name NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) UNIQUE NOT NULL,
    phone NVARCHAR(20),
    date_of_birth DATE,
    gender NVARCHAR(20),
    account_type NVARCHAR(50) DEFAULT 'Admin',
    profile_picture NVARCHAR(500),
    address NVARCHAR(MAX),
    city NVARCHAR(100),
    country NVARCHAR(100),
    is_active BIT DEFAULT 1,
    email_verified BIT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    last_login DATETIME NULL,
    updated_at DATETIME DEFAULT GETDATE()
);

CREATE INDEX idx_admin_email ON admin(email);
CREATE INDEX idx_admin_active ON admin(is_active);
GO

-- ============================================
-- INSERT DEFAULT ADMIN ACCOUNT
-- ============================================
INSERT INTO admin (
    full_name,
    email,
    phone,
    date_of_birth,
    gender,
    address,
    city,
    country,
    is_active,
    email_verified
)
VALUES (
    'System Administrator',
    'admin@soulsync.com',
    '0300-0000000',
    '1990-01-01',
    'Other',
    'SoulSync Head Office, Main Boulevard',
    'Lahore',
    'Pakistan',
    1,
    1
);
GO

-- Add login entry for admin (password: admin123)
-- Note: Replace 'admin123' with actual hashed password in production
INSERT INTO logins (email, password_hash, user_type, reference_id)
VALUES ('admin@soulsync.com', 'admin123', 'Admin', 1);
GO

-- ============================================
-- ADMIN LOGIN STORED PROCEDURE
-- ============================================
CREATE PROCEDURE LoginAdmin
    @Email NVARCHAR(255),
    @PasswordHash NVARCHAR(255)
AS
BEGIN
    SELECT 
        l.reference_id AS admin_id,
        a.full_name,
        a.email,
        a.phone,
        a.profile_picture,
        a.city,
        a.country,
        a.is_active
    FROM logins l
    INNER JOIN admin a ON l.reference_id = a.admin_id
    WHERE l.email = @Email 
        AND l.password_hash = @PasswordHash
        AND l.user_type = 'Admin'
        AND l.is_locked = 0
        AND a.is_active = 1;
        
    -- Update last login
    IF @@ROWCOUNT > 0
    BEGIN
        UPDATE logins SET last_login = GETDATE() WHERE email = @Email;
        UPDATE admin SET last_login = GETDATE() WHERE email = @Email;
    END
END
GO

-- ============================================
-- REGISTER NEW ADMIN STORED PROCEDURE
-- ============================================
CREATE PROCEDURE RegisterAdmin
    @Email NVARCHAR(255),
    @PasswordHash NVARCHAR(255),
    @FullName NVARCHAR(100),
    @Phone NVARCHAR(20),
    @DateOfBirth DATE = NULL,
    @Gender NVARCHAR(20) = NULL,
    @Address NVARCHAR(MAX) = NULL,
    @City NVARCHAR(100) = NULL,
    @Country NVARCHAR(100) = NULL
AS
BEGIN
    BEGIN TRANSACTION;
    BEGIN TRY
        -- Check if email already exists
        IF EXISTS (SELECT 1 FROM admin WHERE email = @Email)
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 'Error: Email already exists' AS Result, NULL AS AdminID;
            RETURN;
        END
        
        -- Insert into admin table
        INSERT INTO admin (
            full_name, email, phone, date_of_birth, gender,
            address, city, country, is_active, email_verified
        ) VALUES (
            @FullName, @Email, @Phone, @DateOfBirth, @Gender,
            @Address, @City, @Country, 1, 0
        );
        
        DECLARE @NewAdminID INT = SCOPE_IDENTITY();
        
        -- Insert into logins table
        INSERT INTO logins (email, password_hash, user_type, reference_id)
        VALUES (@Email, @PasswordHash, 'Admin', @NewAdminID);
        
        COMMIT TRANSACTION;
        SELECT 'Success' AS Result, @NewAdminID AS AdminID;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SELECT 'Error: ' + ERROR_MESSAGE() AS Result, NULL AS AdminID;
    END CATCH
END
GO

-- ============================================
-- GET ADMIN PROFILE STORED PROCEDURE
-- ============================================
CREATE PROCEDURE GetAdminProfile
    @AdminId INT
AS
BEGIN
    SELECT 
        admin_id,
        full_name,
        email,
        phone,
        date_of_birth,
        gender,
        account_type,
        profile_picture,
        address,
        city,
        country,
        is_active,
        email_verified,
        created_at,
        last_login,
        updated_at
    FROM admin
    WHERE admin_id = @AdminId;
END
GO

-- ============================================
-- UPDATE ADMIN PROFILE STORED PROCEDURE
-- ============================================
CREATE PROCEDURE UpdateAdminProfile
    @AdminId INT,
    @FullName NVARCHAR(100),
    @Phone NVARCHAR(20),
    @DateOfBirth DATE = NULL,
    @Gender NVARCHAR(20) = NULL,
    @Address NVARCHAR(MAX) = NULL,
    @City NVARCHAR(100) = NULL,
    @Country NVARCHAR(100) = NULL,
    @ProfilePicture NVARCHAR(500) = NULL
AS
BEGIN
    BEGIN TRY
        UPDATE admin
        SET 
            full_name = @FullName,
            phone = @Phone,
            date_of_birth = @DateOfBirth,
            gender = @Gender,
            address = @Address,
            city = @City,
            country = @Country,
            profile_picture = COALESCE(@ProfilePicture, profile_picture),
            updated_at = GETDATE()
        WHERE admin_id = @AdminId;
        
        IF @@ROWCOUNT > 0
            SELECT 'Success' AS Result, 'Profile updated successfully' AS Message;
        ELSE
            SELECT 'Error' AS Result, 'Admin not found' AS Message;
            
    END TRY
    BEGIN CATCH
        SELECT 'Error' AS Result, ERROR_MESSAGE() AS Message;
    END CATCH
END
GO

-- ============================================
-- GET ALL ADMINS (For super admin management)
-- ============================================
CREATE PROCEDURE GetAllAdmins
AS
BEGIN
    SELECT 
        admin_id,
        full_name,
        email,
        phone,
        city,
        country,
        is_active,
        created_at,
        last_login
    FROM admin
    ORDER BY created_at DESC;
END
GO

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT COUNT(*) as TotalAdmins FROM admin;
SELECT * FROM admin;
SELECT * FROM logins WHERE user_type = 'Admin';
GO
SELECT * FROM admin;
SELECT COUNT(*) as AdminCount FROM admin;
