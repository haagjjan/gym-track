#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
# shellcheck source=backup-common.sh
source "${SCRIPT_DIR}/backup-common.sh"

readonly COMPOSE_FILE="${GYM_TRACKER_ROOT}/deploy/compose/compose.yaml"
readonly LEDGER_DIR="${GYM_TRACKER_ROOT}/state/erasure-ledger"
readonly LEDGER_FILE="${LEDGER_DIR}/current.csv"

require_root
require_command docker
container_id="$(docker compose -p gym-tracker -f "${COMPOSE_FILE}" ps -q postgres)"
[[ -n "${container_id}" ]] || { printf 'ERROR: PostgreSQL container is unavailable\n' >&2; exit 1; }

install -d -o root -g gym-tracker -m 0750 "${LEDGER_DIR}"
temporary_file="$(mktemp "${LEDGER_DIR}/.current-XXXXXXXX")"
cleanup() { rm -f -- "${temporary_file}"; }
trap cleanup EXIT

docker exec "${container_id}" psql -X -q -U postgres -d gym_tracker -c \
  "COPY (SELECT user_id, finalized_at, expires_at FROM erasure_tombstones WHERE expires_at >= now() ORDER BY finalized_at) TO STDOUT WITH (FORMAT csv, HEADER true)" \
  > "${temporary_file}"
chown root:gym-tracker "${temporary_file}"
chmod 0640 "${temporary_file}"
mv -f "${temporary_file}" "${LEDGER_FILE}"
trap - EXIT
printf 'ERASURE_LEDGER=%s\n' "${LEDGER_FILE}"
