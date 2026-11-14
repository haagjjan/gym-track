import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { NavigationTracker } from "../../../web/src/features/shell/app-history";
import { THEME_BACKGROUND, themeBootstrapScript } from "../../../web/src/features/shell/theme";
import { ExtendedTrackingProvider } from "../../../web/src/shared/extended-tracking";
import { QueryProvider } from "../../../web/src/shared/query-provider";
import { appConfig } from "../config";
import { AndroidBack } from "../native/android-back";
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
        <QueryProvider>
          <ExtendedTrackingProvider enabled={appConfig.extendedTracking}>{children}</ExtendedTrackingProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
