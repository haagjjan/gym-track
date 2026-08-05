#!/usr/bin/env bash
set -euo pipefail

compose_file=/srv/gym-tracker/deploy/compose/compose.yaml
default_services=(api web proxy)
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
  --no-color --since 10m --tail 100 --follow "${services[@]}"

