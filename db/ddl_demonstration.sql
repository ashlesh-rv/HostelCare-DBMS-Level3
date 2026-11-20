-- Safe classroom demonstration of CREATE, ALTER, and DROP.
-- Uses a TEMPORARY table, so it does not alter the project tables permanently.
-- Run all statements in a single PostgreSQL Query Tool session.
BEGIN;
CREATE TEMPORARY TABLE ddl_demo_log (
    demo_id INT PRIMARY KEY,
    label VARCHAR(50) NOT NULL
) ON COMMIT PRESERVE ROWS;
ALTER TABLE ddl_demo_log ADD COLUMN note TEXT;
INSERT INTO ddl_demo_log (demo_id, label, note) VALUES (1, 'DDL demonstration', 'Temporary test row');
SELECT * FROM ddl_demo_log;
DROP TABLE ddl_demo_log;
COMMIT;
