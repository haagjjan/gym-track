"use client";

import type { ReactNode } from "react";
import type { AuthUser } from "../auth/auth-types";
import { CockpitErrorState, CockpitScreenContainer } from "../../shared/ui/cockpit";
import {
  formatDateTime,
  useDashboardData,
  weeklyVolumeBars
} from "./dashboard-data";
import type { HomeStat } from "./dashboard-types";
import { HomeHeroStage } from "./home-hero-stage";
import { HomeSessionCta } from "./home-session-cta";
import { HomeStatsPanel } from "./home-stats-panel";

interface HomeDashboardProps {
  user: AuthUser;
}

export function HomeDashboard({ user }: HomeDashboardProps): ReactNode {
  const { data, error, isLoading } = useDashboardData();
  const activeWorkout = data.workouts.find((workout) => workout.isOpen) ?? null;
  const completedSessions = data.workouts.filter((workout) => !workout.isOpen);
  const volumeBars = weeklyVolumeBars(data.weeklyVolume);
  const homeTitle = activeWorkout ? "RESUME_SESSION" : "START_SESSION";
  const homeSummary = activeWorkout
    ? `An active workout opened ${formatDateTime(activeWorkout.startedAt)}. Step back in and continue logging.`
    : completedSessions.length > 0
      ? "No active workout detected. Start the next session and keep the training signal moving."
      : "Your home screen is ready. Start the first session to activate telemetry and history.";

  return (
    <CockpitScreenContainer className="homeDashboard" width="wide">
      <section className="homeDashboardScene" aria-labelledby="home-dashboard-title">
        <HomeHeroStage
          action={<HomeSessionCta activeWorkout={activeWorkout} />}
          leftPanel={
            <HomeStatsPanel
              anchor="left"
              emptyMessage="Choose three tracked lifts later to activate this panel."
              emptyTitle="PB_LIFTS_NOT_CONFIGURED"
              heading="PERFORMANCE_PB"
              items={personalBestPlaceholders}
            />
          }
          rightTopPanel={
            <HomeStatsPanel
              anchor="right"
              emptyMessage="Working sets logged this week will populate this load map."
              emptyTitle="NO_WEEKLY_VOLUME"
              heading="WEEKLY_VOLUME"
              isLoading={isLoading}
              volumeBars={volumeBars}
            />
          }
          rightBottomPanel={
            <HomeStatsPanel
              anchor="right"
              emptyMessage="Body metrics are not configured yet."
              emptyTitle="BIOMETRICS_NOT_CONFIGURED"
              heading="BIOMETRIC_DATA"
              items={biometricPlaceholders}
            />
          }
          statusLabel={activeWorkout ? "ACTIVE_SESSION" : "SYSTEM_READY"}
          statusValue={activeWorkout ? formatDateTime(activeWorkout.startedAt) : "AWAITING_INPUT"}
          summary={homeSummary}
          title={homeTitle}
          user={user}
        />
      </section>

      {error ? (
        <CockpitErrorState
          className="homeDashboardError"
          title="TELEMETRY_PARTIAL"
          message={error}
        />
      ) : null}
    </CockpitScreenContainer>
  );
}

const personalBestPlaceholders: HomeStat[] = [
  {
    detail: "Personal-best slot ready for a selected lift.",
    id: "benchpress",
    label: "BENCHPRESS",
    value: "NOT_SELECTED"
  },
  {
    detail: "Personal-best slot ready for a selected lift.",
    id: "squat",
    label: "SQUAT",
    value: "NOT_SELECTED"
  },
  {
    detail: "Personal-best slot ready for a selected lift.",
    id: "deadlift",
    label: "DEADLIFT",
    value: "NOT_SELECTED"
  }
];

const biometricPlaceholders: HomeStat[] = [
  {
    detail: "Body metrics are not connected yet.",
    id: "height",
    label: "HEIGHT",
    value: "NOT_CONFIGURED"
  },
  {
    detail: "Body metrics are not connected yet.",
    id: "weight",
    label: "WEIGHT",
    value: "NOT_CONFIGURED"
  },
  {
    detail: "Body metrics are not connected yet.",
    id: "bfp",
    label: "BFP",
    value: "NOT_CONFIGURED"
  },
  {
    detail: "Body metrics are not connected yet.",
    id: "ffmi",
    label: "FFMI",
    value: "NOT_CONFIGURED"
  }
];
