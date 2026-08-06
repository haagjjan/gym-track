#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
# shellcheck source=backup-common.sh
source "${SCRIPT_DIR}/backup-common.sh"

require_root
require_command flock
require_command restic
require_command docker

exec 9>"${BACKUP_LOCK_FILE}"
flock -n 9 || {
  printf 'ERROR: another Gym Tracker backup or maintenance job is running\n' >&2
  exit 1
}

start_epoch="$(date +%s)"
staging_directory=""
completed=0

finish() {
  local exit_code=$?
  local finish_epoch
  local duration
  finish_epoch="$(date +%s)"
  duration="$((finish_epoch - start_epoch))"

  if [[ -n "${staging_directory}" ]]; then
    remove_controlled_staging_tree "${staging_directory}" || true
  fi
  if [[ "${completed}" -ne 1 ]]; then
    record_backup_failure "${duration}" || true
    printf '{"event":"gym_tracker_backup_failed","duration_seconds":%s,"exit_code":%s}\n' \
      "${duration}" "${exit_code}" >&2
  fi
}
trap finish EXIT

if [[ "${1:-}" == "--simulate-failure" ]]; then
  printf 'ERROR: controlled Stage 11 backup failure simulation\n' >&2
  exit 42
fi
if [[ "$#" -ne 0 ]]; then
  printf 'ERROR: unsupported backup argument\n' >&2
  exit 2
fi

dump_result="$("${SCRIPT_DIR}/backup-postgres.sh")"
dump_file="$(awk -F= '$1 == "POSTGRES_DUMP" {print $2}' <<< "${dump_result}")"
manifest_file="$(awk -F= '$1 == "POSTGRES_MANIFEST" {print $2}' <<< "${dump_result}")"
[[ -n "${dump_file}" && -n "${manifest_file}" ]] || {
  printf 'ERROR: PostgreSQL backup did not return validated paths\n' >&2
  exit 1
}
"${SCRIPT_DIR}/export-erasure-ledger.sh" >/dev/null

staging_directory="$(mktemp -d "${BACKUP_ROOT}/staging/gym-tracker-XXXXXXXX")"
rmdir "${staging_directory}"
"${SCRIPT_DIR}/stage-backup-files.sh" "${dump_file}" "${manifest_file}" "${staging_directory}" >/dev/null

load_restic_environment
backup_output="$(run_restic backup \
  --host gym-prod \
  --tag gym-prod \
  --tag gym-tracker \
  --tag scheduled \
  "${staging_directory}")"
printf '%s\n' "${backup_output}"
snapshot_id="$(sed -nE 's/^snapshot ([0-9a-f]+) saved$/\1/p' <<< "${backup_output}" | tail -n 1)"
[[ -n "${snapshot_id}" ]] || {
  printf 'ERROR: Restic did not report a snapshot ID\n' >&2
  exit 1
}

run_restic check
run_restic snapshots --host gym-prod --tag gym-tracker --latest 1 >/dev/null

finish_epoch="$(date +%s)"
duration="$((finish_epoch - start_epoch))"
dump_size="$(stat -c '%s' "${dump_file}")"
record_backup_success "${finish_epoch}" "${duration}" "${dump_size}"

find "${BACKUP_ROOT}/postgres/current" -maxdepth 1 -type f \
  -name 'gym_tracker-????????T??????Z.dump' -mmin +10080 -delete
find "${BACKUP_ROOT}/postgres/manifests" -maxdepth 1 -type f \
  -name 'gym_tracker-????????T??????Z.manifest' -mmin +10080 -delete

remove_controlled_staging_tree "${staging_directory}"
staging_directory=""
completed=1
trap - EXIT
printf '{"event":"gym_tracker_backup_completed","duration_seconds":%s,"dump_size_bytes":%s,"snapshot":"%s"}\n' \
  "${duration}" "${dump_size}" "${snapshot_id:0:12}"
