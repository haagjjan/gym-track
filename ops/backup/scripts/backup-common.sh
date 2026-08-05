#!/usr/bin/env bash

set -euo pipefail

readonly GYM_TRACKER_ROOT="/srv/gym-tracker"
readonly BACKUP_ROOT="${GYM_TRACKER_ROOT}/backups"
readonly BACKUP_STATE_FILE="${GYM_TRACKER_ROOT}/state/backup-metrics.env"
readonly BACKUP_METRICS_DIR="${GYM_TRACKER_ROOT}/data/node-exporter-textfile"
readonly BACKUP_METRICS_FILE="${BACKUP_METRICS_DIR}/gym_backup.prom"
readonly RESTIC_ENVIRONMENT_FILE="${GYM_TRACKER_ROOT}/secrets/restic-environment"
readonly RESTIC_SSH_CONFIG_FILE="${GYM_TRACKER_ROOT}/secrets/restic-ssh-config"
# Used by the scripts that source this shared file.
# shellcheck disable=SC2034
readonly BACKUP_LOCK_FILE="/run/lock/gym-tracker-backup.lock"

LAST_RUN_SUCCESS=0
LAST_SUCCESS_TIMESTAMP=0
LAST_DURATION_SECONDS=0
LAST_DUMP_SIZE_BYTES=0
SNAPSHOT_AVAILABLE=0
LAST_MAINTENANCE_SUCCESS=0
LAST_MAINTENANCE_TIMESTAMP=0
LAST_RESTORE_TEST_SUCCESS_TIMESTAMP=0

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    printf 'ERROR: this command must run as root\n' >&2
    exit 1
  fi
}

require_command() {
  local command_name="$1"
  command -v "${command_name}" >/dev/null 2>&1 || {
    printf 'ERROR: required command is missing: %s\n' "${command_name}" >&2
    exit 1
  }
}

require_numeric() {
  local value="$1"
  local name="$2"
  [[ "${value}" =~ ^[0-9]+([.][0-9]+)?$ ]] || {
    printf 'ERROR: invalid numeric backup state for %s\n' "${name}" >&2
    exit 1
  }
}

load_backup_state() {
  if [[ -f "${BACKUP_STATE_FILE}" ]]; then
    # The file is root-owned, generated below, and contains numeric values only.
    # shellcheck disable=SC1090
    source "${BACKUP_STATE_FILE}"
  fi

  require_numeric "${LAST_RUN_SUCCESS}" "LAST_RUN_SUCCESS"
  require_numeric "${LAST_SUCCESS_TIMESTAMP}" "LAST_SUCCESS_TIMESTAMP"
  require_numeric "${LAST_DURATION_SECONDS}" "LAST_DURATION_SECONDS"
  require_numeric "${LAST_DUMP_SIZE_BYTES}" "LAST_DUMP_SIZE_BYTES"
  require_numeric "${SNAPSHOT_AVAILABLE}" "SNAPSHOT_AVAILABLE"
  require_numeric "${LAST_MAINTENANCE_SUCCESS}" "LAST_MAINTENANCE_SUCCESS"
  require_numeric "${LAST_MAINTENANCE_TIMESTAMP}" "LAST_MAINTENANCE_TIMESTAMP"
  require_numeric "${LAST_RESTORE_TEST_SUCCESS_TIMESTAMP}" "LAST_RESTORE_TEST_SUCCESS_TIMESTAMP"
}

write_backup_state() {
  local temporary_file="${BACKUP_STATE_FILE}.tmp.$$"
  umask 077
  {
    printf 'LAST_RUN_SUCCESS=%s\n' "${LAST_RUN_SUCCESS}"
    printf 'LAST_SUCCESS_TIMESTAMP=%s\n' "${LAST_SUCCESS_TIMESTAMP}"
    printf 'LAST_DURATION_SECONDS=%s\n' "${LAST_DURATION_SECONDS}"
    printf 'LAST_DUMP_SIZE_BYTES=%s\n' "${LAST_DUMP_SIZE_BYTES}"
    printf 'SNAPSHOT_AVAILABLE=%s\n' "${SNAPSHOT_AVAILABLE}"
    printf 'LAST_MAINTENANCE_SUCCESS=%s\n' "${LAST_MAINTENANCE_SUCCESS}"
    printf 'LAST_MAINTENANCE_TIMESTAMP=%s\n' "${LAST_MAINTENANCE_TIMESTAMP}"
    printf 'LAST_RESTORE_TEST_SUCCESS_TIMESTAMP=%s\n' "${LAST_RESTORE_TEST_SUCCESS_TIMESTAMP}"
  } > "${temporary_file}"
  chown root:gym-tracker "${temporary_file}"
  chmod 0640 "${temporary_file}"
  mv -f "${temporary_file}" "${BACKUP_STATE_FILE}"
}

