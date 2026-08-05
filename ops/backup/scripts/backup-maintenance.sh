#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
# shellcheck source=backup-common.sh
source "${SCRIPT_DIR}/backup-common.sh"

require_root
require_command flock
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
run_restic forget \
  --host gym-prod \
  --tag gym-tracker \
  --keep-daily 14 \
  --keep-weekly 8 \
  --keep-monthly 12 \
  --prune
run_restic check --read-data-subset=10%

completed=1
record_maintenance_result 1 "$(date +%s)"
trap - EXIT
printf '{"event":"gym_tracker_backup_maintenance_completed"}\n'
