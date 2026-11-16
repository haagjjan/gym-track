#!/bin/bash

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly FIXTURE="$(mktemp -d)"
trap 'rm -rf "${FIXTURE}"' EXIT
export HOME="${FIXTURE}/home"
export PROMPT_TEST_CALLS="${FIXTURE}/calls"
readonly STATE="${HOME}/Library/Application Support/GymTrackerBackup/state"
readonly STAMP="${STATE}/last-browser-prompt"
readonly URL='https://ssh.gymtrack.ch/cdn-cgi/access/cli?test=fixture'
mkdir -p "${STATE}"
cat > "${FIXTURE}/real-open" <<'SH'
#!/bin/bash
[[ "${PROMPT_TEST_FAIL:-0}" == 0 ]] || exit 1
printf 'opened\n' >> "${PROMPT_TEST_CALLS}"
SH
chmod 700 "${FIXTURE}/real-open"
sed "s|/usr/bin/open|${FIXTURE}/real-open|" \
  "${SCRIPT_DIR}/browser/open" > "${FIXTURE}/open"

assert_calls() {
  local actual=0
  if [[ -f "${PROMPT_TEST_CALLS}" ]]; then
    actual="$(wc -l < "${PROMPT_TEST_CALLS}" | tr -d ' ')"
  fi
  [[ "${actual}" -eq "$1" ]] || {
    printf 'FAIL: expected %s browser calls, got %s\n' "$1" "${actual}" >&2
    exit 1
  }
}

# Unrelated URLs and argument injection fail closed.
if bash "${FIXTURE}/open" https://example.com; then exit 1; fi
if bash "${FIXTURE}/open" -a Safari "${URL}"; then exit 1; fi
assert_calls 0

bash "${FIXTURE}/open" "${URL}"
assert_calls 1
[[ -s "${STAMP}" ]]

# Separate invocations share the same persistent cooldown.
for attempt in 1 2 3; do bash "${FIXTURE}/open" "${URL}"; done
assert_calls 1
printf '%s\n' "$(( $(date +%s) - 86300 ))" > "${STAMP}"
bash "${FIXTURE}/open" "${URL}"
assert_calls 1

printf '%s\n' "$(( $(date +%s) - 86401 ))" > "${STAMP}"
bash "${FIXTURE}/open" "${URL}"
assert_calls 2

# Concurrent retries cannot each open a tab at the boundary.
printf '%s\n' "$(( $(date +%s) - 86401 ))" > "${STAMP}"
pids=()
for attempt in 1 2 3 4; do
  bash "${FIXTURE}/open" "${URL}" &
  pids+=("$!")
done
for pid in "${pids[@]}"; do wait "${pid}"; done
assert_calls 3

# A crashed opener's lock must not prevent future prompts.
printf 'old lock file\n' > "${STATE}/browser.lock"
printf '%s\n' "$(( $(date +%s) - 86401 ))" > "${STAMP}"
bash "${FIXTURE}/open" "${URL}"
assert_calls 4

# A failed browser launch still consumes the attempt, preventing a retry storm.
printf '%s\n' "$(( $(date +%s) - 86401 ))" > "${STAMP}"
if PROMPT_TEST_FAIL=1 bash "${FIXTURE}/open" "${URL}"; then exit 1; fi
bash "${FIXTURE}/open" "${URL}"
assert_calls 4

printf 'damaged\n' > "${STAMP}"
if bash "${FIXTURE}/open" "${URL}"; then exit 1; fi
assert_calls 4
printf 'Browser prompt checks passed\n'
