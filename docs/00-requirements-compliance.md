# DBMS Level 3 rubric compliance checklist

This checklist maps the uploaded *DBMS Level 3 Project Requirements* to the HostelCare implementation. It is a preparation aid; it does not replace testing the project in the team's own environment or getting instructor approval where required.

| Requirement in the brief | Implementation/evidence in this repository | Status / action before submission |
|---|---|---|
| A unique project title and meaningful real-world problem beyond basic CRUD | `README.md`; `docs/01-problem-objectives-scope.md` | Confirm that the title is unique within the section and obtain instructor approval. |
| Two-member team and individual contribution | `docs/team-contributions-template.md` | Fill the real names, work, dates, and commit hashes; do not invent contributions. |
| SQL database plus a second database paradigm | PostgreSQL DDL in `db/schema.sql`; MongoDB model in `lib/mongo.ts` and `docs/03-database-choice-and-nosql-model.md` | Configure both databases and verify `/api/health` locally. |
| ER diagram and relational schema with entities, attributes, keys, relationships, and constraints | `docs/hostelcare-er-diagram.png`, editable `.dot`, `docs/02-er-and-relational-schema.md`, `docs/data-dictionary.md` | Review the diagram and schema against the actual database after any changes. |
| NoSQL data model, documents, indexes, retrieval, and aggregation | `lib/mongo.ts`; `docs/03-database-choice-and-nosql-model.md` | Capture a real MongoDB document and aggregation result as evidence. |
| SQL DDL: CREATE, ALTER, DROP, keys, constraints, indexes, views | `db/schema.sql`, `db/ddl_demonstration.sql` | Run both scripts successfully in PostgreSQL and capture output/screenshots. The temporary-table demo is intended to run in one Query Tool session. |
| DML and meaningful queries: SELECT, INSERT, UPDATE, DELETE, JOIN, GROUP BY, HAVING, ORDER BY, aggregates, subqueries | `db/important_queries.sql`; API route handlers under `app/api/` | Run the queries and keep outputs for the report/demo. |
| At least four advanced SQL concepts and one NoSQL/Vector concept | PostgreSQL transaction, view, PL/pgSQL trigger function/trigger, indexes, full-text GIN search; MongoDB event aggregation | Demonstrate at least four SQL concepts and the MongoDB aggregation during the live demo. |
| Functional Next.js interface with forms, tables, search/filter, dashboard | `app/page.tsx`, `app/globals.css` | Start the application locally and capture real screenshots. |
| Next.js-to-database integration through API; secrets in environment variables | `app/api/`, `lib/db.ts`, `lib/mongo.ts`, `.env.example` | Use `.env.local` locally; never commit credentials or the session secret. |
| Backend authentication and at least two roles | `lib/auth.ts`, `/api/auth/*`, per-route checks; Admin, Warden, Student demo accounts in `db/seed.sql` | Run positive and negative role-access tests. Change seeded passwords before any non-demo deployment. |
| Database-level validation and integrity | PostgreSQL NOT NULL, UNIQUE, CHECK, PK/FK constraints, partial unique index, and allocation trigger | Demonstrate duplicate, invalid, over-capacity, and referential-integrity cases. |
| Required soft-copy documentation | All files under `docs/`, `README.md`, SQL files | Capture and add actual screenshots; replace “Pending local execution” with real test results. |
| Git/GitHub and individual commits | README instructions and contribution template | Initialize/push the repository and make meaningful commits from both team members' accounts. |
| Final demonstration and originality | `docs/06-demo-script.md`, `docs/05-testing-plan.md` | Practice the demo, show each member's contribution, customize seed/demo data, and cite any external learning sources used. |
| Vector/semantic search (optional but recommended) | Not included; the project selects the permitted SQL + NoSQL option and uses MongoDB event aggregation | Explain the database choice. Add semantic search only if the instructor explicitly requires it or the team has enough time. |

## Final sign-off checklist

- [ ] Instructor confirms project title uniqueness and approves the two-person team.
- [ ] PostgreSQL schema and sample data scripts run without errors.
- [ ] MongoDB is reachable and complaint activity records are created and retrieved.
- [ ] `npm install`, `npm run build`, and `node tests/api-smoke.mjs` complete successfully on a team machine.
- [ ] All acceptance tests in `docs/05-testing-plan.md` have actual PASS/FAIL results and evidence.
- [ ] Real UI, SQL, MongoDB, and test screenshots are added to `docs/screenshots/`.
- [ ] Both members have truthful contribution records and Git commits.
- [ ] Demo credentials are treated as local coursework-only credentials.
