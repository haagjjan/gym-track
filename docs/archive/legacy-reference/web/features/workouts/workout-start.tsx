"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CockpitButton,
  CockpitEmptyState,
  CockpitErrorState,
  CockpitLoadingState,
  CockpitMetricCard,
  CockpitPanel,
  CockpitScreenContainer,
  CockpitSearchInput
} from "../../shared/ui/cockpit";
import {
  addSessionExercise,
  createWorkout,
  getWorkout,
  listWorkouts
} from "./workout-api";
import type { WorkoutDetail, WorkoutSummary } from "./workout-types";
import { formatStartedAt, sortWorkout } from "./workout-view-model";

interface WorkoutRecord {
  detail: WorkoutDetail | null;
  summary: WorkoutSummary;
}

type PendingAction = "empty" | `reuse:${string}` | null;

const protocolGroups = [
  {
    accent: "cyan",
    description: "Chest, shoulders, and triceps bias. Saved push protocols will appear here.",
    id: "frontal",
    label: "FRONTAL_ASSAULT_PROTOCOLS",
    status: "PUSH / FRONTAL"
  },
  {
    accent: "lavender",
    description: "Back, rear delts, and biceps bias. Saved pull protocols will appear here.",
    id: "rear",
    label: "REAR_GUARD_PROTOCOLS",
    status: "PULL / REAR GUARD"
  },
  {
    accent: "green",
    description: "Legs and lower-body foundation. Saved lower protocols will appear here.",
    id: "foundation",
    label: "FOUNDATION_PROTOCOLS",
    status: "LEGS / FOUNDATION"
  },
  {
    accent: "red",
    description: "Free-form mission builder. Launch an empty session and build as you train.",
    id: "custom",
    label: "CUSTOM_MISSION_BUILDER",
    status: "CUSTOM"
  }
] as const;

