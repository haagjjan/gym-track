#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
# shellcheck source=backup-common.sh
source "${SCRIPT_DIR}/backup-common.sh"

require_root
require_command rsync

if [[ "$#" -ne 3 ]]; then
  printf 'Usage: %s DUMP MANIFEST STAGING_DIRECTORY\n' "$0" >&2
  exit 2
fi

readonly DUMP_FILE="$1"
readonly MANIFEST_FILE="$2"
readonly STAGING_DIRECTORY="$3"

case "${STAGING_DIRECTORY}" in
  "${BACKUP_ROOT}/staging/gym-tracker-"*) ;;
  *)
    printf 'ERROR: staging path is outside the controlled backup directory\n' >&2
    exit 1
    ;;
esac

[[ -f "${DUMP_FILE}" && -f "${MANIFEST_FILE}" ]] || {
  printf 'ERROR: the selected dump or manifest is missing\n' >&2
  exit 1
}
[[ ! -e "${STAGING_DIRECTORY}" ]] || {
  printf 'ERROR: staging directory already exists\n' >&2
  exit 1
}

install -d -o root -g root -m 0700 "${STAGING_DIRECTORY}"

copy_tree() {
  local source_path="$1"
  local relative_target="$2"
  [[ -d "${source_path}" && ! -L "${source_path}" ]] || {
    printf 'ERROR: required backup source is unavailable: %s\n' "${relative_target}" >&2
    exit 1
  }
  install -d -o root -g root -m 0700 "${STAGING_DIRECTORY}/${relative_target}"
  rsync -a --numeric-ids --safe-links --no-devices --no-specials \
    --exclude='*.tmp' --exclude='*.swp' --exclude='*.sock' \
    "${source_path}/" "${STAGING_DIRECTORY}/${relative_target}/"
}

copy_tree "${GYM_TRACKER_ROOT}/deploy/compose" "deploy/compose"
copy_tree "${GYM_TRACKER_ROOT}/deploy/config" "deploy/config"
copy_tree "${GYM_TRACKER_ROOT}/deploy/env" "deploy/env"
copy_tree "${GYM_TRACKER_ROOT}/deploy/monitoring" "deploy/monitoring"
copy_tree "${GYM_TRACKER_ROOT}/deploy/recovery" "deploy/recovery"
copy_tree "${GYM_TRACKER_ROOT}/deploy/systemd" "deploy/systemd"
copy_tree "${GYM_TRACKER_ROOT}/scripts" "scripts"
copy_tree "${GYM_TRACKER_ROOT}/state" "state"
copy_tree "${GYM_TRACKER_ROOT}/secrets" "secrets"

install -d -o root -g root -m 0700 "${STAGING_DIRECTORY}/postgres" "${STAGING_DIRECTORY}/metadata"
install -o root -g root -m 0600 "${DUMP_FILE}" "${STAGING_DIRECTORY}/postgres/$(basename "${DUMP_FILE}")"
install -o root -g root -m 0600 "${MANIFEST_FILE}" "${STAGING_DIRECTORY}/postgres/$(basename "${MANIFEST_FILE}")"
git -c safe.directory="${GYM_TRACKER_ROOT}/repo" \
  -C "${GYM_TRACKER_ROOT}/repo" rev-parse HEAD \
  > "${STAGING_DIRECTORY}/metadata/deployed-commit.txt"
chmod 0600 "${STAGING_DIRECTORY}/metadata/deployed-commit.txt"

if find "${STAGING_DIRECTORY}" -type l -print -quit | grep -q .; then
  printf 'ERROR: staged backup contains a symbolic link\n' >&2
  exit 1
fi

inventory_temporary="$(mktemp "${BACKUP_ROOT}/staging/.inventory-XXXXXXXX")"
trap 'rm -f -- "${inventory_temporary}"' EXIT
find "${STAGING_DIRECTORY}" -type f \
  -printf '%P\t%s\t%m\t%U:%G\n' \
  | LC_ALL=C sort > "${inventory_temporary}"
install -o root -g root -m 0600 "${inventory_temporary}" "${STAGING_DIRECTORY}/metadata/inventory.tsv"
rm -f -- "${inventory_temporary}"
trap - EXIT

printf 'STAGING_DIRECTORY=%s\n' "${STAGING_DIRECTORY}"
