import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { QueryProvider } from "../shared/query-provider";
import { ClientDiagnosticsListener } from "./client-diagnostics-listener";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains"
});

export const metadata: Metadata = {
  title: {
    default: "Gym Progress Tracker",
    template: "%s | Gym Progress Tracker"
  },
  description: "Workout logging and progress tracking"
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
      <body>
        <ClientDiagnosticsListener />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
