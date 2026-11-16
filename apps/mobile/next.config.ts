import type { NextConfig } from "next";
import packageJson from "./package.json";

// Static bundle for the Capacitor shells (ADR 0024). No server runtime: every page is
// a client page and talks to apps/api directly.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  poweredByHeader: false,
  reactStrictMode: false,
  images: { unoptimized: true },
  experimental: { externalDir: true },
  env: {
    NEXT_PUBLIC_RUNTIME: "app",
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    // Origin of apps/api as the phone reaches it. Local default for emulators.
    NEXT_PUBLIC_API_ORIGIN: process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:4000",
    // Public web origin, for pages the app opens in the browser (legal, support).
    NEXT_PUBLIC_WEB_ORIGIN: process.env.NEXT_PUBLIC_WEB_ORIGIN ?? "https://app.gymtrack.ch",
    NEXT_PUBLIC_ENABLE_PROVIDER_SIGN_IN: process.env.NEXT_PUBLIC_ENABLE_PROVIDER_SIGN_IN ?? "false",
    NEXT_PUBLIC_ENABLE_EXTENDED_TRACKING: process.env.NEXT_PUBLIC_ENABLE_EXTENDED_TRACKING ?? "false",
    NEXT_PUBLIC_REGISTRATION_MODE: process.env.NEXT_PUBLIC_REGISTRATION_MODE ?? "ENABLED",
    NEXT_PUBLIC_SUPPORT_URL: process.env.NEXT_PUBLIC_SUPPORT_URL ?? ""
  }
};

export default nextConfig;
