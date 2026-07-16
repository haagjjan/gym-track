import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClientDiagnosticsListener } from "./client-diagnostics-listener";
import "./styles.css";
import "../shared/ui/cockpit/cockpit-tokens.css";
import "../shared/ui/cockpit/cockpit.css";
import "../shared/ui/cockpit/cockpit-password.css";
import "../features/navigation/navigation.css";
import "../features/analytics/analytics.css";
import "../features/analytics/progress.css";
import "../features/analytics/progress-analysis.css";
import "../features/analytics/volume.css";
import "../features/analytics/volume-panels.css";
import "../features/analytics/volume-intelligence.css";
import "../features/auth/auth.css";
import "../features/dashboard/dashboard.css";
import "../features/dashboard/dashboard-panels.css";
import "../features/dashboard/home-body-visual.css";
import "../features/workouts/workout.css";
import "../features/workouts/workout-forms.css";
import "../features/workouts/workout-history.css";
import "../features/workouts/workout-start.css";

export const metadata: Metadata = {
  title: "Gym Progress Tracker",
  description: "Workout logging and progress tracking"
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="en">
      <body>
        <ClientDiagnosticsListener />
        {children}
      </body>
    </html>
  );
}
