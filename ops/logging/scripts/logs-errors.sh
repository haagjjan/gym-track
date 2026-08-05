#!/usr/bin/env bash
set -euo pipefail

compose_file=/srv/gym-tracker/deploy/compose/compose.yaml
default_services=(postgres api web proxy prometheus grafana node-exporter cadvisor postgres-exporter alertmanager)
allowed='^(postgres|api|web|proxy|prometheus|grafana|node-exporter|cadvisor|postgres-exporter|alertmanager)$'
services=("$@")

if (( ${#services[@]} == 0 )); then
  services=("${default_services[@]}")
fi

for service in "${services[@]}"; do
  if [[ ! "${service}" =~ ${allowed} ]]; then
    echo "Unsupported service: ${service}" >&2
    exit 64
  fi
done

sudo docker compose -p gym-tracker -f "${compose_file}" logs \
  --no-color --since 2h --tail 1000 "${services[@]}" |
  grep -Ei '(^|[[:space:]"=])(fatal|panic|error|critical|unhealthy|request_failed|bff_proxy_error)([[:space:]"=:]|$)' ||
  true

