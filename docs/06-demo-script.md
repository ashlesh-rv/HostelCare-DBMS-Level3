# Suggested final demonstration order

1. **Problem and objective (30 sec):** explain room-capacity mistakes and complaint follow-up as the use cases.
2. **Login and roles (45 sec):** sign in as Admin, then show that Student and Warden accounts have different permitted actions.
3. **Database design (60 sec):** show the ER diagram, relational schema, primary/foreign keys, checks, and the `app_user` authentication mapping.
4. **Room allocation (60 sec):** allocate one unallocated student; show the `room_availability` count changing. Try an invalid/full/maintenance allocation and explain the transaction rollback and trigger.
5. **Complaint workflow (60 sec):** submit a complaint, sign in as a Warden, assign it to self, update status, and display its MongoDB event history.
6. **Reports and SQL concepts (60 sec):** show occupancy, complaints by category, priority/status, unallocated students, MongoDB event aggregation, and the query file demonstrating JOIN/GROUP BY/HAVING/ORDER BY/aggregates/subqueries/full-text search.
7. **Testing and Git (30 sec):** run the tests, show evidence, README, and meaningful commits from both members.

Use actual local screenshots and actual test results in the presentation; do not present planned tests as completed results.
