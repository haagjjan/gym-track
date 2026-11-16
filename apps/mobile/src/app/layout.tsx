import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { NavigationTracker } from "../../../web/src/features/shell/app-history";
import { THEME_BACKGROUND, themeBootstrapScript } from "../../../web/src/features/shell/theme";
import { ExtendedTrackingProvider } from "../../../web/src/shared/extended-tracking";
import { appConfig } from "../config";
import { AppLinks } from "../native/app-links";
import { AndroidBack } from "../native/android-back";
import { AppQueryProvider } from "../offline/app-query-provider";
import { OutboxSync } from "../offline/outbox-sync";
import "./globals.css";

export const metadata: Metadata = { title: "GymTrack" };

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: THEME_BACKGROUND.dark },
    { media: "(prefers-color-scheme: light)", color: THEME_BACKGROUND.light }
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html data-theme="dark" lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <NavigationTracker />
        <AndroidBack />
        <AppLinks />
        <AppQueryProvider>
          <OutboxSync />
          <ExtendedTrackingProvider enabled={appConfig.extendedTracking}>{children}</ExtendedTrackingProvider>
        </AppQueryProvider>
      </body>
    </html>
  );
}
