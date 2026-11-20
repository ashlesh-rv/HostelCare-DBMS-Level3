# HostelCare — Hostel Room Allocation & Complaint Management System

A medium-sized DBMS Level 3 mini-project built around a real hostel workflow: capacity-safe room allocation and accountable complaint resolution. It is designed to go beyond a basic CRUD-only app by using transaction processing, a database trigger, a reporting view, indexes, full-text search, and MongoDB event aggregation.

## Technology choice (matches the course brief)

- **Frontend:** Next.js 16 / React 19
- **Backend:** Next.js Route Handlers (`app/api/...`)
- **Mandatory SQL database:** PostgreSQL
- **Second database paradigm:** MongoDB, used for the flexible `complaint_events` activity-history collection
- **Version control:** Git + GitHub

This project follows the course brief's **SQL + NoSQL option**. A vector database is not required for this selected option; the brief calls semantic/vector search optional but recommended for text-heavy projects.

## Features included

- Login/logout with a signed, HttpOnly session cookie; backend role checks for **Admin, Warden, Student**.
- Student directory with registration, edit, delete (deletion is rejected when referenced records exist), search, and current allocation display.
- Room creation for Admin, live room availability, capacity-safe room allocation, allocation history, and vacating records.
- Complaint submission, priority, category, assignment, search/filter, status transitions, and MongoDB event history.
- Reports for hostel occupancy, complaints by category, complaint priority/status, students without active allocations, and MongoDB event actions.
- PostgreSQL schema constraints, primary/foreign keys, unique indexes, a partial index, full-text GIN index, `room_availability` view, and room-capacity trigger.
- Parameterized SQL, server-side validation, environment-based configuration, and transaction rollback for room allocation.
- Documentation files for the problem statement, ER diagram, relational schema, database choice, architecture, tests, and final-demo order.

## Database design files

| File | Purpose |
|---|---|
| `db/schema.sql` | Main DDL: tables, primary/foreign keys, CHECK/UNIQUE constraints, indexes, view, and trigger |
| `db/seed.sql` | Sample hostel/student/room/complaint data and demo login users |
| `db/ddl_demonstration.sql` | Safe temporary-table demonstration of `CREATE`, `ALTER`, and `DROP` |
| `db/important_queries.sql` | SELECT, INSERT, UPDATE, DELETE, JOIN, GROUP BY, HAVING, ORDER BY, aggregates, subqueries, and full-text search examples |
| `docs/hostelcare-er-diagram.png` | ER diagram image generated from the DOT source |
| `docs/hostelcare-er-diagram.dot` | Editable source for the ER diagram |
| `docs/02-er-and-relational-schema.md` | Relational schema, relationships, keys, and constraints |
| `docs/data-dictionary.md` | Field-level column types, nullability, keys, and meaning |
| `docs/03-database-choice-and-nosql-model.md` | MongoDB collection/document model, indexes, retrieval, and aggregation rationale |
| `docs/04-system-architecture.md` | Architecture and data-flow description |
| `docs/05-testing-plan.md` | Acceptance tests and evidence checklist |
| `docs/06-demo-script.md` | Suggested final demonstration order |
| `docs/07-conclusion-and-future-work.md` | Conclusion, limitations, and future enhancement ideas |
| `tests/api-smoke.mjs` | Read-only API/auth smoke tests for a running instance |
| `docs/screenshots/README.md` | List of real screenshots to capture after running the app |

## Prerequisites

1. Install **Node.js 20.9 or later** (Node 22 LTS is suitable for this project).
2. Install and start PostgreSQL.
3. Install/start MongoDB locally or create a MongoDB Atlas database.
4. Open this folder in VS Code.

## 1. Create and initialize PostgreSQL

Create a database named `hostel_db` in pgAdmin, then run these two files in order in the database's Query Tool:

1. `db/schema.sql`
2. `db/seed.sql`

Equivalent terminal commands (if `psql` is on PATH):

```bash
psql -U postgres -d hostel_db -f db/schema.sql
psql -U postgres -d hostel_db -f db/seed.sql
```

Use `db/ddl_demonstration.sql` separately when presenting CREATE/ALTER/DROP. It uses a temporary table and drops only that temporary table.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` in the project root and replace values with your local settings:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/hostel_db
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=hostel_system
SESSION_SECRET=replace_with_a_random_secret_at_least_32_characters_long
PGSSL=false
```

Generate a suitable session secret with Node.js or run `node scripts/generate-session-secret.mjs`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Paste the generated value as `SESSION_SECRET`. Do not commit `.env.local`; it is ignored by Git.

