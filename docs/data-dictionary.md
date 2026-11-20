# Data dictionary

This dictionary describes the core columns in `db/schema.sql`. PostgreSQL is the system of record for the tables below.

## HOSTEL
| Column | Type | Null? | Key / rule | Meaning |
|---|---|---|---|---|
| `hostel_id` | SERIAL | No | PK | Unique hostel identifier |
| `hostel_name` | VARCHAR(100) | No | — | Display name of hostel |
| `location` | VARCHAR(100) | No | — | Campus/location description |
| `gender_type` | VARCHAR(10) | No | CHECK MALE/FEMALE/MIXED | Hostel designation |

## STUDENT
| Column | Type | Null? | Key / rule | Meaning |
|---|---|---|---|---|
| `student_id` | SERIAL | No | PK | Unique student identifier |
| `name` | VARCHAR(100) | No | — | Student name |
| `email` | VARCHAR(100) | No | UNIQUE | Login/contact email |
| `phone` | VARCHAR(15) | No | — | Contact number |
| `course` | VARCHAR(50) | No | — | Academic course |
| `year` | INT | No | CHECK 1–6 | Year of study |
| `created_at` | TIMESTAMPTZ | No | Default NOW() | Record creation time |

## ROOM
| Column | Type | Null? | Key / rule | Meaning |
|---|---|---|---|---|
| `room_id` | SERIAL | No | PK | Unique room identifier |
| `hostel_id` | INT | No | FK → HOSTEL | Parent hostel |
| `room_number` | VARCHAR(20) | No | UNIQUE with hostel_id | Room number within its hostel |
| `floor` | INT | No | CHECK >= 0 | Floor number |
| `capacity` | INT | No | CHECK > 0 | Maximum bed count |
| `room_type` | VARCHAR(20) | No | CHECK SINGLE/DOUBLE/TRIPLE/DORMITORY | Room classification |
| `status` | VARCHAR(15) | No | Default AVAILABLE; CHECK AVAILABLE/MAINTENANCE | Operational room state |

## WARDEN
| Column | Type | Null? | Key / rule | Meaning |
|---|---|---|---|---|
| `warden_id` | SERIAL | No | PK | Unique warden identifier |
| `hostel_id` | INT | No | FK → HOSTEL | Hostel managed by warden |
| `name` | VARCHAR(100) | No | — | Warden name |
| `email` | VARCHAR(100) | No | UNIQUE | Warden email |
| `phone` | VARCHAR(15) | No | — | Contact number |

## ROOM_ALLOCATION
| Column | Type | Null? | Key / rule | Meaning |
|---|---|---|---|---|
| `allocation_id` | SERIAL | No | PK | Unique allocation record |
| `student_id` | INT | No | FK → STUDENT | Student being allocated |
| `room_id` | INT | No | FK → ROOM | Selected room |
| `allocation_date` | DATE | No | Default CURRENT_DATE | Start date |
| `vacating_date` | DATE | Yes | Must be >= allocation_date | Date student vacates |
| `status` | VARCHAR(15) | No | Default ACTIVE; CHECK ACTIVE/VACATED/CANCELLED | Allocation state |

## COMPLAINT_CATEGORY
| Column | Type | Null? | Key / rule | Meaning |
|---|---|---|---|---|
| `category_id` | SERIAL | No | PK | Unique category identifier |
| `category_name` | VARCHAR(100) | No | UNIQUE | Category label, e.g. WATER |
| `description` | VARCHAR(200) | No | — | Explanation of category |

## COMPLAINT
| Column | Type | Null? | Key / rule | Meaning |
|---|---|---|---|---|
| `complaint_id` | SERIAL | No | PK | Unique complaint identifier |
| `student_id` | INT | No | FK → STUDENT | Reporting student |
| `category_id` | INT | No | FK → COMPLAINT_CATEGORY | Complaint category |
| `warden_id` | INT | Yes | FK → WARDEN, ON DELETE SET NULL | Assigned warden; can be unassigned |
| `description` | TEXT | No | — | Details of issue |
| `date_reported` | TIMESTAMPTZ | No | Default NOW() | Submission timestamp |
| `status` | VARCHAR(20) | No | Default PENDING; CHECK PENDING/IN_PROGRESS/RESOLVED/REJECTED | Workflow status |
| `priority` | VARCHAR(10) | No | Default MEDIUM; CHECK LOW/MEDIUM/HIGH/URGENT | Issue priority |

## APP_USER
| Column | Type | Null? | Key / rule | Meaning |
|---|---|---|---|---|
| `user_id` | SERIAL | No | PK | Unique application user |
| `full_name` | VARCHAR(100) | No | — | Name displayed in the UI |
| `email` | VARCHAR(254) | No | UNIQUE | Login identifier |
| `password_hash` | TEXT | No | scrypt format | Password hash, never plaintext |
| `role` | VARCHAR(10) | No | CHECK ADMIN/WARDEN/STUDENT | Server-enforced access role |
| `student_id` | INT | Yes | UNIQUE FK → STUDENT | Set for a student login only |
| `warden_id` | INT | Yes | UNIQUE FK → WARDEN | Set for a warden login only |
| `is_active` | BOOLEAN | No | Default TRUE | Allows account deactivation |
| `created_at` | TIMESTAMPTZ | No | Default NOW() | Account creation time |

## Views and NoSQL fields
- `room_availability` is a view, not a base table; it includes the room's capacity, occupied beds, available beds, and maintenance state.
- MongoDB `complaint_events` documents are described in `03-database-choice-and-nosql-model.md`.
