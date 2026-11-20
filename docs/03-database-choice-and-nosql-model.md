# Database choice and NoSQL data model

## Paradigm choice
This project follows **Option 1: SQL + NoSQL** from the course brief.

### PostgreSQL (mandatory SQL database)
PostgreSQL stores entities with stable columns and relationships: hostels, students, rooms, wardens, room allocations, complaint categories, complaints, and login identities. These records need foreign keys, uniqueness, transactions, joins, and integrity constraints. PostgreSQL is the source of truth for the current complaint status and active room allocation.

### MongoDB (NoSQL database)
MongoDB stores the `complaint_events` collection. Each document records a complaint event rather than duplicating the current complaint row. The event shape supports optional fields as the action evolves.

Example document:
```json
{
  "complaintId": 12,
  "action": "STATUS_CHANGED",
  "actor": "warden:2",
  "oldStatus": "PENDING",
  "newStatus": "IN_PROGRESS",
  "note": "Maintenance team has been informed.",
  "createdAt": "2026-10-25T12:00:00.000Z"
}
```

## MongoDB data model
- **Database:** value of `MONGODB_DB` (default `hostel_system`)
- **Collection:** `complaint_events`
- **Document fields:** `complaintId` (integer), `action` (string), `actor` (role/user identifier), optional `oldStatus`, `newStatus`, `note`, and `createdAt` (date)
- **Indexes:** `{ complaintId: 1, createdAt: -1 }` for event-history retrieval and `{ action: 1, createdAt: -1 }` for activity aggregation
- **Retrieval:** `/api/complaints/:id/history` fetches a complaint's event trail; students may retrieve only their own, wardens are limited by assignment, and admins can retrieve all
- **Aggregation:** `/api/reports` groups event documents by `action`, counts each group, and finds the most recent event timestamp

## Consistency decision
The current status remains in PostgreSQL so filtering/reporting is consistent. MongoDB stores an audit/event history. The API reports if MongoDB logging was unavailable rather than pretending the audit event was saved. For production-grade cross-database consistency, an outbox/retry strategy would be stronger; it is outside the mini-project scope and should be discussed as a limitation.

## Vector database
A vector database is **not used** in this implementation. The course brief allows SQL + NoSQL as the minimum option; vector/semantic search is optional but recommended for text-heavy projects. This project uses MongoDB event aggregation instead of introducing embeddings that are not needed for its main workflow.
