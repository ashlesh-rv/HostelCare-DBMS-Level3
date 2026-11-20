# Conclusion and future work

## Conclusion
HostelCare demonstrates a connected database-backed workflow for room allocation and complaint handling. PostgreSQL provides normalized records and enforces relationships and operational rules through constraints, indexes, a view, a trigger, and transactional API operations. MongoDB maintains a flexible complaint activity trail and supports aggregation of event types. Next.js provides the web interface, while signed sessions and backend role checks separate Admin, Warden, and Student actions.

## Limitations
- The seed logins are demonstration accounts, not production identities.
- PostgreSQL and MongoDB do not share a distributed transaction; PostgreSQL remains the source of truth and MongoDB audit logging may be unavailable temporarily.
- Test execution and screenshots must be completed on the team's own local environment before submission.
- This project does not implement payments, notifications, mobile clients, or vector embeddings.

## Future enhancements
- Add an outbox and retry worker so complaint audit events are retried if MongoDB is temporarily unavailable.
- Add complaint resolution timestamps and average-resolution-time reporting.
- Add notifications for urgent complaints and allocation confirmations.
- Add optional semantic complaint search only if it improves the project and the team can explain the embeddings/retrieval methodology.
