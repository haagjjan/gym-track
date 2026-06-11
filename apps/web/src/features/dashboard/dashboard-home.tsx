"use client";

import type { ReactNode } from "react";
import type { AuthUser } from "../auth/auth-types";
import { CockpitErrorState, CockpitScreenContainer } from "../../shared/ui/cockpit";
import {
  performanceFromData,
  useDashboardData,
  weeklyVolumeBars
} from "./dashboard-data";
import {
  ControlMenu,
  DashboardHero,
  PerformancePanel,
  RecentLogsPanel,
  SystemStatusPanel,
  WeeklyVolumePanel
} from "./dashboard-panels";

interface DashboardHomeProps {
  user: AuthUser;
}

export function DashboardHome({ user }: DashboardHomeProps): ReactNode {
  const { data, error, isLoading } = useDashboardData();
  const openWorkout = data.workouts.find((workout) => workout.isOpen) ?? null;
  const closedWorkouts = data.workouts.filter((workout) => !workout.isOpen).slice(0, 3);
  const performanceSignals = performanceFromData(
    data.completedExercises,
    data.exerciseSummaries
  );
  const volumeBars = weeklyVolumeBars(data.weeklyVolume);
  const weeklySets = volumeBars.reduce((total, item) => total + item.workingSets, 0);

  return (
    <CockpitScreenContainer className="dashboardCockpit" width="wide">
      <section className="dashboardMatrix" aria-labelledby="dashboard-title">
        <aside className="dashboardStack" aria-label="Dashboard signal panels">
          <PerformancePanel isLoading={isLoading} signals={performanceSignals} />
          <ControlMenu />
        </aside>

        <div className="dashboardCenter">
          <DashboardHero openWorkout={openWorkout} user={user} />
          <RecentLogsPanel isLoading={isLoading} workouts={closedWorkouts} />
        </div>

        <aside className="dashboardStack" aria-label="Dashboard volume panels">
          <WeeklyVolumePanel isLoading={isLoading} volumeBars={volumeBars} />
          <SystemStatusPanel
            activeWorkout={openWorkout}
            loggedSessions={data.workouts.length}
            user={user}
            weeklySets={weeklySets}
          />
        </aside>
      </section>

      {error ? (
        <CockpitErrorState
          className="dashboardError"
          title="TELEMETRY_PARTIAL"
          message={error}
        />
      ) : null}
    </CockpitScreenContainer>
  );
}
