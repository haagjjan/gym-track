\set ON_ERROR_STOP on

\getenv monitoring_database POSTGRES_DB

SELECT format(
  'CREATE ROLE gym_progress_monitor LOGIN'
)
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_catalog.pg_roles
  WHERE rolname = 'gym_progress_monitor'
)
\gexec

ALTER ROLE gym_progress_monitor WITH
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOREPLICATION
  NOBYPASSRLS
  CONNECTION LIMIT 2;

GRANT pg_monitor TO gym_progress_monitor;

SELECT format(
  'GRANT CONNECT ON DATABASE %I TO gym_progress_monitor',
  :'monitoring_database'
)
\gexec
