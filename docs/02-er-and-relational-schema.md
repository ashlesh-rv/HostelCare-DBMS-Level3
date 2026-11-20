# ER diagram and relational schema

The diagram file `hostelcare-er-diagram.png` is generated from `hostelcare-er-diagram.dot`. Primary keys are marked `PK`; foreign keys are marked `FK`.

## Entities and relationships
- HOSTEL 1:N ROOM
- HOSTEL 1:N WARDEN
- STUDENT 1:N ROOM_ALLOCATION
- ROOM 1:N ROOM_ALLOCATION
- STUDENT 1:N COMPLAINT
- WARDEN 1:N COMPLAINT; a complaint can be unassigned until a warden is selected
- COMPLAINT_CATEGORY 1:N COMPLAINT
- APP_USER provides login identities; a student or warden may be linked to one login account. Admin accounts are not linked to a student or warden record.

## Relational schema
- `HOSTEL(hostel_id PK, hostel_name, location, gender_type)`
- `STUDENT(student_id PK, name, email UNIQUE, phone, course, year, created_at)`
- `ROOM(room_id PK, hostel_id FK → HOSTEL, room_number, floor, capacity, room_type, status, UNIQUE(hostel_id, room_number))`
- `WARDEN(warden_id PK, hostel_id FK → HOSTEL, name, email UNIQUE, phone)`
- `ROOM_ALLOCATION(allocation_id PK, student_id FK → STUDENT, room_id FK → ROOM, allocation_date, vacating_date, status)`
- `COMPLAINT_CATEGORY(category_id PK, category_name UNIQUE, description)`
- `COMPLAINT(complaint_id PK, student_id FK → STUDENT, category_id FK → COMPLAINT_CATEGORY, warden_id FK → WARDEN nullable, description, date_reported, status, priority)`
- `APP_USER(user_id PK, full_name, email UNIQUE, password_hash, role, student_id FK → STUDENT nullable UNIQUE, warden_id FK → WARDEN nullable UNIQUE, is_active, created_at)`

## Important constraints
- Student email and warden email are unique.
- Room number is unique within each hostel.
- `year` must be between 1 and 6; capacity must be positive; floor cannot be negative.
- Gender type, room type, room status, allocation status, complaint status, priority, and role values use `CHECK` constraints.
- Foreign-key actions maintain referential integrity; student and room records referenced by historical allocations/complaints cannot be deleted.
- A partial unique index allows only one `ACTIVE` allocation per student.
- Trigger `trg_check_room_allocation_capacity` rejects allocations into maintenance rooms and over-capacity room allocations.

## Data dictionary (summary)
| Table | Purpose | Key integrity rules |
|---|---|---|
| `hostel` | Hostel blocks/campuses | PK; gender type CHECK |
| `student` | Student records | PK; unique email; year CHECK |
| `room` | Rooms and capacity | PK; hostel FK; room-number uniqueness per hostel; capacity/status/type CHECKs |
| `warden` | Warden records | PK; hostel FK; unique email |
| `room_allocation` | Current and historical room assignments | PK; student/room FKs; date check; status CHECK; one active allocation per student |
| `complaint_category` | Standardized issue categories | PK; unique category name |
| `complaint` | Student issues and workflow status | PK; student/category FKs; optional warden FK; description/status/priority validation |
| `app_user` | Backend identities and authorization | PK; unique email; scrypt password hash; role CHECK; conditional student/warden FK CHECK |

The executable source of truth is `db/schema.sql`; run it before `db/seed.sql`. If the document and code ever differ during development, update both together before submission.
