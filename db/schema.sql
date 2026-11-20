-- Hostel Room Allocation & Complaint Management System
-- PostgreSQL schema for the relational component.

CREATE TABLE IF NOT EXISTS hostel (
    hostel_id       SERIAL PRIMARY KEY,
    hostel_name     VARCHAR(100) NOT NULL,
    location        VARCHAR(100) NOT NULL,
    gender_type     VARCHAR(10) NOT NULL CHECK (gender_type IN ('MALE', 'FEMALE', 'MIXED'))
);

CREATE TABLE IF NOT EXISTS student (
    student_id      SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    phone           VARCHAR(15) NOT NULL,
    course          VARCHAR(50) NOT NULL,
    year            INT NOT NULL CHECK (year BETWEEN 1 AND 6),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room (
    room_id         SERIAL PRIMARY KEY,
    hostel_id       INT NOT NULL REFERENCES hostel(hostel_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    room_number     VARCHAR(20) NOT NULL,
    floor           INT NOT NULL CHECK (floor >= 0),
    capacity        INT NOT NULL CHECK (capacity > 0),
    room_type       VARCHAR(20) NOT NULL CHECK (room_type IN ('SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY')),
    status          VARCHAR(15) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'MAINTENANCE')),
    UNIQUE (hostel_id, room_number)
);

CREATE TABLE IF NOT EXISTS warden (
    warden_id       SERIAL PRIMARY KEY,
    hostel_id       INT NOT NULL REFERENCES hostel(hostel_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(100) NOT NULL UNIQUE,
    phone           VARCHAR(15) NOT NULL
);

CREATE TABLE IF NOT EXISTS room_allocation (
    allocation_id   SERIAL PRIMARY KEY,
    student_id      INT NOT NULL REFERENCES student(student_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    room_id         INT NOT NULL REFERENCES room(room_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    vacating_date   DATE,
    status          VARCHAR(15) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'VACATED', 'CANCELLED')),
    CHECK (vacating_date IS NULL OR vacating_date >= allocation_date)
);

CREATE TABLE IF NOT EXISTS complaint_category (
    category_id     SERIAL PRIMARY KEY,
    category_name   VARCHAR(100) NOT NULL UNIQUE,
    description     VARCHAR(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS complaint (
    complaint_id    SERIAL PRIMARY KEY,
    student_id      INT NOT NULL REFERENCES student(student_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    category_id     INT NOT NULL REFERENCES complaint_category(category_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    warden_id       INT REFERENCES warden(warden_id) ON UPDATE CASCADE ON DELETE SET NULL,
    description     TEXT NOT NULL,
    date_reported   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED')),
    priority        VARCHAR(10) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))
);

-- Backend identities: the frontend never chooses a role; it is read from this table.
CREATE TABLE IF NOT EXISTS app_user (
    user_id         SERIAL PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(254) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            VARCHAR(10) NOT NULL CHECK (role IN ('ADMIN', 'WARDEN', 'STUDENT')),
    student_id      INT UNIQUE REFERENCES student(student_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    warden_id       INT UNIQUE REFERENCES warden(warden_id) ON UPDATE CASCADE ON DELETE RESTRICT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
      (role = 'ADMIN' AND student_id IS NULL AND warden_id IS NULL) OR
      (role = 'WARDEN' AND warden_id IS NOT NULL AND student_id IS NULL) OR
      (role = 'STUDENT' AND student_id IS NOT NULL AND warden_id IS NULL)
    )
);

-- Uniqueness of current allocation: a student can occupy only one room at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_one_active_allocation
    ON room_allocation(student_id)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_allocation_room_active
    ON room_allocation(room_id)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_complaint_status_date
    ON complaint(status, date_reported DESC);

CREATE INDEX IF NOT EXISTS idx_complaint_student
    ON complaint(student_id);

CREATE INDEX IF NOT EXISTS idx_room_hostel
    ON room(hostel_id);

CREATE INDEX IF NOT EXISTS idx_app_user_role_active
    ON app_user(role, is_active);

CREATE INDEX IF NOT EXISTS idx_complaint_description_fts
    ON complaint USING GIN (to_tsvector('simple', description));

-- Trigger: prevent active allocation into a maintenance room or beyond room capacity.
CREATE OR REPLACE FUNCTION check_room_allocation_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_capacity INT;
    v_room_status VARCHAR(15);
    v_active_count INT;
BEGIN
    IF NEW.status <> 'ACTIVE' THEN
        RETURN NEW;
    END IF;

    SELECT capacity, status
      INTO v_capacity, v_room_status
      FROM room
     WHERE room_id = NEW.room_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room % does not exist', NEW.room_id;
    END IF;

    IF v_room_status = 'MAINTENANCE' THEN
        RAISE EXCEPTION 'Room % is under maintenance and cannot be allocated', NEW.room_id;
    END IF;

    SELECT COUNT(*)
      INTO v_active_count
      FROM room_allocation
     WHERE room_id = NEW.room_id
       AND status = 'ACTIVE'
       AND allocation_id IS DISTINCT FROM NEW.allocation_id;

    IF v_active_count >= v_capacity THEN
        RAISE EXCEPTION 'Room % is full (capacity %)', NEW.room_id, v_capacity;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_room_allocation_capacity ON room_allocation;
CREATE TRIGGER trg_check_room_allocation_capacity
BEFORE INSERT OR UPDATE OF room_id, status ON room_allocation
FOR EACH ROW
EXECUTE FUNCTION check_room_allocation_capacity();

-- View: current room capacity and vacancy information.
CREATE OR REPLACE VIEW room_availability AS
SELECT
    r.room_id,
    h.hostel_name,
    r.hostel_id,
    r.room_number,
    r.floor,
    r.capacity,
    r.room_type,
    r.status AS maintenance_status,
    COUNT(ra.allocation_id) FILTER (WHERE ra.status = 'ACTIVE')::INT AS occupied_beds,
    CASE
        WHEN r.status = 'MAINTENANCE' THEN 0
        ELSE GREATEST(r.capacity - COUNT(ra.allocation_id) FILTER (WHERE ra.status = 'ACTIVE')::INT, 0)
    END AS available_beds
FROM room r
JOIN hostel h ON h.hostel_id = r.hostel_id
LEFT JOIN room_allocation ra ON ra.room_id = r.room_id
GROUP BY r.room_id, h.hostel_name, r.hostel_id, r.room_number, r.floor,
         r.capacity, r.room_type, r.status;
