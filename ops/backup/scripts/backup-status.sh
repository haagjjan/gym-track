#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
# shellcheck source=backup-common.sh
source "${SCRIPT_DIR}/backup-common.sh"

require_root
load_restic_environment

printf 'Backup metrics:\n'
cat "${BACKUP_METRICS_FILE}"
printf '\nBackup timers:\n'
systemctl list-timers gym-tracker-backup.timer gym-tracker-backup-maintenance.timer --all --no-pager
printf '\nLatest off-machine snapshots:\n'
run_restic snapshots --host gym-prod --tag gym-tracker --latest 5
