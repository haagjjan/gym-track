#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
# shellcheck source=backup-common.sh
source "${SCRIPT_DIR}/backup-common.sh"

require_root
require_command date
require_command flock
require_command jq
require_command restic

exec 9>"${BACKUP_LOCK_FILE}"
flock -n 9 || {
  printf 'ERROR: another Gym Tracker backup or maintenance job is running\n' >&2
  exit 1
}

completed=0
finish() {
  if [[ "${completed}" -ne 1 ]]; then
    record_maintenance_result 0 0 || true
    printf '{"event":"gym_tracker_backup_maintenance_failed"}\n' >&2
  fi
}
trap finish EXIT

load_restic_environment
cutoff_epoch="$(( $(date -u +%s) - 30 * 24 * 60 * 60 ))"
snapshot_rows_tsv="$(run_restic snapshots --host gym-prod --tag gym-tracker --json \
  | jq -er 'if length == 0 then error("no Gym Tracker snapshots found") else .[] | [.id, .time] | @tsv end')"
mapfile -t snapshot_rows <<< "${snapshot_rows_tsv}"
expired_snapshots=()
for snapshot_row in "${snapshot_rows[@]}"; do
  snapshot_id="${snapshot_row%%$'\t'*}"
  snapshot_time="${snapshot_row#*$'\t'}"
  snapshot_epoch="$(date -u --date="${snapshot_time}" +%s)"
  if (( snapshot_epoch < cutoff_epoch )); then
    expired_snapshots+=("${snapshot_id}")
  fi
done
if [[ "${#expired_snapshots[@]}" -gt 0 ]]; then
  run_restic forget "${expired_snapshots[@]}" --prune
else
  run_restic prune
fi
run_restic check --read-data-subset=10%

completed=1
record_maintenance_result 1 "$(date +%s)"
trap - EXIT
printf '{"event":"gym_tracker_backup_maintenance_completed"}\n'
