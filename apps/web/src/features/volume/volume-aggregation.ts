import type { WeeklyVolumePayload } from "../../shared/api/types";

export interface MuscleAggregate {
  slug: string;
  name: string;
  totalSets: number;
  weeklyAvg: number;
  latestWeekSets: number;
  exercises: { id: string; name: string; sets: number }[];
  sessions: { workoutId: string; date: string; sets: number }[];
}

interface AggregateState {
  value: MuscleAggregate;
  exercisesById: Map<string, MuscleAggregate["exercises"][number]>;
  sessionIds: Set<string>;
}

export function aggregateVolume(
  payload: WeeklyVolumePayload | undefined,
  weeksCount: number
): Map<string, MuscleAggregate> {
  const states = new Map<string, AggregateState>();
  if (!payload) return new Map();

  const latestWeekStart = payload.weeks.reduce<string | null>(
    (latest, week) =>
      latest === null || week.weekStart > latest ? week.weekStart : latest,
    null
  );

  for (const week of payload.weeks) {
    for (const item of week.items) {
      const state = getAggregateState(states, item.muscleGroup.slug, item.muscleGroup.name);
      const aggregate = state.value;

      aggregate.totalSets += item.workingSets;
      if (week.weekStart === latestWeekStart) aggregate.latestWeekSets += item.workingSets;
      mergeExercises(state, item.exercises);
      mergeSessions(state, item.recentSessions);
    }
  }

  const aggregates = new Map<string, MuscleAggregate>();
  for (const state of states.values()) {
    const aggregate = state.value;
    aggregate.weeklyAvg = aggregate.totalSets / weeksCount;
    aggregate.exercises.sort((left, right) => right.sets - left.sets);
    aggregate.sessions.sort((left, right) => right.date.localeCompare(left.date));
    aggregates.set(aggregate.slug, aggregate);
  }

  return aggregates;
}

function getAggregateState(
  states: Map<string, AggregateState>,
  slug: string,
  name: string
): AggregateState {
  const existing = states.get(slug);
  if (existing) return existing;

  const state: AggregateState = {
    value: {
      slug,
      name,
      totalSets: 0,
      weeklyAvg: 0,
      latestWeekSets: 0,
      exercises: [],
      sessions: []
    },
    exercisesById: new Map(),
    sessionIds: new Set()
  };
  states.set(slug, state);
  return state;
}

function mergeExercises(
  state: AggregateState,
  exercises: Array<{ id: string; name: string; workingSets: number }>
): void {
  for (const exercise of exercises) {
    const existing = state.exercisesById.get(exercise.id);
    if (existing) existing.sets += exercise.workingSets;
    else {
      const entry = { id: exercise.id, name: exercise.name, sets: exercise.workingSets };
      state.value.exercises.push(entry);
      state.exercisesById.set(entry.id, entry);
    }
  }
}

function mergeSessions(
  state: AggregateState,
  sessions: Array<{ workoutId: string; sessionDate: string; workingSets: number }>
): void {
  for (const session of sessions) {
    if (state.sessionIds.has(session.workoutId)) continue;
    state.sessionIds.add(session.workoutId);
    state.value.sessions.push({
      workoutId: session.workoutId,
      date: session.sessionDate,
      sets: session.workingSets
    });
  }
}
