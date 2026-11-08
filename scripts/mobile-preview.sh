#!/usr/bin/env bash
# Open the local dev web app on the iOS Simulator and the Android emulator.
#
# Default mode "shell" runs a throwaway Capacitor dev shell whose WebView loads
# the dev server (server.url), so safe areas, status bars, back navigation and
# the missing browser toolbar match the app from ADR 0021. Mode "browser" opens
# Mobile Safari / Chrome instead (useful for comparison only).
#
# The shell lives outside the repo (CAP_SHELL_DIR) and adds no repo dependencies.
# It is not the bundled static-export build; that is the ADR 0021 spike.
#
# Usage: scripts/mobile-preview.sh [all|ios|android] [--browser] [--rebuild] [--path /route]
#        --path only applies to --browser; the shell always starts at the app root.
# Needs: the web dev server running (pnpm --filter @gym-progress-tracker/web dev),
#        Xcode 26+, Android SDK at ~/Library/Android/sdk, JDK 21, Node 22+.
set -euo pipefail

TARGET=all MODE=shell REBUILD=0 ROUTE=/
while [ $# -gt 0 ]; do
  case "$1" in
    all|ios|android) TARGET=$1 ;;
    --browser) MODE=browser ;;
    --rebuild) REBUILD=1 ;;
    --path) ROUTE=$2; shift ;;
    -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
  shift
done

WEB_PORT=${WEB_PORT:-3000}
URL="http://localhost:${WEB_PORT}${ROUTE}"
IOS_DEVICE=${IOS_DEVICE:-iPhone 17}
ANDROID_AVD=${ANDROID_AVD:-gymtrack_pixel_play}
ANDROID_HOME=${ANDROID_HOME:-$HOME/Library/Android/sdk}
CAP_SHELL_DIR=${CAP_SHELL_DIR:-$HOME/.cache/gymtrack-cap-shell}
CAP_VERSION=8.6.0
CAP_APP_VERSION=8.1.2
APP_ID=dev.gymtrack.shell
ADB="$ANDROID_HOME/platform-tools/adb"
LOG_DIR=${LOG_DIR:-${TMPDIR:-/tmp}/gymtrack-mobile-preview}
mkdir -p "$LOG_DIR"

log() { printf '[mobile-preview] %s\n' "$*"; }
die() { printf '[mobile-preview] error: %s\n' "$*" >&2; exit 1; }

curl -fsS -o /dev/null "http://localhost:${WEB_PORT}/login" \
  || die "dev server not reachable on :${WEB_PORT}; start it first"

write_shell_config() {
  cat > "$CAP_SHELL_DIR/capacitor.config.json" <<EOF
{
  "appId": "$APP_ID",
  "appName": "GymTrack Dev",
  "webDir": "www",
  "server": { "url": "http://localhost:${WEB_PORT}", "cleartext": true },
  "plugins": { "SystemBars": { "insetsHandling": "native" } }
}
EOF
}

ensure_shell() {
  if [ ! -d "$CAP_SHELL_DIR/node_modules/@capacitor/cli" ]; then
    log "creating Capacitor $CAP_VERSION dev shell in $CAP_SHELL_DIR"
    mkdir -p "$CAP_SHELL_DIR/www"
    printf '{ "name": "gymtrack-cap-shell", "private": true, "version": "0.0.0" }\n' > "$CAP_SHELL_DIR/package.json"
    printf '<!doctype html><title>shell</title><p>server.url should load the dev server.</p>\n' > "$CAP_SHELL_DIR/www/index.html"
    (cd "$CAP_SHELL_DIR" && npm install --no-audit --no-fund \
      "@capacitor/core@$CAP_VERSION" "@capacitor/cli@$CAP_VERSION" \
      "@capacitor/ios@$CAP_VERSION" "@capacitor/android@$CAP_VERSION" \
      "@capacitor/app@$CAP_APP_VERSION" >"$LOG_DIR/npm.log" 2>&1) || die "npm install failed, see $LOG_DIR/npm.log"
  fi
  write_shell_config
  [ -d "$CAP_SHELL_DIR/$1" ] || (cd "$CAP_SHELL_DIR" && npx cap add "$1" >"$LOG_DIR/cap-add-$1.log" 2>&1) \
    || die "cap add $1 failed, see $LOG_DIR/cap-add-$1.log"
}

