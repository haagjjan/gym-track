#!/usr/bin/env bash

set -euo pipefail

readonly ROOT="/srv/gym-tracker"
readonly PENDING_FILE="${ROOT}/state/stage11-post-reboot-pending"
readonly RESULT_FILE="${ROOT}/state/stage11-post-reboot-result.env"
readonly COMPOSE_FILE="${ROOT}/deploy/compose/compose.yaml"

[[ -f "${PENDING_FILE}" ]] || exit 0

result="failed"
finish() {
  local exit_code=$?
  umask 027
  {
    printf 'RESULT=%s\n' "${result}"
    printf 'CHECKED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'BOOT_ID=%s\n' "$(cat /proc/sys/kernel/random/boot_id)"
    printf 'EXIT_CODE=%s\n' "${exit_code}"
  } > "${RESULT_FILE}.tmp"
  chown root:gym-tracker "${RESULT_FILE}.tmp"
  chmod 0640 "${RESULT_FILE}.tmp"
  mv -f "${RESULT_FILE}.tmp" "${RESULT_FILE}"
  rm -f -- "${PENDING_FILE}"
}
trap finish EXIT

systemctl is-enabled --quiet gym-tracker-backup.timer
systemctl is-active --quiet gym-tracker-backup.timer
systemctl is-enabled --quiet gym-tracker-backup-maintenance.timer
systemctl is-active --quiet gym-tracker-backup-maintenance.timer

docker compose -p gym-tracker -f "${COMPOSE_FILE}" ps --status running --services \
  | grep -Fxq postgres
grep -Eq '^gym_backup_last_run_success 1$' "${ROOT}/data/node-exporter-textfile/gym_backup.prom"

prometheus_container="$(docker compose -p gym-tracker -f "${COMPOSE_FILE}" ps -q prometheus)"
docker exec "${prometheus_container}" wget -qO- \
  'http://127.0.0.1:9090/api/v1/query?query=gym_backup_last_run_success' \
  | grep -q '"value":\['

result="passed"