## 3. Install and run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Keep PostgreSQL and MongoDB running while using the application.

The endpoint <http://localhost:3000/api/health> checks database connectivity. The endpoint itself does not return credentials, but it is a diagnostic endpoint intended for local coursework/demo use.

## Demo accounts (local evaluation only)

Run `db/seed.sql` before signing in. These accounts are seeded with scrypt password hashes:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@hostelcare.demo` | `Admin@123` |
| Warden | `warden@hostelcare.demo` | `Warden@123` |
| Student | `student@hostelcare.demo` | `Student@123` |

These are intentionally predictable demo credentials. Do not deploy publicly with them; replace demo users/passwords and the session secret before any real use.

## Role behavior

- **Admin:** student create/edit/delete, room creation, room allocation/vacating, complaint assignment/status changes, reports.
- **Warden:** view students/rooms, allocate/vacate rooms, assign complaints to self, update complaints assigned to self, reports.
- **Student:** view own complaint records, submit a complaint tied to their account, and view their own complaint history. Student requests cannot choose another student's identity at the API layer.

## API endpoints

| Method | Endpoint | Access / purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate and set signed session cookie |
| `GET` | `/api/auth/session` | Return signed-in user identity |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/health` | Database connectivity diagnostic |
| `GET` | `/api/dashboard` | Role-scoped counts, recent complaints, room availability |
| `GET` / `POST` | `/api/students` | List/create students (create is Admin-only) |
| `PATCH` / `DELETE` | `/api/students/:id` | Edit/delete student (Admin-only) |
| `GET` / `POST` | `/api/rooms` | View availability/create room (create is Admin-only) |
| `GET` / `POST` | `/api/allocations` | View allocation history/allocate a room (allocation is staff-only) |
| `PATCH` | `/api/allocations/:id` | Vacate an active allocation (staff-only) |
| `GET` | `/api/hostels` | List hostels for room creation |
| `GET` / `POST` | `/api/complaints` | List role-scoped complaints/create a complaint |
| `PATCH` / `DELETE` | `/api/complaints/:id` | Update complaint status/assignment; Admin-only delete |
| `GET` | `/api/complaints/:id/history` | Retrieve permitted MongoDB activity events |
| `GET` | `/api/reports` | SQL reporting queries and MongoDB aggregation (Admin/Warden) |

## Database concepts to demonstrate

1. **Constraints and referential integrity:** primary/foreign keys, `NOT NULL`, `UNIQUE`, `CHECK` constraints.
2. **Transactions:** room allocation begins a transaction, locks the selected room, validates capacity and active student allocation, then commits or rolls back.
3. **Trigger:** `trg_check_room_allocation_capacity` prevents allocation to maintenance rooms and room over-capacity.
4. **View:** `room_availability` computes occupied and available beds.
5. **Indexes:** active-allocation partial unique index, room/complaint indexes, and full-text search GIN index.
6. **Full-text search:** documented query in `db/important_queries.sql` uses PostgreSQL `to_tsvector`/`plainto_tsquery`.
7. **NoSQL aggregation:** MongoDB report groups `complaint_events` documents by action and counts them.

Run `db/important_queries.sql` to demonstrate DML and important SELECT patterns. The sample DML demonstration runs in a transaction that rolls back its test changes.

## Testing and submission checklist

- With the app running and the seeded databases initialized, run `node tests/api-smoke.mjs`, then complete the test cases in `docs/05-testing-plan.md` and replace “Pending local execution” with actual results and evidence.
- Capture screenshots listed in `docs/screenshots/README.md` from the running application; screenshots are not fabricated in this project package.
- Keep the ER diagram and relational schema in the report and show why PostgreSQL and MongoDB each fit their data.
- Complete team names and real contributions in `docs/01-problem-objectives-scope.md` and `docs/team-contributions-template.md`.
- Create meaningful Git commits under both team members' identities, push the repository, and provide a README with run instructions.
- In the final demo, show the application UI, database implementation, advanced database features, test cases, and each member's contribution.

## Current verification note

The TypeScript/TSX files were checked for parse/transpilation syntax errors. A complete Next.js build and live PostgreSQL/MongoDB run have **not** been verified in this environment because `npm install` timed out. After installation on your machine, run `npm run build` and the acceptance tests before reporting the project as fully tested. Also complete `docs/00-requirements-compliance.md`, including the instructor title/team check, actual screenshots, test outcomes, and truthful contribution records.
