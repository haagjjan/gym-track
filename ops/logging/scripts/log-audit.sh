#!/usr/bin/env bash
set -euo pipefail

compose_file=/srv/gym-tracker/deploy/compose/compose.yaml
default_services=(postgres api web proxy prometheus grafana node-exporter cadvisor postgres-exporter alertmanager)
allowed='^(postgres|api|web|proxy|prometheus|grafana|node-exporter|cadvisor|postgres-exporter|alertmanager)$'
services=("$@")
work_dir="$(mktemp -d /tmp/gym-log-audit.XXXXXX)"
trap 'find "${work_dir}" -type f -delete; rmdir "${work_dir}"' EXIT

if (( ${#services[@]} == 0 )); then
  services=("${default_services[@]}")
fi

for service in "${services[@]}"; do
  if [[ ! "${service}" =~ ${allowed} ]]; then
    echo "Unsupported service: ${service}" >&2
    exit 64
  fi
done

exact_matches=0
pattern_files=0

for service in "${services[@]}"; do
  log_file="${work_dir}/${service}.log"
  sudo docker compose -p gym-tracker -f "${compose_file}" logs \
    --no-color --since 24h --tail 2000 "${service}" >"${log_file}" 2>&1 || true

  pattern_count="$(grep -Eic \
    'authorization["=: ]+bearer |bearer [A-Za-z0-9._-]{12,}|password["=: ]+[^<[:space:]]|database_url["=: ]|postgres(ql)?://[^[:space:]]+:[^[:space:]]+@|(\?|&)(token|code|reset_token|verification_token)=[^&"[:space:]]+' \
    "${log_file}" || true)"
  if (( pattern_count > 0 )); then
    pattern_files=$((pattern_files + 1))
  fi
  echo "${service}: suspicious_pattern_count=${pattern_count}"

  while IFS= read -r -d '' secret_file; do
    secret_value="$(sudo sh -c 'cat "$1"' sh "${secret_file}")"
    if (( ${#secret_value} >= 8 )) && grep -Fq -- "${secret_value}" "${log_file}"; then
      exact_matches=$((exact_matches + 1))
      echo "${service}: exact_secret_match=yes"
    fi
    unset secret_value
  done < <(sudo find /srv/gym-tracker/secrets -maxdepth 1 -type f -print0)
done

echo "summary: suspicious_service_logs=${pattern_files} exact_secret_matches=${exact_matches}"
if (( exact_matches > 0 )); then
  exit 20
fi

