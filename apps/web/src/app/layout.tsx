import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./styles.css";
import "../features/auth/auth.css";
import "../features/workouts/workout.css";
import "../features/workouts/workout-forms.css";
import "../features/workouts/workout-history.css";

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
      <body>{children}</body>
    </html>
  );
}
