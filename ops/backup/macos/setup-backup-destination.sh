#!/bin/bash

set -euo pipefail

readonly BACKUP_USER="gym-backup"
readonly CHROOT_ROOT="/private/var/gym-backup"
readonly REPOSITORY_DIRECTORY="${CHROOT_ROOT}/repository"
readonly AUTHORIZED_KEYS_FILE="/etc/ssh/gym-backup-authorized-keys"
readonly SSH_DROP_IN="/etc/ssh/sshd_config.d/200-gym-tracker-backup.conf"

if [[ "${EUID}" -ne 0 ]]; then
  printf 'ERROR: run this script with sudo\n' >&2
  exit 1
fi
if [[ "$#" -ne 1 || ! -f "$1" ]]; then
  printf 'Usage: sudo %s PUBLIC_KEY_FILE\n' "$0" >&2
  exit 2
fi

public_key="$(tr -d '\r\n' < "$1")"
[[ "${public_key}" =~ ^ssh-ed25519[[:space:]][A-Za-z0-9+/=]+([[:space:]].*)?$ ]] || {
  printf 'ERROR: the supplied file is not one Ed25519 public key\n' >&2
  exit 1
}

if ! dscl . -read "/Users/${BACKUP_USER}" >/dev/null 2>&1; then
  next_uid="$(dscl . -list /Users UniqueID | awk '$2 >= 501 && $2 < 60000 {if ($2 > max) max=$2} END {print max + 1}')"
  dscl . -create "/Users/${BACKUP_USER}"
  dscl . -create "/Users/${BACKUP_USER}" UserShell /bin/zsh
  dscl . -create "/Users/${BACKUP_USER}" RealName "Gym Tracker Backup"
  dscl . -create "/Users/${BACKUP_USER}" UniqueID "${next_uid}"
  dscl . -create "/Users/${BACKUP_USER}" PrimaryGroupID 20
  dscl . -create "/Users/${BACKUP_USER}" NFSHomeDirectory /repository
  dscl . -create "/Users/${BACKUP_USER}" IsHidden 1
  dscl . -create "/Users/${BACKUP_USER}" Password '*'
fi

# macOS PAM requires an account shell from /etc/shells even when sshd forces
# the session into internal-sftp and never permits an interactive shell.
dscl . -create "/Users/${BACKUP_USER}" UserShell /bin/zsh

password_record="$(dscl . -read "/Users/${BACKUP_USER}" Password | awk '{print $2}')"
if [[ "${password_record}" == "*" ]]; then
  generated_password="$(/usr/bin/openssl rand -base64 48 | tr -d '\r\n')"
  dscl . -passwd "/Users/${BACKUP_USER}" "${generated_password}"
  unset generated_password
fi

install -d -o root -g wheel -m 0755 "${CHROOT_ROOT}"
install -d -o "${BACKUP_USER}" -g staff -m 0700 "${REPOSITORY_DIRECTORY}"
printf '%s\n' "${public_key}" > "${AUTHORIZED_KEYS_FILE}"
chown root:wheel "${AUTHORIZED_KEYS_FILE}"
chmod 0644 "${AUTHORIZED_KEYS_FILE}"

cat > "${SSH_DROP_IN}" <<EOF
Match User ${BACKUP_USER}
    ChrootDirectory ${CHROOT_ROOT}
    ForceCommand internal-sftp -d /repository
    AuthenticationMethods publickey
    AuthorizedKeysFile ${AUTHORIZED_KEYS_FILE}
    PasswordAuthentication no
    KbdInteractiveAuthentication no
    PermitTTY no
    DisableForwarding yes
    X11Forwarding no
Match all
EOF
chown root:wheel "${SSH_DROP_IN}"
chmod 0644 "${SSH_DROP_IN}"

if ! dseditgroup -o read com.apple.access_ssh >/dev/null 2>&1; then
  dseditgroup -o create com.apple.access_ssh
fi
dseditgroup -o edit -a "${BACKUP_USER}" -t user com.apple.access_ssh
dseditgroup -o edit -d admin -t group com.apple.access_ssh >/dev/null 2>&1 || true

/usr/bin/ssh-keygen -A
/usr/sbin/sshd -t -f /etc/ssh/sshd_config

if ! /usr/bin/nc -z -w 2 127.0.0.1 22 >/dev/null 2>&1; then
  printf 'ACTION_REQUIRED=enable Remote Login in System Settings > General > Sharing\n'
  printf 'ACTION_SAFETY=allow only gym-backup and do not grant Full Disk Access\n'
  exit 3
fi

host_key_file="/etc/ssh/ssh_host_ed25519_key.pub"
[[ -r "${host_key_file}" ]] || {
  printf 'ERROR: macOS did not create an Ed25519 SSH host key\n' >&2
  exit 1
}

printf 'MAC_BACKUP_DESTINATION=prepared\n'
printf 'MAC_BACKUP_USER=%s\n' "${BACKUP_USER}"
printf 'MAC_BACKUP_PATH=%s\n' "${REPOSITORY_DIRECTORY}"
printf 'MAC_SSH_HOST_KEY_FINGERPRINT=%s\n' "$(ssh-keygen -lf "${host_key_file}" | awk '{print $2}')"