export function WorkoutStart(): ReactNode {
  const router = useRouter();
  const [records, setRecords] = useState<WorkoutRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [partialWorkoutId, setPartialWorkoutId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const loadWorkouts = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setError(null);
    setPartialWorkoutId(null);
    setIsLoading(true);

    const listOptions = signal
      ? { limit: 8, offset: 0, signal }
      : { limit: 8, offset: 0 };
    const result = await listWorkouts(listOptions).catch(() => null);

    if (signal?.aborted) {
      return;
    }

    if (!result || !result.ok) {
      setError(result?.message ?? "Workout launch data could not be loaded.");
      setRecords([]);
      setIsLoading(false);
      return;
    }

    const items = result.data.items;
    const active = items.find((workout) => workout.isOpen) ?? null;
    const completed = items.filter((workout) => !workout.isOpen).slice(0, 5);
    const detailTargets = active ? [active, ...completed] : completed;
    const details = await Promise.all(
      detailTargets.map((workout) => getWorkout(workout.id, signal).catch(() => null))
    );

    if (signal?.aborted) {
      return;
    }

    const detailsById = new Map<string, WorkoutDetail>();

    details.forEach((detailResult) => {
      if (detailResult?.ok) {
        detailsById.set(detailResult.data.workout.id, sortWorkout(detailResult.data.workout));
      }
    });

    setRecords(
      items.map((summary) => ({
        detail: detailsById.get(summary.id) ?? null,
        summary
      }))
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void loadWorkouts(controller.signal);

    return () => controller.abort();
  }, [loadWorkouts]);

  const activeRecord = records.find((record) => record.summary.isOpen) ?? null;
  const completedRecords = records.filter((record) => !record.summary.isOpen).slice(0, 5);
  const filteredProtocols = useMemo(
    () => protocolGroups.filter((group) => matchesQuery(query, [
      group.label,
      group.status,
      group.description
    ])),
    [query]
  );
  const filteredCompleted = useMemo(
    () => completedRecords.filter((record) => matchesQuery(query, [
      workoutTitle(record),
      record.summary.workoutType ?? "",
      formatStartedAt(record.summary.startedAt),
      ...exerciseNames(record)
    ])),
    [completedRecords, query]
  );
  const hasQuery = query.trim().length > 0;

  async function handleStartEmpty(): Promise<void> {
    if (activeRecord) {
      router.push(`/workouts/${activeRecord.summary.id}`);
      return;
    }

    setPendingAction("empty");
    setError(null);
    setPartialWorkoutId(null);

    const created = await createWorkout().catch(() => null);

    if (!created) {
      setError("Empty session could not be started.");
      setPendingAction(null);
      return;
    }

    if (!created.ok) {
      await handleCreateFailure(created.code, created.message);
      setPendingAction(null);
      return;
    }

    router.push(`/workouts/${created.data.workout.id}`);
  }

  async function handleReuse(record: WorkoutRecord): Promise<void> {
    if (activeRecord) {
      router.push(`/workouts/${activeRecord.summary.id}`);
      return;
    }

    setPendingAction(`reuse:${record.summary.id}`);
    setError(null);
    setPartialWorkoutId(null);

    const sourceResult = await getWorkout(record.summary.id).catch(() => null);

    if (!sourceResult || !sourceResult.ok) {
      setError(sourceResult?.message ?? "Previous session structure could not be loaded.");
      setPendingAction(null);
      return;
    }

    const created = await createWorkout().catch(() => null);

    if (!created) {
      setError("Reusable session could not be started.");
      setPendingAction(null);
      return;
    }

    if (!created.ok) {
      await handleCreateFailure(created.code, created.message);
      setPendingAction(null);
      return;
    }

    const newWorkoutId = created.data.workout.id;
    const sourceWorkout = sortWorkout(sourceResult.data.workout);

    for (const item of sourceWorkout.exercises) {
      const added = await addSessionExercise(newWorkoutId, item.exercise.id).catch(() => null);

      if (!added || !added.ok) {
        setPartialWorkoutId(newWorkoutId);
        setError(
          added?.message ??
          "Session was created, but not every previous exercise could be copied."
        );
        setPendingAction(null);
        return;
      }
    }

    router.push(`/workouts/${newWorkoutId}`);
  }

  async function handleCreateFailure(code: string | undefined, message: string): Promise<void> {
    if (code === "OPEN_WORKOUT_EXISTS") {
      const refreshed = await listWorkouts({ limit: 8, offset: 0 }).catch(() => null);
      const openWorkout = refreshed?.ok
        ? refreshed.data.items.find((workout) => workout.isOpen)
        : null;

      if (openWorkout) {
        router.push(`/workouts/${openWorkout.id}`);
        return;
      }
    }

    setError(message);
  }

  return (
    <CockpitScreenContainer className="workoutStart" width="wide">
      <header className="workoutStartHero">
        <div>
          <p className="workoutStartHero__eyebrow">INITIALIZING_MISSION_PARAMETERS</p>
          <h1>
            <span>SELECT_OPERATION</span>
            <span>_ARCHETYPE</span>
          </h1>
          <p className="workoutStartHero__copy">
            Resume the live mission, launch empty, or clone a recent structure without
            turning workouts into a template system.
          </p>
        </div>
        <div className="workoutStartHero__tools">
          <CockpitSearchInput
            id="workout-start-search"
            label="SCAN_DATABASE"
            name="workoutStartSearch"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search protocols or sessions"
            value={query}
          />
          <CockpitButton
            disabled={Boolean(activeRecord)}
            isLoading={pendingAction === "empty"}
            loadingLabel="LAUNCHING"
            onClick={() => void handleStartEmpty()}
            title={
              activeRecord
                ? "Complete or resume the active session before launching another."
                : undefined
            }
          >
            START_EMPTY_SESSION
          </CockpitButton>
        </div>
      </header>

      {error ? (
        <CockpitErrorState
          title="MISSION_START_ERROR"
          message={error}
          action={
            partialWorkoutId ? (
              <Link className="workoutStartLinkButton" href={`/workouts/${partialWorkoutId}`}>
                OPEN_PARTIAL_SESSION
              </Link>
            ) : null
          }
        />
      ) : null}

      {isLoading ? (
        <CockpitLoadingState
          title="READING_MISSION_DATA"
          message="Scanning active and completed workout sessions."
        />
      ) : (
        <>
          <ResumeMissionPanel
            activeRecord={activeRecord}
            onStartEmpty={handleStartEmpty}
            pendingAction={pendingAction}
          />
          <section className="workoutStartLayout" aria-label="Workout start options">
            <CockpitPanel
              className="workoutProtocolPanel"
              eyebrow="CUSTOM_MISSION_BUILDER"
              heading="Protocol groups"
            >
              {filteredProtocols.length > 0 ? (
                <div className="workoutProtocolList">
                  {filteredProtocols.map((group) => (
                    <article
                      className="workoutProtocolRow"
                      data-workout-accent={group.accent}
                      key={group.id}
                    >
                      <div>
                        <span className="workoutProtocolRow__signal" aria-hidden="true" />
                        <h2>{group.label}</h2>
                        <p>{group.description}</p>
                      </div>
                      <strong>{group.status}</strong>
                      <span>NO_SAVED_PROTOCOLS</span>
                    </article>
                  ))}
                </div>
              ) : (
                <CockpitEmptyState
                  title="NO_PROTOCOL_GROUP_MATCH"
                  message="Adjust the scan query to show protocol groups."
                />
              )}
            </CockpitPanel>

            <CockpitPanel
              className="workoutPreviousPanel"
              accent="green"
              eyebrow="PREVIOUS_PROTOCOLS"
              heading="Reuse recent sessions"
            >
              {filteredCompleted.length > 0 ? (
                <div className="workoutPreviousList">
                  {filteredCompleted.map((record) => (
                    <PreviousProtocolCard
                      activeRecord={activeRecord}
                      isPending={pendingAction === `reuse:${record.summary.id}`}
                      key={record.summary.id}
                      record={record}
                      onReuse={handleReuse}
                    />
                  ))}
                </div>
              ) : (
                <CockpitEmptyState
                  title={hasQuery ? "NO_SESSION_MATCH" : "NO_PREVIOUS_PROTOCOLS"}
                  message={
                    hasQuery
                      ? "No completed sessions match the current scan."
                      : "Completed sessions will become reusable structures here."
                  }
                />
              )}
            </CockpitPanel>
          </section>
        </>
      )}
    </CockpitScreenContainer>
  );
}

