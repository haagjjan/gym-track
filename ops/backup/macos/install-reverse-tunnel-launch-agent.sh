#!/bin/bash

set -euo pipefail

readonly LABEL="ch.gymtracker.backup-reverse-tunnel"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SOURCE_PLIST="${SCRIPT_DIR}/${LABEL}.plist"
readonly TARGET_DIRECTORY="${HOME}/Library/LaunchAgents"
readonly TARGET_PLIST="${TARGET_DIRECTORY}/${LABEL}.plist"
readonly LOG_DIRECTORY="${HOME}/Library/Logs/GymTrackerBackup"
readonly DOMAIN="gui/$(id -u)"

if [[ "${EUID}" -eq 0 ]]; then
  printf 'ERROR: install this per-user launch agent without sudo\n' >&2
  exit 1
fi

[[ -f "${SOURCE_PLIST}" ]] || {
  printf 'ERROR: launch-agent source is unavailable\n' >&2
  exit 1
}
/usr/bin/plutil -lint "${SOURCE_PLIST}" >/dev/null
/usr/bin/nc -z -w 2 127.0.0.1 22 >/dev/null 2>&1 || {
  printf 'ERROR: macOS Remote Login is unavailable on local port 22\n' >&2
  exit 1
}
configured_host="$(/usr/bin/ssh -G gym-prod-remote 2>/dev/null | awk '$1 == "hostname" { print $2; exit }')"
[[ -n "${configured_host}" && "${configured_host}" != "gym-prod-remote" ]] || {
  printf 'ERROR: SSH alias gym-prod-remote is not configured\n' >&2
  exit 1
}

/usr/bin/install -d -m 0755 "${TARGET_DIRECTORY}"
/usr/bin/install -d -m 0700 "${LOG_DIRECTORY}"
/bin/launchctl bootout "${DOMAIN}/${LABEL}" >/dev/null 2>&1 || true
/usr/bin/install -m 0644 "${SOURCE_PLIST}" "${TARGET_PLIST}"
/usr/bin/plutil -insert StandardOutPath -string \
  "${LOG_DIRECTORY}/reverse-tunnel.log" "${TARGET_PLIST}"
/usr/bin/plutil -insert StandardErrorPath -string \
  "${LOG_DIRECTORY}/reverse-tunnel-error.log" "${TARGET_PLIST}"
/usr/bin/plutil -lint "${TARGET_PLIST}" >/dev/null
/bin/launchctl bootstrap "${DOMAIN}" "${TARGET_PLIST}"
/bin/launchctl enable "${DOMAIN}/${LABEL}"

printf 'BACKUP_REVERSE_TUNNEL_AGENT=installed\n'
printf 'BACKUP_REVERSE_TUNNEL_LABEL=%s\n' "${LABEL}"
printf 'BACKUP_REVERSE_TUNNEL_TARGET=%s\n' "${configured_host}"
printf 'BACKUP_REVERSE_TUNNEL_LOG=%s\n' "${LOG_DIRECTORY}/reverse-tunnel-error.log"
