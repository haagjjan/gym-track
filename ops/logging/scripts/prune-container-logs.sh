#!/usr/bin/env bash

set -euo pipefail

readonly project_label="com.docker.compose.project=gym-tracker"
dry_run=false

if [[ "${1:-}" == "--dry-run" ]]; then
  dry_run=true
  shift
fi

if (( $# > 0 )); then
  printf 'Usage: %s [--dry-run]\n' "$0" >&2
  exit 64
fi

if [[ "${EUID}" -ne 0 ]]; then
  printf 'ERROR: run this helper as root\n' >&2
  exit 1
fi

mapfile -t container_ids < <(docker ps -aq --filter "label=${project_label}")

if (( ${#container_ids[@]} == 0 )); then
  printf 'ERROR: no Gym Tracker containers were found\n' >&2
  exit 1
fi

pruned=0
for container_id in "${container_ids[@]}"; do
  full_id="$(docker inspect --format '{{.Id}}' "${container_id}")"
  log_path="$(docker inspect --format '{{.LogPath}}' "${container_id}")"
  expected_path="/var/lib/docker/containers/${full_id}/${full_id}-json.log"

  if [[ "${log_path}" != "${expected_path}" ]]; then
    printf 'ERROR: refusing unexpected log path for container %.12s\n' "${full_id}" >&2
    exit 1
  fi

  if [[ "${dry_run}" == false ]]; then
    find "$(dirname "${log_path}")" -maxdepth 1 -type f \
      -name "${full_id}-json.log.*" -delete
    truncate -s 0 -- "${log_path}"
  fi
  pruned=$((pruned + 1))
done

if [[ "${dry_run}" == true ]]; then
  printf 'LOG_RETENTION_DRY_RUN=passed containers=%s\n' "${pruned}"
else
  printf 'LOG_RETENTION_PRUNE=passed containers=%s\n' "${pruned}"
fi
