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
}

/** Strict per-route limits on credential and action-token endpoints. */
export const authRateLimit = {
  rateLimit: {
    max: 10,
    timeWindow: "15 minutes"
  }
};
