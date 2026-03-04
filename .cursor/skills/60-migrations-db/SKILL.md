Name
migrations-db

Description
Use for TypeORM migrations, schema verify, and local postgres boot.

Instructions

Never run migrations implicitly on boot unless project already does.

Prefer explicit db:migrate script with DATABASE_URL set.

If local compose is needed, use docker-compose.local.yml.

Capture proof: docker ps, pg_isready health, migration output.
