/** Build-time settings of the app bundle (see next.config.ts). */
export const appConfig = {
  apiOrigin: process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:4000",
  webOrigin: process.env.NEXT_PUBLIC_WEB_ORIGIN ?? "https://app.gymtrack.ch",
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
  extendedTracking: process.env.NEXT_PUBLIC_ENABLE_EXTENDED_TRACKING === "true",
  registrationEnabled: process.env.NEXT_PUBLIC_REGISTRATION_MODE !== "DISABLED",
  supportUrl: process.env.NEXT_PUBLIC_SUPPORT_URL || undefined
} as const;
