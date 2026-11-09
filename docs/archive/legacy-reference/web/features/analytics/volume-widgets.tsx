import Link from "next/link";
import type { ReactNode } from "react";
import {
  recoveryStatus,
  totalWorkingSets,
  volumeBand,
  volumeBandLabel,
  type VolumeMuscleTotal
} from "./volume-analytics";
import { VolumeEmptyState } from "./volume-empty-state";
import {
  handleVolumePointerLeave,
  handleVolumePointerMove
} from "./volume-pointer";

export function VolumeMetricDeck({
  activeMuscles,
  latestWeekSets,
  selected,
  totals,
  windowLabel
}: {
  activeMuscles: number;
  latestWeekSets: number;
  selected: VolumeMuscleTotal | null;
  totals: Map<string, VolumeMuscleTotal>;
  windowLabel: string;
}): ReactNode {
  return (
    <section className="volumeMetricDeck" aria-label="Volume summary">
      <VolumeMetric label="Window sets" value={totalWorkingSets(totals).toString()} detail={windowLabel} />
      <VolumeMetric label="Active muscles" value={activeMuscles.toString()} detail="Muscle groups with work." tone="green" />
      <VolumeMetric label="Latest week" value={latestWeekSets.toString()} detail="Current weekly total." tone="lavender" />
      <VolumeMetric
        label="Target average"
        value={selected ? selected.weeklyAverageSets.toFixed(1) : "0.0"}
        detail={selected?.muscleGroup.name ?? "No muscle selected."}
      />
    </section>
  );
}

export function VolumeLegend(): ReactNode {
  return (
    <div className="volumeLegend" aria-label="Volume legend">
      <LegendItem band="high" label="High" detail="12+ avg sets" />
      <LegendItem band="active" label="Active" detail="6-11 avg sets" />
      <LegendItem band="maintenance" label="Maintenance" detail="1-5 avg sets" />
      <LegendItem band="none" label="No signal" detail="0 sets" />
    </div>
  );
}

export function VolumeIntelligencePanel({
  latestWeekSets,
  selected,
  windowLabel,
  windowTotalSets
}: {
  latestWeekSets: number;
  selected: VolumeMuscleTotal | null;
  windowLabel: string;
  windowTotalSets: number;
}): ReactNode {
  const band = volumeBand(selected?.weeklyAverageSets ?? 0);
  const recovery = recoveryStatus(selected);

  return (
    <aside
      className="volumeIntelPanel volumeReactive"
      onPointerLeave={handleVolumePointerLeave}
      onPointerMove={handleVolumePointerMove}
      aria-labelledby="volume-intel-title"
    >
      <div className="volumeSectionHeader">
        <div>
          <p className="eyebrow">Volume intelligence</p>
          <h2 id="volume-intel-title">{selected?.muscleGroup.name ?? "No muscle selected"}</h2>
        </div>
        <span data-band={band}>{volumeBandLabel(band)}</span>
      </div>

      <dl className="volumeIntelGrid">
        <IntelItem label="Target muscle" value={selected?.muscleGroup.name ?? "None"} />
        <IntelItem label="Working sets" value={(selected?.workingSets ?? 0).toString()} />
        <IntelItem label="Weekly average" value={(selected?.weeklyAverageSets ?? 0).toFixed(1)} />
        <IntelItem label="Latest week" value={(selected?.latestWeekSets ?? 0).toString()} />
        <IntelItem label="Scan window" value={windowLabel} />
        <IntelItem label="Window total" value={windowTotalSets.toString()} />
        <IntelItem label="Current week total" value={latestWeekSets.toString()} />
      </dl>

      <section className="volumeRecovery">
        <span>Recovery status</span>
        <strong>{recovery.label}</strong>
        <p>{recovery.detail}</p>
      </section>

      <VolumeExerciseList selected={selected} />
      <VolumeSessionList selected={selected} />
    </aside>
  );
}

function VolumeMetric({
  detail,
  label,
  tone = "cyan",
  value
}: {
  detail: string;
  label: string;
  tone?: "cyan" | "green" | "lavender";
  value: string;
}): ReactNode {
  return (
    <article
      className="volumeMetricCard volumeReactive"
      data-tone={tone}
      onPointerLeave={handleVolumePointerLeave}
      onPointerMove={handleVolumePointerMove}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function VolumeExerciseList({ selected }: { selected: VolumeMuscleTotal | null }): ReactNode {
  return (
    <section className="volumeIntelList">
      <h3>Contributing exercises</h3>
      {selected && selected.exercises.length > 0 ? (
        selected.exercises.map((exercise) => (
          <p key={exercise.id}>
            <span>{exercise.name}</span>
            <strong>{exercise.workingSets}</strong>
          </p>
        ))
      ) : (
        <VolumeEmptyState title="NO_EXERCISES" message="No exercises contributed in this window." />
      )}
    </section>
  );
}

function VolumeSessionList({ selected }: { selected: VolumeMuscleTotal | null }): ReactNode {
  return (
    <section className="volumeIntelList">
      <h3>Recent sessions</h3>
      {selected && selected.recentSessions.length > 0 ? (
        selected.recentSessions.map((session) => (
          <Link href={`/workouts/${session.workoutId}`} key={session.workoutId}>
            <span>{shortDate(session.sessionDate)}</span>
            <strong>{session.workingSets}</strong>
          </Link>
        ))
      ) : (
        <VolumeEmptyState title="NO_RECENT_SESSIONS" message="Recent sessions will appear after logged work." />
      )}
    </section>
  );
}

function LegendItem({
  band,
  detail,
  label
}: {
  band: string;
  detail: string;
  label: string;
}): ReactNode {
  return (
    <div data-band={band}>
      <span aria-hidden="true" />
      <strong>{label}</strong>
      <small>{detail}</small>
    </div>
  );
}

function IntelItem({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}
