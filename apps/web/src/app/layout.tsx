import { ExtendedTrackingProvider } from "../shared/extended-tracking";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { QueryProvider } from "../shared/query-provider";
import { NavigationTracker } from "../features/shell/app-history";
import { THEME_BACKGROUND, themeBootstrapScript } from "../features/shell/theme";
import { ClientDiagnosticsListener } from "../shared/client-diagnostics-listener";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GymTrack",
    template: "%s | GymTrack"
  },
  description: "Log your workouts, track every lift, and see how your training load spreads across your body."
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: THEME_BACKGROUND.dark },
    { media: "(prefers-color-scheme: light)", color: THEME_BACKGROUND.light }
  ],
  width: "device-width",
  initialScale: 1,
  // The app runs full screen inside Capacitor; fixed bars pad with env(safe-area-inset-*).
  viewportFit: "cover"
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html data-theme="dark" lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <ClientDiagnosticsListener />
        <NavigationTracker />
        <QueryProvider><ExtendedTrackingProvider enabled={process.env.ENABLE_EXTENDED_TRACKING === "true"}>{children}</ExtendedTrackingProvider></QueryProvider>
      </body>
    </html>
  );
}