function ResumeMissionPanel({
  activeRecord,
  onStartEmpty,
  pendingAction
}: {
  activeRecord: WorkoutRecord | null;
  onStartEmpty: () => Promise<void>;
  pendingAction: PendingAction;
}): ReactNode {
  if (!activeRecord) {
    return (
      <CockpitPanel
        className="workoutResumePanel workoutResumePanel--empty"
        accent="lavender"
        eyebrow="IMMEDIATE_REDEPLOYMENT"
        heading="No active mission detected"
      >
        <p>
          Launch an empty session now, then add exercises from the active workout screen.
        </p>
        <CockpitButton
          isLoading={pendingAction === "empty"}
          loadingLabel="LAUNCHING"
          onClick={() => void onStartEmpty()}
        >
          START_EMPTY_SESSION
        </CockpitButton>
      </CockpitPanel>
    );
  }

  const names = exerciseNames(activeRecord);

  return (
    <section className="workoutResumePanel" aria-labelledby="workout-resume-title">
      <div className="workoutResumePanel__body">
        <p className="workoutResumePanel__eyebrow">IMMEDIATE_REDEPLOYMENT</p>
        <h2 id="workout-resume-title">RESUME: {workoutTitle(activeRecord)}</h2>
        <div className="workoutStartChips">
          {names.length > 0 ? (
            names.slice(0, 4).map((name) => <span key={name}>{cockpitLabel(name)}</span>)
          ) : (
            <span>EMPTY_MISSION</span>
          )}
          {names.length > 4 ? <span>+{names.length - 4}_MORE</span> : null}
        </div>
      </div>
      <div className="workoutResumePanel__metrics">
        <CockpitMetricCard
          label="EST_COMBAT_TIME"
          value={formatDuration(activeRecord.summary.startedAt, activeRecord.summary.endedAt)}
          detail={formatStartedAt(activeRecord.summary.startedAt)}
        />
        <Link className="workoutResumePanel__launch" href={`/workouts/${activeRecord.summary.id}`}>
          CONTINUE
        </Link>
      </div>
    </section>
  );
}

function PreviousProtocolCard({
  activeRecord,
  isPending,
  onReuse,
  record
}: {
  activeRecord: WorkoutRecord | null;
  isPending: boolean;
  onReuse: (record: WorkoutRecord) => Promise<void>;
  record: WorkoutRecord;
}): ReactNode {
  const names = exerciseNames(record);
  const isBlockedByActive = Boolean(activeRecord);

  return (
    <article className="workoutPreviousCard">
      <div className="workoutPreviousCard__main">
        <p>{formatStartedAt(record.summary.startedAt)}</p>
        <h2>{workoutTitle(record)}</h2>
        <div className="workoutStartChips">
          {names.length > 0 ? (
            names.slice(0, 3).map((name) => <span key={name}>{cockpitLabel(name)}</span>)
          ) : (
            <span>NO_EXERCISES</span>
          )}
          {names.length > 3 ? <span>+{names.length - 3}_MORE</span> : null}
        </div>
      </div>
      <dl className="workoutPreviousCard__stats">
        <div>
          <dt>Exercises</dt>
          <dd>{record.summary.totalExercises}</dd>
        </div>
        <div>
          <dt>Sets</dt>
          <dd>{record.summary.totalSets}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{formatDuration(record.summary.startedAt, record.summary.endedAt)}</dd>
        </div>
      </dl>
      <CockpitButton
        disabled={isBlockedByActive}
        isLoading={isPending}
        loadingLabel="CLONING"
        onClick={() => void onReuse(record)}
        variant="secondary"
      >
        {isBlockedByActive ? "RESUME_ACTIVE_FIRST" : "REUSE_STRUCTURE"}
      </CockpitButton>
    </article>
  );
}

function exerciseNames(record: WorkoutRecord): string[] {
  return record.detail?.exercises.map((item) => item.exercise.name) ?? [];
}

function workoutTitle(record: WorkoutRecord): string {
  return record.summary.title ?? `SESSION_${formatShortDate(record.summary.startedAt)}`;
}

function matchesQuery(query: string, values: string[]): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return true;
  }

  return values.some((value) => value.toLowerCase().includes(normalizedQuery));
}

function cockpitLabel(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short"
  }).format(new Date(value)).replace(/\s+/g, "_").toUpperCase();
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  const end = endedAt ? new Date(endedAt) : new Date();
  const minutes = Math.max(
    0,
    Math.round((end.getTime() - new Date(startedAt).getTime()) / 60000)
  );

  if (minutes < 60) {
    return `${minutes}M`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder > 0 ? `${hours}H_${remainder}M` : `${hours}H`;
}
