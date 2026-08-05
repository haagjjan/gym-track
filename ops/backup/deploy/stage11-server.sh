#!/usr/bin/env bash

set -euo pipefail

CANDIDATE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly CANDIDATE_ROOT
readonly PAYLOAD_ROOT="${CANDIDATE_ROOT}/payload"
readonly ROOT="/srv/gym-tracker"
readonly COMPOSE_FILE="${ROOT}/deploy/compose/compose.yaml"
readonly SFTP_PRIVATE_KEY_SOURCE="${CANDIDATE_ROOT}/gym-backup-sftp-key"
readonly MAC_HOST_KEY_SOURCE="${CANDIDATE_ROOT}/macbook-ssh-host-key.pub"
readonly RESTIC_PASSWORD_PATH="${ROOT}/secrets/restic-password"
readonly RESTIC_ENVIRONMENT_PATH="${ROOT}/secrets/restic-environment"
readonly RESTIC_SSH_CONFIG_PATH="${ROOT}/secrets/restic-ssh-config"
readonly RESTIC_KNOWN_HOSTS_PATH="${ROOT}/secrets/restic-known-hosts"
readonly BACKUP_DATABASE_PASSWORD_FILE="${ROOT}/secrets/backup-database-password"
readonly STAGE_STATE_FILE="${ROOT}/state/stage11-backup-recovery.env"

if [[ "${EUID}" -ne 0 ]]; then
  printf 'ERROR: run this helper with sudo\n' >&2
  exit 1
fi

require_file() {
  [[ -f "$1" ]] || {
    printf 'ERROR: required candidate file is missing: %s\n' "$1" >&2
    exit 1
  }
}

compose() {
  docker compose -p gym-tracker -f "${COMPOSE_FILE}" "$@"
}

prometheus_query() {
  local query="$1"
  local prometheus_container
  prometheus_container="$(compose ps -q prometheus)"
  docker exec "${prometheus_container}" wget -qO- \
    --post-data="query=${query}" \
    http://127.0.0.1:9090/api/v1/query
}

wait_for_alert_state() {
  local alert_name="$1"
  local wanted_state="$2"
  local timeout_seconds="$3"
  local deadline=$((SECONDS + timeout_seconds))
  local result_count

  while (( SECONDS < deadline )); do
    result_count="$(prometheus_query "ALERTS{alertname=\"${alert_name}\",alertstate=\"firing\"}" | jq '.data.result | length')"
    if [[ "${wanted_state}" == "firing" && "${result_count}" -gt 0 ]]; then
      return 0
    fi
    if [[ "${wanted_state}" == "resolved" && "${result_count}" -eq 0 ]]; then
      return 0
    fi
    sleep 10
  done
  printf 'ERROR: alert %s did not reach %s state\n' "${alert_name}" "${wanted_state}" >&2
  return 1
}

table_counts_hash() {
  local container_id="$1"
  docker exec -i "${container_id}" psql -X -qAt -U postgres -d gym_tracker <<'SQL' | sha256sum | awk '{print $1}'
SELECT format('SELECT %L || E''\t'' || count(*)::text FROM %I.%I;', schemaname || '.' || tablename, schemaname, tablename)
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename
\gexec
SQL
}

