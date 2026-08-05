#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
# shellcheck source=backup-common.sh
source "${SCRIPT_DIR}/backup-common.sh"

readonly COMPOSE_FILE="${GYM_TRACKER_ROOT}/deploy/compose/compose.yaml"
readonly DATABASE_NAME="gym_tracker"
readonly DATABASE_PASSWORD_FILE="${GYM_TRACKER_ROOT}/secrets/backup-database-password"
readonly CURRENT_DUMP_DIR="${BACKUP_ROOT}/postgres/current"
readonly MANIFEST_DIR="${BACKUP_ROOT}/postgres/manifests"
readonly DUMP_LOCK_FILE="/run/lock/gym-tracker-postgres-dump.lock"
readonly CONTAINER_PASSWORD_FILE="/tmp/gym-tracker-backup-password"

require_root
require_command docker
require_command flock
require_command sha256sum

exec 8>"${DUMP_LOCK_FILE}"
flock -n 8 || {
  printf 'ERROR: another PostgreSQL backup is running\n' >&2
  exit 1
}

install -d -o root -g gym-tracker -m 0750 "${CURRENT_DUMP_DIR}" "${MANIFEST_DIR}"
[[ -r "${DATABASE_PASSWORD_FILE}" ]] || {
  printf 'ERROR: backup database credential is unavailable\n' >&2
  exit 1
}

container_id="$(docker compose -p gym-tracker -f "${COMPOSE_FILE}" ps -q postgres)"
[[ -n "${container_id}" ]] || {
  printf 'ERROR: PostgreSQL container is unavailable\n' >&2
  exit 1
}
[[ "$(docker inspect -f '{{.State.Health.Status}}' "${container_id}")" == "healthy" ]] || {
  printf 'ERROR: PostgreSQL container is not healthy\n' >&2
  exit 1
}

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
base_name="gym_tracker-${timestamp}"
temporary_dump="${CURRENT_DUMP_DIR}/.${base_name}.dump.tmp"
final_dump="${CURRENT_DUMP_DIR}/${base_name}.dump"
temporary_manifest="${MANIFEST_DIR}/.${base_name}.manifest.tmp"
final_manifest="${MANIFEST_DIR}/${base_name}.manifest"

cleanup() {
  rm -f -- "${temporary_dump}" "${temporary_manifest}"
  docker exec "${container_id}" rm -f -- "${CONTAINER_PASSWORD_FILE}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker cp "${DATABASE_PASSWORD_FILE}" "${container_id}:${CONTAINER_PASSWORD_FILE}" >/dev/null
docker exec "${container_id}" chown postgres:postgres "${CONTAINER_PASSWORD_FILE}"
docker exec "${container_id}" chmod 0600 "${CONTAINER_PASSWORD_FILE}"

docker exec --user postgres "${container_id}" sh -eu -c '
  PGPASSWORD="$(cat "$1")"
  export PGPASSWORD
  exec pg_dump \
    --host=postgres \
    --username=gym_tracker_backup \
    --dbname=gym_tracker \
    --format=custom \
    --compress=6 \
    --no-password
' sh "${CONTAINER_PASSWORD_FILE}" > "${temporary_dump}"

docker exec --user postgres -i "${container_id}" pg_restore --list < "${temporary_dump}" >/dev/null

checksum="$(sha256sum "${temporary_dump}" | awk '{print $1}')"
byte_size="$(stat -c '%s' "${temporary_dump}")"
server_version="$(docker exec "${container_id}" psql -X -U postgres -d postgres -Atc 'SHOW server_version')"
tool_version="$(docker exec "${container_id}" pg_dump --version | tr -d '\r\n')"
deployed_commit="$(git -c safe.directory="${GYM_TRACKER_ROOT}/repo" \
  -C "${GYM_TRACKER_ROOT}/repo" rev-parse HEAD)"

chown root:gym-tracker "${temporary_dump}"
chmod 0640 "${temporary_dump}"
mv "${temporary_dump}" "${final_dump}"

umask 027
{
  printf 'timestamp=%s\n' "${timestamp}"
  printf 'database=%s\n' "${DATABASE_NAME}"
  printf 'server_version=%s\n' "${server_version}"
  printf 'dump_tool_version=%s\n' "${tool_version}"
  printf 'deployed_commit=%s\n' "${deployed_commit}"
  printf 'dump_filename=%s\n' "$(basename "${final_dump}")"
  printf 'byte_size=%s\n' "${byte_size}"
  printf 'sha256=%s\n' "${checksum}"
  printf 'script_exit_status=0\n'
} > "${temporary_manifest}"
chown root:gym-tracker "${temporary_manifest}"
chmod 0640 "${temporary_manifest}"
mv "${temporary_manifest}" "${final_manifest}"

trap - EXIT
docker exec "${container_id}" rm -f -- "${CONTAINER_PASSWORD_FILE}" >/dev/null

printf 'POSTGRES_DUMP=%s\n' "${final_dump}"
printf 'POSTGRES_MANIFEST=%s\n' "${final_manifest}"