run_ios() {
  local udid
  udid=$(xcrun simctl list devices available | grep -F "    $IOS_DEVICE (" | head -1 | grep -oE '[0-9A-F-]{36}') \
    || die "no available simulator named '$IOS_DEVICE'"
  xcrun simctl boot "$udid" 2>/dev/null || true
  open -a Simulator
  xcrun simctl bootstatus "$udid" -b >/dev/null
  log "iOS: $IOS_DEVICE ($udid) booted"
  if [ "$MODE" = browser ]; then
    xcrun simctl openurl "$udid" "$URL"
    return
  fi
  ensure_shell ios
  if [ "$REBUILD" = 1 ] || ! xcrun simctl get_app_container "$udid" "$APP_ID" >/dev/null 2>&1; then
    log "iOS: building shell (first build takes about 2 min)"
    (cd "$CAP_SHELL_DIR" && npx cap run ios --target "$udid" >"$LOG_DIR/cap-ios.log" 2>&1) \
      || die "iOS build failed, see $LOG_DIR/cap-ios.log"
  else
    xcrun simctl terminate "$udid" "$APP_ID" 2>/dev/null || true
    xcrun simctl launch "$udid" "$APP_ID" >/dev/null
  fi
  log "iOS: shell running ($URL)"
}

android_serial() { "$ADB" devices | awk '/^emulator-[0-9]+\tdevice$/ {print $1; exit}'; }

run_android() {
  [ -x "$ADB" ] || die "adb not found under $ANDROID_HOME"
  local serial
  serial=$(android_serial)
  if [ -z "$serial" ]; then
    log "Android: starting AVD $ANDROID_AVD"
    nohup "$ANDROID_HOME/emulator/emulator" -avd "$ANDROID_AVD" -no-boot-anim >"$LOG_DIR/emulator.log" 2>&1 &
    "$ADB" wait-for-device
    serial=$(android_serial)
  fi
  for _ in $(seq 120); do
    [ "$("$ADB" -s "$serial" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && break
    sleep 2
  done
  "$ADB" -s "$serial" reverse "tcp:$WEB_PORT" "tcp:$WEB_PORT" >/dev/null
  local webview major
  webview=$("$ADB" -s "$serial" shell dumpsys webviewupdate | sed -n 's/.*Current WebView package (name, version): (\(.*\))/\1/p' | tr -d '\r')
  major=$(printf '%s' "$webview" | sed -E 's/.*, ([0-9]+)\..*/\1/')
  log "Android: $serial booted, WebView $webview"
  if [ "${major:-0}" -lt 140 ] 2>/dev/null; then
    log "WARNING: Android WebView < 140 reports wrong safe-area insets (Capacitor SystemBars docs)."
    log "         Update 'Android System WebView' in the emulator's Play Store before judging layout."
  fi
  if [ "$MODE" = browser ]; then
    "$ADB" -s "$serial" shell am start -a android.intent.action.VIEW -d "$URL" com.android.chrome >/dev/null
    return
  fi
  ensure_shell android
  if [ "$REBUILD" = 1 ] || ! "$ADB" -s "$serial" shell pm path "$APP_ID" >/dev/null 2>&1; then
    log "Android: building shell"
    (cd "$CAP_SHELL_DIR" && JAVA_HOME=$(/usr/libexec/java_home -v 21) ANDROID_HOME="$ANDROID_HOME" \
      npx cap run android --target "$serial" >"$LOG_DIR/cap-android.log" 2>&1) \
      || die "Android build failed, see $LOG_DIR/cap-android.log"
  else
    "$ADB" -s "$serial" shell am force-stop "$APP_ID"
    "$ADB" -s "$serial" shell am start -n "$APP_ID/.MainActivity" >/dev/null
  fi
  log "Android: shell running ($URL)"
}

case "$TARGET" in
  ios) run_ios ;;
  android) run_android ;;
  all) run_ios; run_android ;;
esac
log "logs: $LOG_DIR"
