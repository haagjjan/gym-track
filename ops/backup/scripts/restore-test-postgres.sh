#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
# shellcheck source=backup-common.sh
source "${SCRIPT_DIR}/backup-common.sh"

require_root
require_command docker
require_command flock
require_command jq
require_command openssl
require_command sha256sum

exec 9>"${BACKUP_LOCK_FILE}"
flock -n 9 || {
  printf 'ERROR: another Gym Tracker backup or maintenance job is running\n' >&2
  exit 1
}

load_restic_environment
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
compact_timestamp="$(tr -d 'TZ' <<< "${timestamp}")"
restore_root="${BACKUP_ROOT}/restore-tests/postgres-${timestamp}"
report_file="${BACKUP_ROOT}/reports/postgres-restore-${timestamp}.env"
container_name="gym-stage11-postgres-${compact_timestamp}"
network_name="gym-stage11-network-${compact_timestamp}"
volume_name="gym-stage11-data-${compact_timestamp}"
password_file="${restore_root}/postgres-password"
start_epoch="$(date +%s)"

cleanup() {
  docker rm -f "${container_name}" >/dev/null 2>&1 || true
  docker volume rm "${volume_name}" >/dev/null 2>&1 || true
  docker network rm "${network_name}" >/dev/null 2>&1 || true
  if [[ -d "${restore_root}" && ! -L "${restore_root}" ]]; then
    find "${restore_root}" -mindepth 1 -delete
    rmdir "${restore_root}"
  fi
}
trap cleanup EXIT

install -d -o root -g root -m 0700 "${restore_root}"
snapshot_id="$(run_restic snapshots --host gym-prod --tag gym-tracker --json \
  | jq -r 'max_by(.time).short_id // empty')"
[[ -n "${snapshot_id}" ]] || {
  printf 'ERROR: no Gym Tracker snapshot is available for restore testing\n' >&2
  exit 1
}
run_restic restore "${snapshot_id}" --target "${restore_root}"

mapfile -t dump_files < <(find "${restore_root}" -type f -name 'gym_tracker-????????T??????Z.dump' | LC_ALL=C sort)
[[ "${#dump_files[@]}" -eq 1 ]] || {
  printf 'ERROR: expected exactly one PostgreSQL dump in the restored snapshot\n' >&2
  exit 1
}
dump_file="${dump_files[0]}"
dump_checksum="$(sha256sum "${dump_file}" | awk '{print $1}')"

production_container="$(docker compose -p gym-tracker -f "${GYM_TRACKER_ROOT}/deploy/compose/compose.yaml" ps -q postgres)"
[[ -n "${production_container}" ]] || {
  printf 'ERROR: production PostgreSQL container is unavailable\n' >&2
  exit 1
}
postgres_image="$(docker inspect -f '{{.Config.Image}}' "${production_container}")"

openssl rand -base64 48 > "${password_file}"
chmod 0600 "${password_file}"
docker network create --internal "${network_name}" >/dev/null
docker volume create "${volume_name}" >/dev/null
docker run -d \
  --name "${container_name}" \
  --network "${network_name}" \
  --restart=no \
  -e POSTGRES_PASSWORD_FILE=/run/secrets/postgres-password \
  -v "${password_file}:/run/secrets/postgres-password:ro" \
  -v "${volume_name}:/var/lib/postgresql/data" \
  "${postgres_image}" >/dev/null

for _ in $(seq 1 60); do
  if docker exec "${container_name}" pg_isready -U postgres -d postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "${container_name}" pg_isready -U postgres -d postgres >/dev/null

docker exec -i "${container_name}" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres >/dev/null <<'SQL'
CREATE ROLE gym_tracker_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
CREATE ROLE gym_tracker_migrator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
CREATE ROLE gym_tracker_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
CREATE ROLE gym_tracker_backup NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
CREATE ROLE gym_progress_monitor NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
CREATE ROLE gym_tracker_monitor NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
CREATE DATABASE gym_tracker OWNER gym_tracker_owner;
SQL

