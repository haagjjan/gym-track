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

exec 9>"${BACKUP_LOCK_FILE}"
flock -n 9 || {
  printf 'ERROR: another Gym Tracker backup or maintenance job is running\n' >&2
  exit 1
}

load_restic_environment
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
restore_root="${BACKUP_ROOT}/restore-tests/config-${timestamp}"
report_file="${BACKUP_ROOT}/reports/config-restore-${timestamp}.env"
start_epoch="$(date +%s)"

cleanup() {
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
restored_staging_parent="${restore_root}${BACKUP_ROOT}/staging"
mapfile -t staging_roots < <(
  find "${restored_staging_parent}" -mindepth 1 -maxdepth 1 \
    -type d -name 'gym-tracker-*' | LC_ALL=C sort
)
[[ "${#staging_roots[@]}" -eq 1 ]] || {
  printf 'ERROR: expected exactly one restored staging root\n' >&2
  exit 1
}
staging_root="${staging_roots[0]}"

required_paths=(
  "deploy/compose/compose.yaml"
  "deploy/config/caddy/Caddyfile"
  "deploy/monitoring/prometheus/prometheus.yml"
  "deploy/monitoring/prometheus/rules/alerts.yaml"
  "deploy/monitoring/alertmanager/alertmanager.yml"
  "deploy/monitoring/grafana/dashboards/service-overview.json"
  "deploy/recovery/disaster-recovery.md"
  "deploy/systemd/gym-tracker-backup.timer"
  "scripts/backup-restic.sh"
  "state/stage10-logging-alerting.env"
  "secrets/restic-password"
  "metadata/inventory.tsv"
  "postgres"
)
for relative_path in "${required_paths[@]}"; do
  [[ -e "${staging_root}/${relative_path}" ]] || {
    printf 'ERROR: restored configuration is incomplete: %s\n' "${relative_path}" >&2
    exit 1
  }
done

[[ "$(stat -c '%a' "${staging_root}/secrets")" == "700" ]] || {
  printf 'ERROR: restored secret-directory permissions are incorrect\n' >&2
  exit 1
}
while IFS= read -r script_file; do
  bash -n "${script_file}"
done < <(find "${staging_root}/scripts" -maxdepth 1 -type f -name '*.sh' | LC_ALL=C sort)

compose_dir="${staging_root}/deploy/compose"
docker compose -p gym-tracker-restore-check -f "${compose_dir}/compose.yaml" config --quiet

caddy_image="$(docker inspect -f '{{.Config.Image}}' gym-tracker-proxy-1)"
docker run --rm \
  --entrypoint /usr/bin/caddy \
  -v "${staging_root}/deploy/config/caddy/Caddyfile:/etc/caddy/Caddyfile:ro" \
  "${caddy_image}" validate --config /etc/caddy/Caddyfile >/dev/null

prometheus_image="$(docker inspect -f '{{.Config.Image}}' gym-tracker-prometheus-1)"
docker run --rm --entrypoint /bin/promtool \
  -v "${staging_root}/deploy/monitoring/prometheus:/etc/prometheus:ro" \
  "${prometheus_image}" check config /etc/prometheus/prometheus.yml >/dev/null

alertmanager_image="$(docker inspect -f '{{.Config.Image}}' gym-tracker-alertmanager-1)"
docker run --rm --entrypoint /bin/amtool \
  -v "${staging_root}/deploy/monitoring/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro" \
  "${alertmanager_image}" check-config /etc/alertmanager/alertmanager.yml >/dev/null

jq empty "${staging_root}/deploy/monitoring/grafana/dashboards/service-overview.json"
secret_file_count="$(find "${staging_root}/secrets" -maxdepth 1 -type f | wc -l | tr -d ' ')"
script_file_count="$(find "${staging_root}/scripts" -maxdepth 1 -type f | wc -l | tr -d ' ')"
finish_epoch="$(date +%s)"
duration="$((finish_epoch - start_epoch))"
install -d -o root -g gym-tracker -m 0750 "${BACKUP_ROOT}/reports"
umask 027
{
  printf 'TEST=config-restore\n'
  printf 'RESULT=passed\n'
  printf 'TIMESTAMP=%s\n' "${timestamp}"
  printf 'SNAPSHOT=%s\n' "${snapshot_id}"
  printf 'SECRET_FILE_COUNT=%s\n' "${secret_file_count}"
  printf 'SCRIPT_FILE_COUNT=%s\n' "${script_file_count}"
  printf 'COMPOSE_VALIDATION=passed\n'
  printf 'CADDY_VALIDATION=passed\n'
  printf 'PROMETHEUS_VALIDATION=passed\n'
  printf 'ALERTMANAGER_VALIDATION=passed\n'
  printf 'DASHBOARD_VALIDATION=passed\n'
  printf 'DURATION_SECONDS=%s\n' "${duration}"
} > "${report_file}"
chown root:gym-tracker "${report_file}"
chmod 0640 "${report_file}"

printf '{"event":"gym_tracker_config_restore_test_passed","duration_seconds":%s,"secret_files":%s}\n' \
  "${duration}" "${secret_file_count}"
