import Link from "next/link";
import type { ReactNode } from "react";
import type { AuthUser } from "../auth/auth-types";
import { StartSessionAction } from "../workouts/workout-entry-point";
import type { WorkoutSummary } from "../workouts/workout-types";
import {
  CockpitEmptyState,
  CockpitLoadingState,
  CockpitPanel
} from "../../shared/ui/cockpit";
import { formatDateTime, shortDate } from "./dashboard-data";
import type { PerformanceSignal, VolumeBar } from "./dashboard-types";

const controlItems = [
  { href: "/", label: "DASHBOARD", meta: "COMMAND" },
  { href: "#session-control", label: "WORKOUT", meta: "PRIMARY" },
  { href: "/workouts", label: "HISTORY", meta: "LOGS" },
  { href: "/weekly-volume", label: "VOLUME", meta: "LOAD" },
  { href: "/progress", label: "PROGRESSION", meta: "TREND" }
];

export function DashboardHero({
  openWorkout,
  user
}: {
  openWorkout: WorkoutSummary | null;
  user: AuthUser;
}): ReactNode {
  const sessionLabel = openWorkout ? "RESUME_SESSION" : "INITIATE_SESSION";

  return (
    <section className="dashboardHero">
      <div className="dashboardHero__copy">
        <p className="dashboardKicker">OPERATOR / PHYSIQUE_PLATFORM</p>
        <h1 id="dashboard-title">BODY_COCKPIT</h1>
        <p>
          Training telemetry, session control, and recent output for{" "}
          <strong>{user.username}</strong>.
        </p>
      </div>

      <div className="dashboardHero__telemetry">
        <span>{openWorkout ? "SESSION_OPEN" : "SESSION_READY"}</span>
        <strong>{openWorkout ? formatDateTime(openWorkout.startedAt) : "AWAITING_INPUT"}</strong>
      </div>

      <div className="dashboardPlatform" aria-hidden="true">
        <span className="dashboardPlatform__beam" />
        <span className="dashboardPlatform__operator">
          <span />
        </span>
        <span className="dashboardPlatform__ring" />
      </div>

      <div id="session-control" className="dashboardSessionControl">
        <div>
          <span>NEXT_ACTION</span>
          <p>{openWorkout ? "Open workout detected." : "No active workout in progress."}</p>
        </div>
        <StartSessionAction label={sessionLabel} pendingLabel="SYNCING" variant="cockpit" />
      </div>
    </section>
  );
}

export function PerformancePanel({
  isLoading,
  signals
}: {
  isLoading: boolean;
  signals: PerformanceSignal[];
}): ReactNode {
  return (
    <CockpitPanel className="dashboardPanel dashboardPerformance" eyebrow="PERFORMANCE" heading="SIGNAL_STACK">
      {isLoading ? (
        <CockpitLoadingState title="SCANNING_LOGS" message="Reading recent exercise output." />
      ) : signals.length > 0 ? (
        <div className="dashboardSignalList">
          {signals.map((signal) => (
            <Link key={signal.id} className="dashboardSignal" href="/progress">
              <span>{signal.name}</span>
              <strong>{signal.value}</strong>
              <small>{signal.detail}</small>
            </Link>
          ))}
        </div>
      ) : (
        <CockpitEmptyState
          title="NO_PERFORMANCE_SIGNAL"
          message="Log working sets to activate progression telemetry."
        />
      )}
    </CockpitPanel>
  );
}

export function ControlMenu(): ReactNode {
  return (
    <CockpitPanel className="dashboardPanel dashboardControlMenu" eyebrow="LEFT_MENU" heading="CONTROL_MENU">
      <div className="dashboardControlGrid">
        {controlItems.map((item) =>
          item.href.startsWith("#") ? (
            <a key={item.label} className="dashboardControlTile" href={item.href}>
              <span>{item.label}</span>
              <small>{item.meta}</small>
            </a>
          ) : (
            <Link key={item.label} className="dashboardControlTile" href={item.href}>
              <span>{item.label}</span>
              <small>{item.meta}</small>
            </Link>
          )
        )}
      </div>
    </CockpitPanel>
  );
}

export function RecentLogsPanel({
  isLoading,
  workouts
}: {
  isLoading: boolean;
  workouts: WorkoutSummary[];
}): ReactNode {
  return (
    <CockpitPanel className="dashboardPanel dashboardRecentLogs" eyebrow="RECENT_LOGS" heading="SESSION_PREVIEW">
      {isLoading ? (
        <CockpitLoadingState title="LOADING_SESSIONS" message="Checking recent training logs." />
      ) : workouts.length > 0 ? (
        <div className="dashboardLogs">
          {workouts.map((workout) => (
            <Link key={workout.id} className="dashboardLog" href={`/workouts/${workout.id}`}>
              <span>{workout.title ?? `SESSION_${shortDate(workout.startedAt)}`}</span>
              <strong>{workout.totalSets} SETS</strong>
              <small>{workout.totalExercises} exercises / {shortDate(workout.startedAt)}</small>
            </Link>
          ))}
        </div>
      ) : (
        <CockpitEmptyState title="NO_RECENT_LOGS" message="Complete a workout to populate this strip." />
      )}
    </CockpitPanel>
  );
}

export function WeeklyVolumePanel({
  isLoading,
  volumeBars
}: {
  isLoading: boolean;
  volumeBars: VolumeBar[];
}): ReactNode {
  const maxSets = Math.max(...volumeBars.map((item) => item.workingSets), 1);

  return (
    <CockpitPanel className="dashboardPanel dashboardWeeklyVolume" eyebrow="WEEKLY_VOLUME" heading="LOAD_MAP">
      {isLoading ? (
        <CockpitLoadingState title="CALCULATING_LOAD" message="Reading current week volume." />
      ) : volumeBars.length > 0 ? (
        <div className="dashboardVolumeBars">
          {volumeBars.map((item) => (
            <div key={item.slug} className="dashboardVolumeBar">
              <span>{item.name}</span>
              <div>
                <i style={{ width: `${Math.max((item.workingSets / maxSets) * 100, 8)}%` }} />
              </div>
              <strong>{item.workingSets}</strong>
            </div>
          ))}
        </div>
      ) : (
        <CockpitEmptyState title="NO_WEEKLY_VOLUME" message="Working sets logged this week will appear here." />
      )}
    </CockpitPanel>
  );
}

export function SystemStatusPanel({
  activeWorkout,
  loggedSessions,
  user,
  weeklySets
}: {
  activeWorkout: WorkoutSummary | null;
  loggedSessions: number;
  user: AuthUser;
  weeklySets: number;
}): ReactNode {
  return (
    <CockpitPanel className="dashboardPanel dashboardSystemStatus" eyebrow="SYSTEM_STATUS" heading="OPERATOR_FEED">
      <dl className="dashboardStatusGrid">
        <div>
          <dt>OPERATOR_ID</dt>
          <dd>{user.username}</dd>
        </div>
        <div>
          <dt>ACTIVE_SESSION</dt>
          <dd>{activeWorkout ? "ONLINE" : "STANDBY"}</dd>
        </div>
        <div>
          <dt>WEEKLY_SETS</dt>
          <dd>{weeklySets}</dd>
        </div>
        <div>
          <dt>RECENT_SESSIONS</dt>
          <dd>{loggedSessions}</dd>
        </div>
      </dl>
      <p className="dashboardStatusNote">BIOMETRICS_NOT_CONFIGURED</p>
    </CockpitPanel>
  );
}