docker cp "${dump_file}" "${container_name}:/tmp/gym-tracker-restore.dump" >/dev/null
docker exec "${container_name}" pg_restore \
  --exit-on-error \
  --username=postgres \
  --dbname=gym_tracker \
  /tmp/gym-tracker-restore.dump >/dev/null

mapfile -t erasure_ledgers < <(find "${restore_root}" -type f -path '*/state/erasure-ledger/current.csv')
[[ "${#erasure_ledgers[@]}" -eq 1 ]] || {
  printf 'ERROR: expected exactly one protected erasure ledger in the restored snapshot\n' >&2
  exit 1
}
erasure_ledger_checksum="$(sha256sum "${erasure_ledgers[0]}" | awk '{print $1}')"
"${SCRIPT_DIR}/replay-erasure-ledger.sh" "${container_name}" "${erasure_ledgers[0]}" >/dev/null

count_query=$(cat <<'SQL'
SELECT format('SELECT %L || E''\t'' || count(*)::text FROM %I.%I;', schemaname || '.' || tablename, schemaname, tablename)
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename
\gexec
SQL
)
live_counts_hash="$(docker exec -i "${production_container}" psql -X -qAt -U postgres -d gym_tracker <<< "${count_query}" | sha256sum | awk '{print $1}')"
restored_counts_hash="$(docker exec -i "${container_name}" psql -X -qAt -U postgres -d gym_tracker <<< "${count_query}" | sha256sum | awk '{print $1}')"
[[ "${live_counts_hash}" == "${restored_counts_hash}" ]] || {
  printf 'ERROR: restored table counts do not match production\n' >&2
  exit 1
}

public_table_count="$(docker exec "${container_name}" psql -X -qAt -U postgres -d gym_tracker -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")"
migration_ledger_count="$(docker exec "${container_name}" psql -X -qAt -U postgres -d gym_tracker -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname IN ('pgmigrations', 'schema_migrations')")"
invalid_foreign_keys="$(docker exec "${container_name}" psql -X -qAt -U postgres -d gym_tracker -c "SELECT count(*) FROM pg_constraint WHERE contype = 'f' AND NOT convalidated")"
[[ "${migration_ledger_count}" -ge 1 && "${invalid_foreign_keys}" -eq 0 ]] || {
  printf 'ERROR: restored migration ledger or foreign-key validation failed\n' >&2
  exit 1
}

docker exec -i "${container_name}" psql -X -v ON_ERROR_STOP=1 -U postgres -d gym_tracker >/dev/null <<'SQL'
SET SESSION AUTHORIZATION gym_tracker_app;
SELECT count(*) FROM users;
SQL

finish_epoch="$(date +%s)"
duration="$((finish_epoch - start_epoch))"
install -d -o root -g gym-tracker -m 0750 "${BACKUP_ROOT}/reports"
umask 027
{
  printf 'TEST=postgres-restore\n'
  printf 'RESULT=passed\n'
  printf 'TIMESTAMP=%s\n' "${timestamp}"
  printf 'SNAPSHOT=%s\n' "${snapshot_id}"
  printf 'POSTGRES_IMAGE=%s\n' "${postgres_image}"
  printf 'DUMP_SHA256=%s\n' "${dump_checksum}"
  printf 'ERASURE_LEDGER_SHA256=%s\n' "${erasure_ledger_checksum}"
  printf 'LIVE_COUNTS_SHA256=%s\n' "${live_counts_hash}"
  printf 'RESTORED_COUNTS_SHA256=%s\n' "${restored_counts_hash}"
  printf 'PUBLIC_TABLE_COUNT=%s\n' "${public_table_count}"
  printf 'INVALID_FOREIGN_KEYS=%s\n' "${invalid_foreign_keys}"
  printf 'DURATION_SECONDS=%s\n' "${duration}"
} > "${report_file}"
chown root:gym-tracker "${report_file}"
chmod 0640 "${report_file}"
record_restore_success "${finish_epoch}"

printf '{"event":"gym_tracker_postgres_restore_test_passed","duration_seconds":%s,"table_count":%s}\n' \
  "${duration}" "${public_table_count}"
