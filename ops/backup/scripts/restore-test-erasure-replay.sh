#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
# shellcheck source=backup-common.sh
source "${SCRIPT_DIR}/backup-common.sh"

require_root
require_command date
require_command docker
require_command flock
require_command jq
require_command openssl
require_command sha256sum

if [[ "$#" -ne 1 || ! "$1" =~ ^[0-9a-f]{8,64}$ ]]; then
  printf 'Usage: %s OLDER_SNAPSHOT_ID\n' "$0" >&2
  exit 2
fi

readonly older_snapshot_id="$1"
exec 9>"${BACKUP_LOCK_FILE}"
flock -n 9 || {
  printf 'ERROR: another Gym Tracker backup or maintenance job is running\n' >&2
  exit 1
}

load_restic_environment
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
compact_timestamp="$(tr -d 'TZ' <<< "${timestamp}")"
restore_root="${BACKUP_ROOT}/restore-tests/erasure-replay-${timestamp}"
older_root="${restore_root}/older"
ledger_root="${restore_root}/newest-ledger"
report_file="${BACKUP_ROOT}/reports/erasure-replay-restore-${timestamp}.env"
container_name="gym-erasure-replay-postgres-${compact_timestamp}"
network_name="gym-erasure-replay-network-${compact_timestamp}"
volume_name="gym-erasure-replay-data-${compact_timestamp}"
password_file="${restore_root}/postgres-password"
container_audit_ledger="/tmp/gym-tracker-erasure-audit.csv"
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

wait_for_stable_postgres() {
  local ready_streak=0
  local attempt
  for attempt in $(seq 1 60); do
    if docker exec "${container_name}" pg_isready -U postgres -d postgres >/dev/null 2>&1; then
      ready_streak="$((ready_streak + 1))"
      [[ "${ready_streak}" -ge 3 ]] && return 0
    else
      ready_streak=0
    fi
    sleep 1
  done
  docker logs --tail 50 "${container_name}" >&2
  printf 'ERROR: isolated PostgreSQL container did not become stably ready\n' >&2
  return 1
}

migration_ledger_hash() {
  local database_container="$1"
  local migration_table
  migration_table="$(docker exec "${database_container}" psql -X -qAt -U postgres -d gym_tracker -c \
    "SELECT CASE WHEN to_regclass('public.schema_migrations') IS NOT NULL THEN 'schema_migrations' WHEN to_regclass('public.pgmigrations') IS NOT NULL THEN 'pgmigrations' ELSE '' END")"
  case "${migration_table}" in
    schema_migrations | pgmigrations) ;;
    *) printf 'ERROR: migration ledger is unavailable\n' >&2; return 1 ;;
  esac
  docker exec "${database_container}" psql -X -qAt -U postgres -d gym_tracker \
    -c "COPY (SELECT name FROM ${migration_table} ORDER BY id) TO STDOUT" \
    | sha256sum | awk '{print $1}'
}

install -d -o root -g root -m 0700 "${older_root}" "${ledger_root}"
snapshots_json="$(run_restic snapshots --host gym-prod --tag gym-tracker --json)"
newest_snapshot_id="$(jq -r 'max_by(.time).short_id // empty' <<< "${snapshots_json}")"
newest_snapshot_time="$(jq -r 'max_by(.time).time // empty' <<< "${snapshots_json}")"
older_snapshot_time="$(jq -r --arg id "${older_snapshot_id}" \
  '.[] | select(.short_id == $id or .id == $id) | .time' <<< "${snapshots_json}" | head -n 1)"
[[ -n "${newest_snapshot_id}" && -n "${older_snapshot_time}" ]] || {
  printf 'ERROR: the selected older snapshot or newest ledger snapshot is unavailable\n' >&2
  exit 1
}
[[ "${older_snapshot_id}" != "${newest_snapshot_id}" ]] || {
  printf 'ERROR: the database and erasure ledger must come from different snapshots\n' >&2
  exit 1
}

run_restic restore "${older_snapshot_id}" --target "${older_root}"
run_restic restore "${newest_snapshot_id}" --target "${ledger_root}"

