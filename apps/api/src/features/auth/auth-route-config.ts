import type { FastifyRequest } from "fastify";
import { isMobileClient } from "./mobile-client.js";
import type { EventTracker } from "../../shared/events.js";
import type { AuthService } from "./auth.service.js";
import type { ProviderService } from "./provider.service.js";

export interface AuthCookieOptions {
  name: string;
  secure: boolean;
  maxAgeSeconds: number;
}

export interface AuthRouteOptions {
  providerService?: ProviderService;
  service: AuthService;
  cookie: AuthCookieOptions;
  events?: EventTracker;
  registrationMode?: "ENABLED" | "DISABLED";
  /** Backward-compatible test input. */
  registrationEnabled?: boolean;
}

export function registrationMode(options: AuthRouteOptions): "ENABLED" | "DISABLED" {
  return options.registrationMode ?? (options.registrationEnabled === false ? "DISABLED" : "ENABLED");
}

/** Strict per-route limits on credential and action-token endpoints. */
export const authRateLimit = {
  rateLimit: {
    max: (request: FastifyRequest) => isMobileClient(request) ? 60 : 10,
    timeWindow: "15 minutes"
  }
};
