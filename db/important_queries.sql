-- HostelCare: DBMS Level 3 important query demonstrations.
-- Run SELECT statements freely. The DML demonstration at the end rolls back its changes.

-- 1. SELECT + JOIN: students and their active room allocations.
SELECT s.student_id, s.name, s.course, h.hostel_name, r.room_number, ra.allocation_date
FROM student s
LEFT JOIN room_allocation ra ON ra.student_id = s.student_id AND ra.status = 'ACTIVE'
LEFT JOIN room r ON r.room_id = ra.room_id
LEFT JOIN hostel h ON h.hostel_id = r.hostel_id
ORDER BY s.name;

-- 2. SELECT + VIEW: current availability by room.
SELECT hostel_name, room_number, capacity, occupied_beds, available_beds, maintenance_status
FROM room_availability
ORDER BY hostel_name, floor, room_number;

-- 3. GROUP BY + aggregate functions + HAVING: categories with at least one complaint.
SELECT cc.category_name, COUNT(c.complaint_id) AS complaint_count,
       COUNT(c.complaint_id) FILTER (WHERE c.status IN ('PENDING','IN_PROGRESS')) AS open_count
FROM complaint_category cc
JOIN complaint c ON c.category_id = cc.category_id
GROUP BY cc.category_id, cc.category_name
HAVING COUNT(c.complaint_id) > 0
ORDER BY complaint_count DESC, cc.category_name;

-- 4. GROUP BY + aggregate: complaint workload by warden (including unassigned complaints).
SELECT COALESCE(w.name, 'Unassigned') AS assigned_warden,
       COUNT(c.complaint_id) AS total_complaints,
       COUNT(c.complaint_id) FILTER (WHERE c.status = 'RESOLVED') AS resolved_complaints
FROM complaint c LEFT JOIN warden w ON w.warden_id = c.warden_id
GROUP BY w.warden_id, w.name
ORDER BY total_complaints DESC;

-- 5. Subquery (NOT EXISTS): students without an active room.
SELECT s.student_id, s.name, s.course, s.year
FROM student s
WHERE NOT EXISTS (
  SELECT 1 FROM room_allocation ra
  WHERE ra.student_id = s.student_id AND ra.status = 'ACTIVE'
)
ORDER BY s.name;

-- 6. Subquery: rooms whose occupied beds exceed the average occupancy across rooms.
SELECT ra.room_id, ra.hostel_name, ra.room_number, ra.occupied_beds
FROM room_availability ra
WHERE ra.occupied_beds > (SELECT AVG(occupied_beds) FROM room_availability)
ORDER BY ra.occupied_beds DESC;

-- 7. Full-text search using the GIN index idx_complaint_description_fts.
-- Change the search term as needed.
SELECT complaint_id, description, status, priority
FROM complaint
WHERE to_tsvector('simple', description) @@ plainto_tsquery('simple', 'water leakage')
ORDER BY date_reported DESC;

-- 8. UPDATE example: change the status of a known complaint.
-- Use a real complaint_id. In a production app, API authorization should gate this.
-- UPDATE complaint SET status = 'IN_PROGRESS' WHERE complaint_id = 1;

-- 9. DELETE example: the sample transaction below demonstrates INSERT, UPDATE, DELETE safely.
BEGIN;
INSERT INTO complaint_category (category_name, description)
VALUES ('DDL_DML_TEST_ONLY', 'Temporary row for DML demonstration')
ON CONFLICT (category_name) DO NOTHING;
UPDATE complaint_category SET description = 'Updated test description'
WHERE category_name = 'DDL_DML_TEST_ONLY';
DELETE FROM complaint_category WHERE category_name = 'DDL_DML_TEST_ONLY';
ROLLBACK;
