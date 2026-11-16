#!/bin/bash

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Only the background tunnel uses the rate-limited browser opener.
export PATH="${SCRIPT_DIR}/browser:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

exec /usr/bin/ssh -N -T \
  -o BatchMode=yes \
  -o ConnectTimeout=120 \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=60 \
  -o ServerAliveCountMax=3 \
  -o TCPKeepAlive=yes \
  -o 'ProxyCommand=/opt/homebrew/bin/cloudflared access ssh --hostname %h 2>/dev/null' \
  -R 127.0.0.1:2222:127.0.0.1:22 \
  gym-prod-remote
