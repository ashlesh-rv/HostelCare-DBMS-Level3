# Test plan and results

**Important:** these are the planned acceptance tests. Mark a test PASS only after you run it locally and capture evidence; do not report unexecuted tests as successful.

| ID | Test | Expected result | Result/evidence |
|---|---|---|---|
| T01 | Log in with valid Admin demo credentials | Session created; Admin navigation shown | Pending local execution |
| T02 | Log in with invalid password | 401 response; no session | Pending local execution |
| T03 | Open `/api/students` without a session | 401 response | Pending local execution |
| T04 | Student calls `POST /api/allocations` | 403 response | Pending local execution |
| T05 | Student submits a complaint | Complaint linked to that student's session, regardless of submitted studentId | Pending local execution |
| T06 | Student tries to update another complaint status | 403 response | Pending local execution |
| T07 | Allocate a student to a room with capacity remaining | Allocation saved; free bed count decreases | Pending local execution |
| T08 | Allocate a student who already has an active allocation | Rejected; no duplicate active allocation | Pending local execution |
| T09 | Allocate into a room under maintenance | Rejected by API/trigger | Pending local execution |
| T10 | Allocate into a full room | Rejected by transaction/trigger | Pending local execution |
| T11 | Vacate an active allocation | Status becomes VACATED; room becomes available | Pending local execution |
| T12 | Submit/update complaint with MongoDB available | PostgreSQL row saved and event document created | Pending local execution |
| T13 | Use complaint History action | MongoDB event history is retrieved | Pending local execution |
| T14 | Open Reports | Occupancy/category/status/student reports display; Mongo action aggregation visible | Pending local execution |
| T15 | Duplicate student email | API/database reject duplicate | Pending local execution |
| T16 | Delete a referenced student | Operation rejected; referential integrity preserved | Pending local execution |
| T17 | Search complaint/student table and filter status | Results update correctly | Pending local execution |
| T18 | Run `db/ddl_demonstration.sql` in one Query Tool session | CREATE, ALTER, SELECT, DROP on temporary table finish without permanent schema change | Pending local execution |

## Evidence to capture
Capture screenshots of: sign-in, dashboard, student directory, room allocation and availability, allocation history/vacating, complaint submission, status update, complaint history from MongoDB, reports, PostgreSQL schema/constraints, important query outputs, and test failures that show safeguards working.
