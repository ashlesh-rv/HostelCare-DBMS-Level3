-- Run only after schema.sql on a fresh local database.

INSERT INTO hostel (hostel_id, hostel_name, location, gender_type) VALUES
  (1, 'North Block Hostel', 'Campus North', 'MALE'),
  (2, 'Lakeview Hostel', 'Campus East', 'FEMALE')
ON CONFLICT (hostel_id) DO NOTHING;

INSERT INTO warden (warden_id, hostel_id, name, email, phone) VALUES
  (1, 1, 'Ravi Kumar', 'ravi.warden@example.com', '9876500001'),
  (2, 2, 'Meera Rao', 'meera.warden@example.com', '9876500002')
ON CONFLICT (warden_id) DO NOTHING;

INSERT INTO student (student_id, name, email, phone, course, year) VALUES
  (1, 'Arjun Nair', 'arjun.student@example.com', '9000000001', 'CSE', 3),
  (2, 'Priya Shah', 'priya.student@example.com', '9000000002', 'ECE', 2),
  (3, 'Rahul Das', 'rahul.student@example.com', '9000000003', 'CSE', 1),
  (4, 'Nisha Menon', 'nisha.student@example.com', '9000000004', 'ISE', 3),
  (5, 'Karan Patel', 'karan.student@example.com', '9000000005', 'AIML', 2)
ON CONFLICT (student_id) DO NOTHING;

INSERT INTO room (room_id, hostel_id, room_number, floor, capacity, room_type, status) VALUES
  (1, 1, '101', 1, 2, 'DOUBLE', 'AVAILABLE'),
  (2, 1, '102', 1, 3, 'TRIPLE', 'AVAILABLE'),
  (3, 1, '201', 2, 1, 'SINGLE', 'AVAILABLE'),
  (4, 2, '101', 1, 2, 'DOUBLE', 'AVAILABLE'),
  (5, 2, '102', 1, 2, 'DOUBLE', 'MAINTENANCE')
ON CONFLICT (room_id) DO NOTHING;

INSERT INTO complaint_category (category_id, category_name, description) VALUES
  (1, 'ELECTRICITY', 'Electrical faults, lights, or power issues'),
  (2, 'WATER', 'Water supply or plumbing issues'),
  (3, 'CLEANLINESS', 'Room or shared-area cleanliness'),
  (4, 'MAINTENANCE', 'Furniture, doors, or building repairs'),
  (5, 'MESS', 'Dining or mess-related issues')
ON CONFLICT (category_id) DO NOTHING;

INSERT INTO room_allocation (allocation_id, student_id, room_id, allocation_date, status) VALUES
  (1, 1, 1, CURRENT_DATE - 40, 'ACTIVE'),
  (2, 2, 1, CURRENT_DATE - 25, 'ACTIVE'),
  (3, 3, 2, CURRENT_DATE - 12, 'ACTIVE'),
  (4, 4, 4, CURRENT_DATE - 5, 'ACTIVE')
ON CONFLICT (allocation_id) DO NOTHING;

INSERT INTO complaint (complaint_id, student_id, category_id, warden_id, description, date_reported, status, priority) VALUES
  (1, 1, 1, 1, 'The light near the study desk is not working.', NOW() - INTERVAL '2 days', 'PENDING', 'MEDIUM'),
  (2, 2, 2, 1, 'Water pressure in the bathroom is very low.', NOW() - INTERVAL '1 day', 'IN_PROGRESS', 'HIGH'),
  (3, 4, 4, 2, 'The cupboard hinge needs repair.', NOW() - INTERVAL '4 hours', 'RESOLVED', 'LOW')
ON CONFLICT (complaint_id) DO NOTHING;

-- Demo logins for evaluation only; replace these in any real deployment. Passwords are scrypt hashes.
INSERT INTO app_user (user_id, full_name, email, password_hash, role, student_id, warden_id) VALUES
  (1, 'HostelCare Administrator', 'admin@hostelcare.demo', 'scrypt$686f7374656c636172655f61646d696e5f64656d6f5f73616c745f7631$6f7f2026a4157d516bf074dbc216aebd191f3708b721a3e264e079ac71552a03f9552fc637cc4fb54d50d1efe7bd98bab15eaea7cd45f5b0a0a27d7fe47bbeba', 'ADMIN', NULL, NULL),
  (2, 'Ravi Kumar', 'warden@hostelcare.demo', 'scrypt$686f7374656c636172655f77617264656e5f64656d6f5f73616c745f7631$6bfb39c5c4421fe962edf18b8c9e158ccfc7626b13150b2782da6f012fc482165d889e68c06b4675e415a5ae998e8d0ab140f365e418510b16d6c7778f1563dc', 'WARDEN', NULL, 1),
  (3, 'Arjun Nair', 'student@hostelcare.demo', 'scrypt$686f7374656c636172655f73747564656e745f64656d6f5f73616c745f7631$14993c6ee08d40c028af250d98c37638a60393bb9ef92e8606fc98d6c814c037e9790c2be446d13a81a953959c230c03317d5bff94588a4f8ddfc401e62b9f7a', 'STUDENT', 1, NULL)
ON CONFLICT (email) DO NOTHING;

-- Keep sequences above any manually seeded IDs.
SELECT setval(pg_get_serial_sequence('hostel', 'hostel_id'), COALESCE((SELECT MAX(hostel_id) FROM hostel), 1));
SELECT setval(pg_get_serial_sequence('warden', 'warden_id'), COALESCE((SELECT MAX(warden_id) FROM warden), 1));
SELECT setval(pg_get_serial_sequence('student', 'student_id'), COALESCE((SELECT MAX(student_id) FROM student), 1));
SELECT setval(pg_get_serial_sequence('room', 'room_id'), COALESCE((SELECT MAX(room_id) FROM room), 1));
SELECT setval(pg_get_serial_sequence('complaint_category', 'category_id'), COALESCE((SELECT MAX(category_id) FROM complaint_category), 1));
SELECT setval(pg_get_serial_sequence('room_allocation', 'allocation_id'), COALESCE((SELECT MAX(allocation_id) FROM room_allocation), 1));
SELECT setval(pg_get_serial_sequence('complaint', 'complaint_id'), COALESCE((SELECT MAX(complaint_id) FROM complaint), 1));

SELECT setval(pg_get_serial_sequence('app_user', 'user_id'), COALESCE((SELECT MAX(user_id) FROM app_user), 1));