mapfile -t dump_files < <(find "${older_root}" -type f -name 'gym_tracker-????????T??????Z.dump' | LC_ALL=C sort)
mapfile -t ledger_files < <(find "${ledger_root}" -type f -path '*/state/erasure-ledger/current.csv' | LC_ALL=C sort)
[[ "${#dump_files[@]}" -eq 1 && "${#ledger_files[@]}" -eq 1 ]] || {
  printf 'ERROR: expected one older dump and one separately restored newest ledger\n' >&2
  exit 1
}
dump_file="${dump_files[0]}"
ledger_file="${ledger_files[0]}"
[[ "$(head -n 1 "${ledger_file}")" == 'user_id,finalized_at,expires_at' ]] || {
  printf 'ERROR: newest erasure ledger header is invalid\n' >&2
  exit 1
}
ledger_rows="$(awk -F, 'NR > 1 && NF > 0 { count += 1 } END { print count + 0 }' "${ledger_file}")"
[[ "${ledger_rows}" -ge 1 ]] || {
  printf 'ERROR: newest erasure ledger has no IDs to verify\n' >&2
  exit 1
}
earliest_finalized="$(awk -F, 'NR > 1 { print $2 }' "${ledger_file}" | LC_ALL=C sort | head -n 1)"
older_snapshot_epoch="$(date -d "${older_snapshot_time}" +%s)"
earliest_finalized_epoch="$(date -d "${earliest_finalized}" +%s)"
[[ "${older_snapshot_epoch}" -lt "${earliest_finalized_epoch}" ]] || {
  printf 'ERROR: selected database snapshot does not predate the newest ledger erasure\n' >&2
  exit 1
}

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
wait_for_stable_postgres

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
  --exit-on-error --username=postgres --dbname=gym_tracker \
  /tmp/gym-tracker-restore.dump >/dev/null

live_migrations_hash="$(migration_ledger_hash "${production_container}")"
restored_migrations_hash="$(migration_ledger_hash "${container_name}")"
[[ "${live_migrations_hash}" == "${restored_migrations_hash}" ]] || {
  printf 'ERROR: older snapshot schema is behind production; apply reviewed migrations before replay\n' >&2
  exit 1
}

docker cp "${ledger_file}" "${container_name}:${container_audit_ledger}" >/dev/null
docker exec --user root "${container_name}" chown postgres:postgres "${container_audit_ledger}"
docker exec --user root "${container_name}" chmod 0600 "${container_audit_ledger}"
resurrected_before="$(docker exec -i "${container_name}" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d gym_tracker <<SQL
CREATE TEMP TABLE audit_erasure_ledger (user_id uuid PRIMARY KEY, finalized_at timestamptz NOT NULL, expires_at timestamptz NOT NULL);
COPY audit_erasure_ledger FROM '${container_audit_ledger}' WITH (FORMAT csv, HEADER true);
SELECT count(*) FROM users u JOIN audit_erasure_ledger l ON l.user_id = u.id;
SQL
)"
[[ "${resurrected_before}" -ge 1 ]] || {
  printf 'ERROR: selected older snapshot does not contain an erased ledger user\n' >&2
  exit 1
}

