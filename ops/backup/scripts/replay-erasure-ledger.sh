#!/usr/bin/env bash

set -euo pipefail

if [[ "$#" -ne 2 ]]; then
  printf 'Usage: %s POSTGRES_CONTAINER ERASURE_LEDGER_CSV\n' "$0" >&2
  exit 2
fi

readonly CONTAINER_NAME="$1"
readonly LEDGER_FILE="$2"
readonly CONTAINER_LEDGER="/tmp/gym-tracker-erasure-ledger.csv"

command -v docker >/dev/null 2>&1 || { printf 'ERROR: docker is required\n' >&2; exit 1; }
[[ -f "${LEDGER_FILE}" && ! -L "${LEDGER_FILE}" ]] || { printf 'ERROR: ledger file is unavailable\n' >&2; exit 1; }
docker inspect "${CONTAINER_NAME}" >/dev/null
docker cp "${LEDGER_FILE}" "${CONTAINER_NAME}:${CONTAINER_LEDGER}" >/dev/null
docker exec --user root "${CONTAINER_NAME}" chown postgres:postgres "${CONTAINER_LEDGER}"
docker exec --user root "${CONTAINER_NAME}" chmod 0600 "${CONTAINER_LEDGER}"
trap 'docker exec "${CONTAINER_NAME}" rm -f -- "${CONTAINER_LEDGER}" >/dev/null 2>&1 || true' EXIT

docker exec -i "${CONTAINER_NAME}" psql -X -v ON_ERROR_STOP=1 -U postgres -d gym_tracker <<'SQL'
BEGIN;
CREATE TEMP TABLE replay_erasure_ledger (
  user_id uuid PRIMARY KEY,
  finalized_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
) ON COMMIT DROP;
COPY replay_erasure_ledger FROM '/tmp/gym-tracker-erasure-ledger.csv' WITH (FORMAT csv, HEADER true);

DELETE FROM sets WHERE session_exercise_id IN (SELECT se.id FROM session_exercises se JOIN workout_sessions ws ON ws.id = se.workout_session_id JOIN replay_erasure_ledger l ON l.user_id = ws.user_id);
DELETE FROM session_exercises WHERE workout_session_id IN (SELECT ws.id FROM workout_sessions ws JOIN replay_erasure_ledger l ON l.user_id = ws.user_id);
DELETE FROM workout_sessions WHERE user_id IN (SELECT user_id FROM replay_erasure_ledger);
DELETE FROM workout_template_exercises WHERE workout_template_id IN (SELECT wt.id FROM workout_templates wt JOIN replay_erasure_ledger l ON l.user_id = wt.user_id);
DELETE FROM workout_templates WHERE user_id IN (SELECT user_id FROM replay_erasure_ledger);
DELETE FROM message_deliveries WHERE user_id IN (SELECT user_id FROM replay_erasure_ledger);
DELETE FROM campaign_targets WHERE user_id IN (SELECT user_id FROM replay_erasure_ledger);
DELETE FROM app_events WHERE user_id IN (SELECT user_id FROM replay_erasure_ledger);
DELETE FROM auth_action_tokens WHERE user_id IN (SELECT user_id FROM replay_erasure_ledger);
DELETE FROM user_sessions WHERE user_id IN (SELECT user_id FROM replay_erasure_ledger);
DELETE FROM beta_access_requests WHERE joined_user_id IN (SELECT user_id FROM replay_erasure_ledger);
DELETE FROM account_deletion_tokens WHERE user_id IN (SELECT user_id FROM replay_erasure_ledger);
UPDATE admin_audit_events SET target_id = 'erased'
  WHERE target_type = 'USER' AND target_id IN (SELECT user_id::text FROM replay_erasure_ledger);
DELETE FROM exercise_secondary_muscles WHERE exercise_id IN (
  SELECT e.id FROM exercises e JOIN replay_erasure_ledger l ON l.user_id = e.created_by_user_id
  WHERE NOT EXISTS (SELECT 1 FROM session_exercises se WHERE se.exercise_id = e.id)
    AND NOT EXISTS (SELECT 1 FROM workout_template_exercises wte WHERE wte.exercise_id = e.id)
);
DELETE FROM exercise_muscle_groups WHERE exercise_id IN (
  SELECT e.id FROM exercises e JOIN replay_erasure_ledger l ON l.user_id = e.created_by_user_id
  WHERE NOT EXISTS (SELECT 1 FROM session_exercises se WHERE se.exercise_id = e.id)
    AND NOT EXISTS (SELECT 1 FROM workout_template_exercises wte WHERE wte.exercise_id = e.id)
);
DELETE FROM exercises WHERE created_by_user_id IN (SELECT user_id FROM replay_erasure_ledger)
  AND NOT EXISTS (SELECT 1 FROM session_exercises se WHERE se.exercise_id = exercises.id)
  AND NOT EXISTS (SELECT 1 FROM workout_template_exercises wte WHERE wte.exercise_id = exercises.id);
UPDATE exercises SET created_by_user_id = NULL WHERE created_by_user_id IN (SELECT user_id FROM replay_erasure_ledger);
DELETE FROM users WHERE id IN (SELECT user_id FROM replay_erasure_ledger);
INSERT INTO erasure_tombstones (user_id, finalized_at, expires_at)
SELECT user_id, finalized_at, expires_at FROM replay_erasure_ledger
ON CONFLICT (user_id) DO UPDATE SET finalized_at = EXCLUDED.finalized_at, expires_at = EXCLUDED.expires_at;
COMMIT;
SQL

trap - EXIT
docker exec "${CONTAINER_NAME}" rm -f -- "${CONTAINER_LEDGER}" >/dev/null
printf '{"event":"gym_tracker_erasure_ledger_replayed"}\n'