write_backup_metrics() {
  local temporary_file="${BACKUP_METRICS_FILE}.tmp.$$"
  umask 077
  {
    printf '# HELP gym_backup_last_run_success Whether the latest required backup run succeeded.\n'
    printf '# TYPE gym_backup_last_run_success gauge\n'
    printf 'gym_backup_last_run_success %s\n' "${LAST_RUN_SUCCESS}"
    printf '# HELP gym_backup_last_success_timestamp_seconds Unix timestamp of the latest successful off-machine backup.\n'
    printf '# TYPE gym_backup_last_success_timestamp_seconds gauge\n'
    printf 'gym_backup_last_success_timestamp_seconds %s\n' "${LAST_SUCCESS_TIMESTAMP}"
    printf '# HELP gym_backup_last_duration_seconds Duration of the latest completed backup attempt.\n'
    printf '# TYPE gym_backup_last_duration_seconds gauge\n'
    printf 'gym_backup_last_duration_seconds %s\n' "${LAST_DURATION_SECONDS}"
    printf '# HELP gym_backup_last_dump_size_bytes Size of the latest successful PostgreSQL logical dump.\n'
    printf '# TYPE gym_backup_last_dump_size_bytes gauge\n'
    printf 'gym_backup_last_dump_size_bytes %s\n' "${LAST_DUMP_SIZE_BYTES}"
    printf '# HELP gym_backup_last_snapshot_info Whether at least one verified Restic snapshot exists.\n'
    printf '# TYPE gym_backup_last_snapshot_info gauge\n'
    printf 'gym_backup_last_snapshot_info{host="gym-prod",backup_type="restic"} %s\n' "${SNAPSHOT_AVAILABLE}"
    printf '# HELP gym_backup_maintenance_last_run_success Whether the latest repository maintenance succeeded.\n'
    printf '# TYPE gym_backup_maintenance_last_run_success gauge\n'
    printf 'gym_backup_maintenance_last_run_success %s\n' "${LAST_MAINTENANCE_SUCCESS}"
    printf '# HELP gym_backup_maintenance_last_success_timestamp_seconds Unix timestamp of the latest successful repository maintenance.\n'
    printf '# TYPE gym_backup_maintenance_last_success_timestamp_seconds gauge\n'
    printf 'gym_backup_maintenance_last_success_timestamp_seconds %s\n' "${LAST_MAINTENANCE_TIMESTAMP}"
    printf '# HELP gym_backup_restore_test_last_success_timestamp_seconds Unix timestamp of the latest successful isolated restore test.\n'
    printf '# TYPE gym_backup_restore_test_last_success_timestamp_seconds gauge\n'
    printf 'gym_backup_restore_test_last_success_timestamp_seconds %s\n' "${LAST_RESTORE_TEST_SUCCESS_TIMESTAMP}"
  } > "${temporary_file}"
  chown root:nogroup "${temporary_file}"
  chmod 0640 "${temporary_file}"
  mv -f "${temporary_file}" "${BACKUP_METRICS_FILE}"
}

record_backup_success() {
  load_backup_state
  LAST_RUN_SUCCESS=1
  LAST_SUCCESS_TIMESTAMP="$1"
  LAST_DURATION_SECONDS="$2"
  LAST_DUMP_SIZE_BYTES="$3"
  SNAPSHOT_AVAILABLE=1
  write_backup_state
  write_backup_metrics
}

record_backup_failure() {
  load_backup_state
  LAST_RUN_SUCCESS=0
  LAST_DURATION_SECONDS="$1"
  write_backup_state
  write_backup_metrics
}

record_maintenance_result() {
  load_backup_state
  LAST_MAINTENANCE_SUCCESS="$1"
  if [[ "$1" == "1" ]]; then
    LAST_MAINTENANCE_TIMESTAMP="$2"
  fi
  write_backup_state
  write_backup_metrics
}

record_restore_success() {
  load_backup_state
  LAST_RESTORE_TEST_SUCCESS_TIMESTAMP="$1"
  write_backup_state
  write_backup_metrics
}

load_restic_environment() {
  [[ -r "${RESTIC_ENVIRONMENT_FILE}" ]] || {
    printf 'ERROR: Restic environment file is unavailable\n' >&2
    exit 1
  }
  set -a
  # This protected file contains only reviewed Restic variables.
  # shellcheck disable=SC1090
  source "${RESTIC_ENVIRONMENT_FILE}"
  set +a
  : "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is required}"
  : "${RESTIC_PASSWORD_FILE:?RESTIC_PASSWORD_FILE is required}"
  [[ -r "${RESTIC_PASSWORD_FILE}" ]] || {
    printf 'ERROR: Restic password file is unavailable\n' >&2
    exit 1
  }
  [[ -r "${RESTIC_SSH_CONFIG_FILE}" ]] || {
    printf 'ERROR: Restic SSH configuration is unavailable\n' >&2
    exit 1
  }
}

run_restic() {
  /usr/bin/restic -o "sftp.args=-F ${RESTIC_SSH_CONFIG_FILE}" "$@"
}

remove_controlled_staging_tree() {
  local staging_tree="$1"
  case "${staging_tree}" in
    "${BACKUP_ROOT}/staging/gym-tracker-"*) ;;
    *)
      printf 'ERROR: refused to remove unexpected staging path\n' >&2
      return 1
      ;;
  esac
  [[ -d "${staging_tree}" && ! -L "${staging_tree}" ]] || return 0
  find "${staging_tree}" -mindepth 1 -delete
  rmdir "${staging_tree}"
}
