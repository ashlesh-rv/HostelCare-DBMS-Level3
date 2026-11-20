# HostelCare — Hostel Room Allocation & Complaint Management System

## Problem statement
Hostel room allocation and maintenance complaints can become difficult to coordinate when student information, room occupancy, and issue follow-up are maintained in separate manual records. This can lead to room over-allocation, unclear vacancy information, delayed complaint handling, and limited visibility into recurring hostel issues.

## Objectives
1. Maintain student, hostel, room, warden, room-allocation, and complaint records in a normalized relational database.
2. Prevent allocation of rooms under maintenance, rooms that exceed bed capacity, and students receiving more than one active allocation.
3. Allow students to submit complaints and track the status of their own complaints.
4. Allow Admins and Wardens to review, assign, and update complaints according to their roles.
5. Keep an activity history in MongoDB and produce reports from PostgreSQL and MongoDB.
6. Demonstrate database design, relational integrity, SQL queries, transaction processing, triggers, views, indexes, full-text search, and NoSQL aggregation through a functional Next.js app.

## Scope
**Included:** authentication, three demo roles (Admin, Warden, Student), student directory, hostel room availability, room allocation and vacating, complaint submission and assignment, complaint status tracking, complaint event history, reports, validation, and database-backed dashboard.

**Not included in this mini-project:** payment gateway, biometric entry, messaging integrations, mobile app, and AI prediction. These are outside the intended medium-sized scope.

## Role permissions
| Feature | Admin | Warden | Student |
|---|---|---|---|
| View overall dashboard | Yes | Yes | Own complaint summary only |
| Create/edit/delete student records | Yes | No | No |
| Create rooms | Yes | No | No |
| Allocate/vacate rooms | Yes | Yes | No |
| Submit a complaint | On behalf of a student | On behalf of a student | Own account only |
| Assign any warden | Yes | No | No |
| Assign a complaint to self | Yes | Yes | No |
| Change complaint status | Yes | Only assigned complaints | No |
| View own complaint history | Yes | Assigned/unassigned permitted by API checks | Own complaints only |
| View operational reports | Yes | Yes | No |

## Functional requirements
- Login and logout with an HttpOnly signed session cookie.
- Form-based validation for student, room, allocation, and complaint inputs.
- Search and filter student and complaint tables.
- Room-availability display computed from active allocations.
- Transactional allocation with capacity/maintenance validation.
- Complaint status and assignment updates saved to PostgreSQL and logged to MongoDB.
- Reports for occupancy by hostel, complaints by category and priority/status, unallocated students, and MongoDB activity counts.

## Non-functional requirements
- Keep database credentials and session signing secret in environment variables.
- Use parameterized SQL to avoid SQL injection.
- Enforce role permissions in backend APIs, not only in the interface.
- Maintain foreign keys, unique keys, CHECK constraints, and transactional consistency.
- Use Git/GitHub and provide setup instructions.

## Meaningful extension beyond basic CRUD
HostelCare adds database-enforced room capacity checks, a partial unique index preventing multiple active allocations for one student, a room-availability view, a transactional allocation workflow, indexed full-text complaint search, and MongoDB event-history aggregation. The objective is to demonstrate how database features enforce operational rules and support reporting, not just to add/edit/delete rows.

## Team formation and contribution record
The course brief specifies a two-member team. Add your names below and keep the Git history consistent with the actual work each person performs.

| Team member | Planned responsibility | Evidence to retain |
|---|---|---|
| Member 1: `[name]` | SQL schema, constraints, triggers, reports, query testing | Commits, query screenshots, test evidence |
| Member 2: `[name]` | Next.js pages, API integration, authentication, UI testing | Commits, screenshots, test evidence |
| Both members | ER/schema review, integration, final demo and documentation | Joint review notes and demo record |

Both members should contribute to both database and application work as required by the brief; the split above is a starting point, not a restriction.
