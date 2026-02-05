Railway migration runbook

1. Open Railway dashboard
2. Select Zephix application
3. Select environment production
4. Select backend service
5. Open the service shell
6. Run
   npm run migration:run

Verify docs table

Run this in Railway Postgres query tab

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'docs';

Verify indexes

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'docs';