install_payload() {
  local rollback_directory
  rollback_directory="${ROOT}/releases/stage11-$(date -u +%Y%m%dT%H%M%SZ)"
  install -d -o root -g gym-tracker -m 0750 "${rollback_directory}"
  cp -a "${ROOT}/deploy/monitoring/prometheus/rules/alerts.yaml" "${rollback_directory}/alerts.yaml"
  cp -a "${ROOT}/deploy/monitoring/grafana/dashboards/service-overview.json" "${rollback_directory}/service-overview.json"

  install -d -o root -g gym-tracker -m 0750 \
    "${ROOT}/deploy/recovery" \
    "${ROOT}/deploy/systemd" \
    "${ROOT}/backups/postgres/current" \
    "${ROOT}/backups/postgres/manifests" \
    "${ROOT}/backups/staging" \
    "${ROOT}/backups/restore-tests" \
    "${ROOT}/backups/reports" \
    "${ROOT}/backups/cache"

  for script_path in "${PAYLOAD_ROOT}"/ops/backup/scripts/*.sh; do
    install -o root -g gym-tracker -m 0750 "${script_path}" "${ROOT}/scripts/$(basename "${script_path}")"
  done
  for unit_path in "${PAYLOAD_ROOT}"/ops/backup/systemd/*; do
    install -o root -g root -m 0644 "${unit_path}" "${ROOT}/deploy/systemd/$(basename "${unit_path}")"
    install -o root -g root -m 0644 "${unit_path}" "/etc/systemd/system/$(basename "${unit_path}")"
  done
  for document_path in \
    "${PAYLOAD_ROOT}/docs/server/disaster-recovery.md" \
    "${PAYLOAD_ROOT}/docs/server/restore-postgresql.md" \
    "${PAYLOAD_ROOT}/docs/server/restore-full-service.md"; do
    install -o root -g gym-tracker -m 0640 "${document_path}" "${ROOT}/deploy/recovery/$(basename "${document_path}")"
  done

  install -o root -g nogroup -m 0640 \
    "${PAYLOAD_ROOT}/ops/monitoring/prometheus/rules/alerts.yaml" \
    "${ROOT}/deploy/monitoring/prometheus/rules/alerts.yaml"
  install -o root -g root -m 0644 \
    "${PAYLOAD_ROOT}/ops/monitoring/grafana/dashboards/service-overview.json" \
    "${ROOT}/deploy/monitoring/grafana/dashboards/service-overview.json"

  printf 'ROLLBACK_DIRECTORY=%s\n' "${rollback_directory}"
}

configure_secrets() {
  install -d -o admin-gym -g gym-tracker -m 0700 "${ROOT}/secrets"
  if [[ ! -f "${RESTIC_PASSWORD_PATH}" ]]; then
    umask 077
    openssl rand -base64 64 > "${RESTIC_PASSWORD_PATH}"
  fi
  chown admin-gym:gym-tracker "${RESTIC_PASSWORD_PATH}"
  chmod 0600 "${RESTIC_PASSWORD_PATH}"

  if [[ ! -f "${BACKUP_DATABASE_PASSWORD_FILE}" ]]; then
    umask 077
    openssl rand -base64 48 > "${BACKUP_DATABASE_PASSWORD_FILE}"
  fi
  chown root:root "${BACKUP_DATABASE_PASSWORD_FILE}"
  chmod 0600 "${BACKUP_DATABASE_PASSWORD_FILE}"

  install -o root -g root -m 0600 "${SFTP_PRIVATE_KEY_SOURCE}" "${ROOT}/secrets/restic-sftp-key"
  read -r host_key_type host_key_value _ < "${MAC_HOST_KEY_SOURCE}"
  [[ "${host_key_type}" == "ssh-ed25519" && -n "${host_key_value}" ]] || {
    printf 'ERROR: invalid MacBook SSH host key\n' >&2
    exit 1
  }
  printf 'MacBook-Jan.local %s %s\n' "${host_key_type}" "${host_key_value}" > "${RESTIC_KNOWN_HOSTS_PATH}"
  chown root:root "${RESTIC_KNOWN_HOSTS_PATH}"
  chmod 0600 "${RESTIC_KNOWN_HOSTS_PATH}"

  cat > "${RESTIC_SSH_CONFIG_PATH}" <<EOF
Host gym-backup-destination
    HostName MacBook-Jan.local
    User gym-backup
    IdentityFile ${ROOT}/secrets/restic-sftp-key
    IdentitiesOnly yes
    BatchMode yes
    StrictHostKeyChecking yes
    UserKnownHostsFile ${RESTIC_KNOWN_HOSTS_PATH}
    ServerAliveInterval 60
    ServerAliveCountMax 5
EOF
  chown root:root "${RESTIC_SSH_CONFIG_PATH}"
  chmod 0600 "${RESTIC_SSH_CONFIG_PATH}"

  cat > "${RESTIC_ENVIRONMENT_PATH}" <<EOF
RESTIC_REPOSITORY='sftp:gym-backup-destination:gym-tracker'
RESTIC_PASSWORD_FILE='${RESTIC_PASSWORD_PATH}'
RESTIC_CACHE_DIR='${ROOT}/backups/cache'
EOF
  chown root:root "${RESTIC_ENVIRONMENT_PATH}"
  chmod 0600 "${RESTIC_ENVIRONMENT_PATH}"
}

configure_backup_role() {
  local postgres_container
  local backup_password
  postgres_container="$(compose ps -q postgres)"
  backup_password="$(< "${BACKUP_DATABASE_PASSWORD_FILE}")"
  docker exec -i "${postgres_container}" psql \
    -X -v ON_ERROR_STOP=1 -v backup_password="${backup_password}" \
    -U postgres -d postgres >/dev/null <<'SQL'
SELECT format(
  'CREATE ROLE gym_tracker_backup LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION',
  :'backup_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gym_tracker_backup')
\gexec
ALTER ROLE gym_tracker_backup LOGIN PASSWORD :'backup_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
GRANT CONNECT ON DATABASE gym_tracker TO gym_tracker_backup;
\connect gym_tracker
GRANT USAGE ON SCHEMA public TO gym_tracker_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO gym_tracker_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO gym_tracker_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE gym_tracker_owner IN SCHEMA public GRANT SELECT ON TABLES TO gym_tracker_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE gym_tracker_owner IN SCHEMA public GRANT SELECT ON SEQUENCES TO gym_tracker_backup;
SQL
  unset backup_password
}

initialize_repository() {
  # shellcheck source=/dev/null
  source "${ROOT}/scripts/backup-common.sh"
  load_restic_environment
  if run_restic snapshots >/dev/null 2>&1; then
    printf 'RESTIC_REPOSITORY=existing\n'
  else
    run_restic init
    printf 'RESTIC_REPOSITORY=initialized\n'
  fi
  run_restic check
}

validate_monitoring() {
  local prometheus_container
  local alert_rule_count
  local backup_metric_count
  local deadline
  local rules_json
  prometheus_container="$(compose ps -q prometheus)"
  docker exec "${prometheus_container}" promtool check config /etc/prometheus/prometheus.yml >/dev/null
  compose restart prometheus grafana
  deadline=$((SECONDS + 120))
  alert_rule_count=0
  backup_metric_count=0
  while (( SECONDS < deadline )); do
    prometheus_container="$(compose ps -q prometheus)"
    if [[ -n "${prometheus_container}" ]] \
      && rules_json="$(docker exec "${prometheus_container}" wget -qO- \
        http://127.0.0.1:9090/api/v1/rules 2>/dev/null)"; then
      alert_rule_count="$(jq '[.data.groups[].rules[] | select(.type == "alerting")] | length' <<< "${rules_json}")"
      backup_metric_count="$(prometheus_query 'gym_backup_last_run_success' | jq '.data.result | length')"
      if [[ "${alert_rule_count}" -eq 27 && "${backup_metric_count}" -eq 1 ]]; then
        printf 'PROMETHEUS_ALERT_RULES=%s\n' "${alert_rule_count}"
        return 0
      fi
    fi
    sleep 5
  done
  printf 'ERROR: monitoring verification timed out (alert_rules=%s backup_metrics=%s)\n' \
    "${alert_rule_count}" "${backup_metric_count}" >&2
  exit 1
}

run_failure_test() {
  if systemd-run --quiet --wait --collect \
    --unit=gym-tracker-backup-failure-test \
    /srv/gym-tracker/scripts/backup-restic.sh --simulate-failure; then
    printf 'ERROR: controlled backup failure unexpectedly succeeded\n' >&2
    exit 1
  fi
  wait_for_alert_state GymTrackerBackupLastRunFailed firing 300
  read -r -p 'Did the backup-failure FIRING alert arrive in Telegram? [y/N] ' answer
  [[ "${answer}" =~ ^[Yy]$ ]] || {
    printf 'ERROR: backup-failure delivery was not confirmed\n' >&2
    exit 1
  }

  systemctl start gym-tracker-backup.service
  wait_for_alert_state GymTrackerBackupLastRunFailed resolved 300
  sleep 70
  read -r -p 'Did the backup-failure RESOLVED alert arrive in Telegram? [y/N] ' answer
  [[ "${answer}" =~ ^[Yy]$ ]] || {
    printf 'ERROR: backup-failure resolution was not confirmed\n' >&2
    exit 1
  }
  printf 'BACKUP_FAILURE_ALERT_TEST=passed\n'
}

apply_stage11() {
  require_file "${SFTP_PRIVATE_KEY_SOURCE}"
  require_file "${MAC_HOST_KEY_SOURCE}"
  require_file "${PAYLOAD_ROOT}/ops/backup/scripts/backup-restic.sh"
  require_file "${PAYLOAD_ROOT}/ops/monitoring/prometheus/rules/alerts.yaml"
  command -v restic >/dev/null
  command -v jq >/dev/null

  local postgres_container
  local before_counts_hash
  local after_counts_hash
  postgres_container="$(compose ps -q postgres)"
  before_counts_hash="$(table_counts_hash "${postgres_container}")"

  install_payload
  configure_secrets
  configure_backup_role
  systemd-analyze verify \
    /etc/systemd/system/gym-tracker-backup.service \
    /etc/systemd/system/gym-tracker-backup.timer \
    /etc/systemd/system/gym-tracker-backup-maintenance.service \
    /etc/systemd/system/gym-tracker-backup-maintenance.timer \
    /etc/systemd/system/gym-tracker-stage11-post-reboot.service
  systemctl daemon-reload

  initialize_repository
  systemctl start gym-tracker-backup.service
  "${ROOT}/scripts/restore-test-postgres.sh"
  "${ROOT}/scripts/restore-test-config.sh"
  systemctl start gym-tracker-backup-maintenance.service
  validate_monitoring
  run_failure_test

  systemctl enable --now gym-tracker-backup.timer gym-tracker-backup-maintenance.timer
  systemctl enable gym-tracker-stage11-post-reboot.service
  after_counts_hash="$(table_counts_hash "${postgres_container}")"
  [[ "${before_counts_hash}" == "${after_counts_hash}" ]] || {
    printf 'ERROR: production table counts changed during Stage 11\n' >&2
    exit 1
  }

  umask 027
  {
    printf 'STAGE11_APPLIED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'RPO_HOURS=24\n'
    printf 'RTO_HOURS=4\n'
    printf 'BACKUP_DESTINATION=macbook-restricted-sftp\n'
    printf 'RESTIC_VERSION=%s\n' "$(restic version | awk '{print $2}')"
    printf 'ALERT_RULE_COUNT=27\n'
    printf 'PRODUCTION_COUNTS_SHA256=%s\n' "${after_counts_hash}"
    printf 'POSTGRES_RESTORE_TEST=passed\n'
    printf 'CONFIG_RESTORE_TEST=passed\n'
    printf 'FAILURE_ALERT_TEST=passed\n'
  } > "${STAGE_STATE_FILE}.tmp"
  chown root:gym-tracker "${STAGE_STATE_FILE}.tmp"
  chmod 0640 "${STAGE_STATE_FILE}.tmp"
  mv -f "${STAGE_STATE_FILE}.tmp" "${STAGE_STATE_FILE}"

  printf 'STAGE11_APPLY=passed\n'
  read -r -p 'Reboot gym-prod now for the final Stage 11 verification? [y/N] ' answer
  if [[ "${answer}" =~ ^[Yy]$ ]]; then
    touch "${ROOT}/state/stage11-post-reboot-pending"
    chown root:gym-tracker "${ROOT}/state/stage11-post-reboot-pending"
    chmod 0640 "${ROOT}/state/stage11-post-reboot-pending"
    systemctl reboot
  fi
}

reboot_for_verification() {
  systemctl enable gym-tracker-stage11-post-reboot.service
  touch "${ROOT}/state/stage11-post-reboot-pending"
  chown root:gym-tracker "${ROOT}/state/stage11-post-reboot-pending"
  chmod 0640 "${ROOT}/state/stage11-post-reboot-pending"
  systemctl reboot
}

finalize_restore_evidence() {
  local script_name
  for script_name in restore-test-postgres.sh restore-test-config.sh; do
    require_file "${PAYLOAD_ROOT}/ops/backup/scripts/${script_name}"
    install -o root -g gym-tracker -m 0750 \
      "${PAYLOAD_ROOT}/ops/backup/scripts/${script_name}" \
      "${ROOT}/scripts/${script_name}"
  done
  "${ROOT}/scripts/restore-test-postgres.sh"
  "${ROOT}/scripts/restore-test-config.sh"
  printf 'STAGE11_RESTORE_EVIDENCE=finalized\n'
}

case "${1:-}" in
  apply) apply_stage11 ;;
  reboot) reboot_for_verification ;;
  finalize) finalize_restore_evidence ;;
  *)
    printf 'Usage: sudo %s {apply|reboot|finalize}\n' "$0" >&2
    exit 2
    ;;
esac
