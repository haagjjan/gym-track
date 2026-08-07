import { sql, type Kysely } from "kysely";
import type { AppDatabase } from "../../db/database.js";
import type { AddSessionExerciseRequest } from "./workout-logging.schemas.js";
import {
  compactExercisePositions,
  countActiveRows,
  findSelectableExercise,
  findSessionExerciseByIdOrThrow,
  lockOwnedWorkout,
  shiftExercisePositions
} from "./workout-logging.repository.helpers.js";
import type {
  MutationWriteResult,
  SessionExerciseRecord
} from "./workout-logging.repository.js";

interface AddExerciseWriteInput {
  id: string;
  userId: string;
  workoutId: string;
  values: AddSessionExerciseRequest;
}

export async function addSessionExerciseWrite(
  db: Kysely<AppDatabase>,
  input: AddExerciseWriteInput
): Promise<MutationWriteResult<SessionExerciseRecord>> {
  return db.transaction().execute(async (trx) => {
    if (!(await lockOwnedWorkout(trx, input.userId, input.workoutId))) {
      return { ok: false, reason: "not_found" };
    }

    const replay = await findExerciseReplay(
      trx,
      input.workoutId,
      input.values.clientMutationId
    );

    if (replay) {
      if (!exerciseReplayMatches(replay, input.values)) {
        return { ok: false, reason: "idempotency_conflict" };
      }

      return {
        ok: true,
        replayed: true,
        value: await findSessionExerciseByIdOrThrow(trx, replay.id)
      };
    }

    const exercise = await findSelectableExercise(trx, input.values.exerciseId);
    if (!exercise) {
      return { ok: false, reason: "not_found" };
    }

    const count = await countActiveRows(
      trx,
      "session_exercises",
      "workout_session_id",
      input.workoutId
    );
    const position = input.values.position ?? count + 1;

    if (position > count + 1) {
      return { ok: false, reason: "invalid_order" };
    }

    await shiftExercisePositions(trx, input.workoutId, position);
    await trx
      .insertInto("session_exercises")
      .values({
        id: input.id,
        workout_session_id: input.workoutId,
        exercise_id: input.values.exerciseId,
        client_mutation_id: input.values.clientMutationId,
        position
      })
      .execute();

    return {
      ok: true,
      replayed: false,
      value: await findSessionExerciseByIdOrThrow(trx, input.id)
    };
  });
}

export async function reorderSessionExercisesWrite(
  db: Kysely<AppDatabase>,
  userId: string,
  workoutId: string,
  items: { sessionExerciseId: string; position: number }[],
  updatedAt: Date
): Promise<MutationWriteResult<{ sessionExerciseId: string; position: number }[]>> {
  return db.transaction().execute(async (trx) => {
    if (!(await lockOwnedWorkout(trx, userId, workoutId))) {
      return { ok: false, reason: "not_found" };
    }

    const currentIds = await listActiveExerciseIds(trx, workoutId);
    const error = getReorderError(currentIds, items);
    if (error) {
      return { ok: false, reason: error };
    }

    const orderedItems = [...items].sort((left, right) => left.position - right.position);
    await moveExercisePositionsOutOfRange(trx, workoutId);

    for (const item of orderedItems) {
      await trx
        .updateTable("session_exercises")
        .set({ position: item.position, updated_at: updatedAt })
        .where("id", "=", item.sessionExerciseId)
        .where("workout_session_id", "=", workoutId)
        .where("deleted_at", "is", null)
        .execute();
    }

    return { ok: true, replayed: false, value: orderedItems };
  });
}

export async function deleteSessionExerciseWrite(
  db: Kysely<AppDatabase>,
  userId: string,
  workoutId: string,
  sessionExerciseId: string,
  deletedAt: Date
): Promise<MutationWriteResult<{ deleted: true }>> {
  return db.transaction().execute(async (trx) => {
    if (!(await lockOwnedWorkout(trx, userId, workoutId))) {
      return { ok: false, reason: "not_found" };
    }

    const result = await trx
      .updateTable("session_exercises")
      .set({ deleted_at: deletedAt, updated_at: deletedAt })
      .where("id", "=", sessionExerciseId)
      .where("workout_session_id", "=", workoutId)
      .where("deleted_at", "is", null)
      .executeTakeFirst();

    if (Number(result.numUpdatedRows) === 0) {
      return { ok: false, reason: "not_found" };
    }

    await trx
      .updateTable("sets")
      .set({ deleted_at: deletedAt, updated_at: deletedAt })
      .where("session_exercise_id", "=", sessionExerciseId)
      .where("deleted_at", "is", null)
      .execute();
    await compactExercisePositions(trx, workoutId, deletedAt);

    return { ok: true, replayed: false, value: { deleted: true } };
  });
}

async function findExerciseReplay(
  db: Kysely<AppDatabase>,
  workoutId: string,
  clientMutationId: string
) {
  return db
    .selectFrom("session_exercises")
    .select(["id", "exercise_id as exerciseId", "deleted_at as deletedAt"])
    .where("workout_session_id", "=", workoutId)
    .where("client_mutation_id", "=", clientMutationId)
    .executeTakeFirst();
}

function exerciseReplayMatches(
  replay: { exerciseId: string; deletedAt: Date | null },
  input: AddSessionExerciseRequest
): boolean {
  return (
    replay.deletedAt === null &&
    replay.exerciseId === input.exerciseId
  );
}

async function listActiveExerciseIds(
  db: Kysely<AppDatabase>,
  workoutId: string
): Promise<string[]> {
  const rows = await db
    .selectFrom("session_exercises")
    .select("id")
    .where("workout_session_id", "=", workoutId)
    .where("deleted_at", "is", null)
    .orderBy("position", "asc")
    .execute();

  return rows.map((row) => row.id);
}

function getReorderError(
  currentIds: string[],
  items: { sessionExerciseId: string; position: number }[]
): "invalid_order" | "not_found" | null {
  if (items.length !== currentIds.length) return "invalid_order";

  const expectedIds = new Set(currentIds);
  const seenIds = new Set<string>();
  const seenPositions = new Set<number>();

  for (const item of items) {
    if (!expectedIds.has(item.sessionExerciseId)) return "not_found";
    seenIds.add(item.sessionExerciseId);
    seenPositions.add(item.position);
  }

  if (seenIds.size !== expectedIds.size || seenPositions.size !== currentIds.length) {
    return "invalid_order";
  }

  return [...seenPositions].every((position) => position >= 1 && position <= currentIds.length)
    ? null
    : "invalid_order";
}

async function moveExercisePositionsOutOfRange(
  db: Kysely<AppDatabase>,
  workoutId: string
): Promise<void> {
  await db
    .updateTable("session_exercises")
    .set({ position: sql<number>`position + 10000` })
    .where("workout_session_id", "=", workoutId)
    .where("deleted_at", "is", null)
    .execute();
}
