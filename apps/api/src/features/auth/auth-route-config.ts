import type { EventTracker } from "../../shared/events.js";
import type { AuthService } from "./auth.service.js";

export interface AuthCookieOptions {
  name: string;
  secure: boolean;
  maxAgeSeconds: number;
}

export interface AuthRouteOptions {
  service: AuthService;
  cookie: AuthCookieOptions;
  events?: EventTracker;
  registrationMode?: "ENABLED" | "INVITE_ONLY" | "DISABLED";
  /** Backward-compatible test input. */
  registrationEnabled?: boolean;
}

export function registrationMode(options: AuthRouteOptions): "ENABLED" | "INVITE_ONLY" | "DISABLED" {
  return options.registrationMode ?? (options.registrationEnabled === false ? "DISABLED" : "ENABLED");
}

/** Strict per-route limits on credential and action-token endpoints. */
export const authRateLimit = {
  rateLimit: {
    max: 10,
    timeWindow: "15 minutes"
  }
};
