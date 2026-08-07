import type { Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { AddSetRequest, UpdateSetRequest } from "./workout-logging.schemas.js";
import {
  compactSetOrder,
  countActiveRows,
  findSetByUser,
  lockOwnedWorkout,
  setSelection,
  toSetInsert,
  toSetRecord,
  toSetUpdate
} from "./workout-logging.repository.helpers.js";
import type { MutationWriteResult, SetRecord } from "./workout-logging.repository.js";

interface AddSetWriteInput {
  id: string;
  userId: string;
  workoutId: string;
  sessionExerciseId: string;
  values: AddSetRequest;
}

export async function addSetWrite(
  db: Kysely<AppDatabase>,
  input: AddSetWriteInput
): Promise<MutationWriteResult<SetRecord>> {
  return db.transaction().execute(async (trx) => {
    if (!(await lockOwnedWorkout(trx, input.userId, input.workoutId))) {
      return { ok: false, reason: "not_found" };
    }
    if (!(await lockSessionExercise(trx, input.workoutId, input.sessionExerciseId))) {
      return { ok: false, reason: "not_found" };
    }

    const replay = await findSetReplay(
      trx,
      input.sessionExerciseId,
      input.values.clientMutationId
    );
    if (replay) {
      return setReplayMatches(replay, input.values)
        ? { ok: true, replayed: true, value: toSetRecord(replay) }
        : { ok: false, reason: "idempotency_conflict" };
    }

    const setOrder =
      (await countActiveRows(trx, "sets", "session_exercise_id", input.sessionExerciseId)) + 1;
    const row = await trx
      .insertInto("sets")
      .values(toSetInsert({
        id: input.id,
        sessionExerciseId: input.sessionExerciseId,
        setOrder,
        values: input.values
      }))
      .returning(setSelection)
      .executeTakeFirstOrThrow();

    return { ok: true, replayed: false, value: toSetRecord(row) };
  });
}

export async function updateSetWrite(
  db: Kysely<AppDatabase>,
  userId: string,
  setId: string,
  input: UpdateSetRequest,
  updatedAt: Date
): Promise<SetRecord | null> {
  if (!(await findSetByUser(db, userId, setId))) return null;

  const row = await db
    .updateTable("sets")
    .set(toSetUpdate(input, updatedAt))
    .where("id", "=", setId)
    .where("deleted_at", "is", null)
    .returning(setSelection)
    .executeTakeFirst();

  return row ? toSetRecord(row) : null;
}

export async function deleteSetWrite(
  db: Kysely<AppDatabase>,
  userId: string,
  setId: string,
  deletedAt: Date
): Promise<MutationWriteResult<{ deleted: true }>> {
  return db.transaction().execute(async (trx) => {
    const parent = await findSetParent(trx, userId, setId);
    if (!parent || !(await lockOwnedWorkout(trx, userId, parent.workoutId))) {
      return { ok: false, reason: "not_found" };
    }
    if (!(await lockSessionExercise(trx, parent.workoutId, parent.sessionExerciseId))) {
      return { ok: false, reason: "not_found" };
    }

    const result = await trx
      .updateTable("sets")
      .set({ deleted_at: deletedAt, updated_at: deletedAt })
      .where("id", "=", setId)
      .where("session_exercise_id", "=", parent.sessionExerciseId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();
    if (Number(result.numUpdatedRows) === 0) {
      return { ok: false, reason: "not_found" };
    }

    await compactSetOrder(trx, parent.sessionExerciseId, deletedAt);
    return { ok: true, replayed: false, value: { deleted: true } };
  });
}

async function lockSessionExercise(
  db: Kysely<AppDatabase>,
  workoutId: string,
  sessionExerciseId: string
): Promise<boolean> {
  const row = await db
    .selectFrom("session_exercises")
    .select("id")
    .where("id", "=", sessionExerciseId)
    .where("workout_session_id", "=", workoutId)
    .where("deleted_at", "is", null)
    .forUpdate()
    .executeTakeFirst();

  return row !== undefined;
}

async function findSetReplay(
  db: Kysely<AppDatabase>,
  sessionExerciseId: string,
  clientMutationId: string
) {
  return db
    .selectFrom("sets")
    .select([...setSelection, "deleted_at as deletedAt"])
    .where("session_exercise_id", "=", sessionExerciseId)
    .where("client_mutation_id", "=", clientMutationId)
    .executeTakeFirst();
}

function setReplayMatches(
  row: Parameters<typeof toSetRecord>[0] & { deletedAt: Date | null },
  input: AddSetRequest
): boolean {
  return (
    row.deletedAt === null &&
    row.setType === input.setType &&
    Number(row.weightKg) === Number(input.weightKg) &&
    row.reps === input.reps &&
    row.rir === input.rir &&
    row.restTimeSeconds === (input.restTimeSeconds ?? null) &&
    row.note === (input.note ?? null)
  );
}

async function findSetParent(db: Kysely<AppDatabase>, userId: string, setId: string) {
  return db
    .selectFrom("sets")
    .innerJoin("session_exercises", "session_exercises.id", "sets.session_exercise_id")
    .innerJoin("workout_sessions", "workout_sessions.id", "session_exercises.workout_session_id")
    .select([
      "session_exercises.id as sessionExerciseId",
      "workout_sessions.id as workoutId"
    ])
    .where("sets.id", "=", setId)
    .where("sets.deleted_at", "is", null)
    .where("session_exercises.deleted_at", "is", null)
    .where("workout_sessions.deleted_at", "is", null)
    .where("workout_sessions.user_id", "=", userId)
    .executeTakeFirst();
}
