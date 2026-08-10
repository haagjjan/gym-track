#!/usr/bin/env sh

set -eu

app_password="$(cat /run/secrets/postgres_app_password)"

psql -X -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set app_password="$app_password" <<'SQL'
SELECT format(
  'CREATE ROLE gym_tracker_staging_app LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION',
  :'app_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gym_tracker_staging_app')
\gexec

ALTER ROLE gym_tracker_staging_app
  LOGIN PASSWORD :'app_password'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
GRANT CONNECT ON DATABASE gym_tracker_staging TO gym_tracker_staging_app;
GRANT USAGE ON SCHEMA public TO gym_tracker_staging_app;
ALTER DEFAULT PRIVILEGES FOR ROLE gym_tracker_staging_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gym_tracker_staging_app;
ALTER DEFAULT PRIVILEGES FOR ROLE gym_tracker_staging_owner IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO gym_tracker_staging_app;
SQL

unset app_password