"${SCRIPT_DIR}/replay-erasure-ledger.sh" "${container_name}" "${ledger_file}" >/dev/null
"${SCRIPT_DIR}/replay-erasure-ledger.sh" "${container_name}" "${ledger_file}" >/dev/null
post_replay_counts="$(docker exec -i "${container_name}" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d gym_tracker <<SQL
CREATE TEMP TABLE audit_erasure_ledger (user_id uuid PRIMARY KEY, finalized_at timestamptz NOT NULL, expires_at timestamptz NOT NULL);
COPY audit_erasure_ledger FROM '${container_audit_ledger}' WITH (FORMAT csv, HEADER true);
SELECT count(*) FROM users u JOIN audit_erasure_ledger l ON l.user_id = u.id;
SELECT
  (SELECT count(*) FROM workout_sessions x JOIN audit_erasure_ledger l ON l.user_id = x.user_id) +
  (SELECT count(*) FROM workout_templates x JOIN audit_erasure_ledger l ON l.user_id = x.user_id) +
  (SELECT count(*) FROM message_deliveries x JOIN audit_erasure_ledger l ON l.user_id = x.user_id) +
  (SELECT count(*) FROM campaign_targets x JOIN audit_erasure_ledger l ON l.user_id = x.user_id) +
  (SELECT count(*) FROM app_events x JOIN audit_erasure_ledger l ON l.user_id = x.user_id) +
  (SELECT count(*) FROM auth_action_tokens x JOIN audit_erasure_ledger l ON l.user_id = x.user_id) +
  (SELECT count(*) FROM user_sessions x JOIN audit_erasure_ledger l ON l.user_id = x.user_id) +
  (SELECT count(*) FROM beta_access_requests x JOIN audit_erasure_ledger l ON l.user_id = x.joined_user_id) +
  (SELECT count(*) FROM account_deletion_tokens x JOIN audit_erasure_ledger l ON l.user_id = x.user_id) +
  (SELECT count(*) FROM exercises x JOIN audit_erasure_ledger l ON l.user_id = x.created_by_user_id) +
  (SELECT count(*) FROM admin_audit_events x JOIN audit_erasure_ledger l ON x.target_type = 'USER' AND x.target_id = l.user_id::text);
SELECT count(*) FROM erasure_tombstones x JOIN audit_erasure_ledger l ON l.user_id = x.user_id;
SQL
)"
remaining_users="$(sed -n '1p' <<< "${post_replay_counts}")"
remaining_references="$(sed -n '2p' <<< "${post_replay_counts}")"
matching_tombstones="$(sed -n '3p' <<< "${post_replay_counts}")"
[[ "${remaining_users}" -eq 0 && "${remaining_references}" -eq 0 && "${matching_tombstones}" -eq "${ledger_rows}" ]] || {
  printf 'ERROR: erased IDs or references remain after newest-ledger replay\n' >&2
  exit 1
}

finish_epoch="$(date +%s)"
duration="$((finish_epoch - start_epoch))"
install -d -o root -g gym-tracker -m 0750 "${BACKUP_ROOT}/reports"
umask 027
{
  printf 'TEST=erasure-replay-restore\n'
  printf 'RESULT=passed\n'
  printf 'TIMESTAMP=%s\n' "${timestamp}"
  printf 'OLDER_SNAPSHOT=%s\n' "${older_snapshot_id}"
  printf 'OLDER_SNAPSHOT_TIME=%s\n' "${older_snapshot_time}"
  printf 'NEWEST_LEDGER_SNAPSHOT=%s\n' "${newest_snapshot_id}"
  printf 'NEWEST_LEDGER_SNAPSHOT_TIME=%s\n' "${newest_snapshot_time}"
  printf 'DUMP_SHA256=%s\n' "$(sha256sum "${dump_file}" | awk '{print $1}')"
  printf 'ERASURE_LEDGER_SHA256=%s\n' "$(sha256sum "${ledger_file}" | awk '{print $1}')"
  printf 'ERASURE_LEDGER_ROWS=%s\n' "${ledger_rows}"
  printf 'RESURRECTED_USERS_BEFORE_REPLAY=%s\n' "${resurrected_before}"
  printf 'REMAINING_USERS_AFTER_REPLAY=%s\n' "${remaining_users}"
  printf 'REMAINING_REFERENCES_AFTER_REPLAY=%s\n' "${remaining_references}"
  printf 'MATCHING_TOMBSTONES_AFTER_REPLAY=%s\n' "${matching_tombstones}"
  printf 'MIGRATION_LEDGER_SHA256=%s\n' "${restored_migrations_hash}"
  printf 'IDEMPOTENT_SECOND_REPLAY=passed\n'
  printf 'NETWORK_MODE=internal\n'
  printf 'DURATION_SECONDS=%s\n' "${duration}"
} > "${report_file}"
chown root:gym-tracker "${report_file}"
chmod 0640 "${report_file}"
record_restore_success "${finish_epoch}"

printf '{"event":"gym_tracker_erasure_replay_restore_test_passed","duration_seconds":%s,"ledger_rows":%s,"resurrected_before":%s}\n' \
  "${duration}" "${ledger_rows}" "${resurrected_before}"
