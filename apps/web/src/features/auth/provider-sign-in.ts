import { ApiError, apiFetch } from "../../shared/api/client";
import { getNativeBridge, type NativeBridge } from "../../shared/platform/native";
import { isAppRuntime } from "../../shared/platform/runtime";
import { PUBLIC_PRIVACY_VERSION, PUBLIC_TERMS_VERSION } from "../../shared/public-policy";

export type Provider = "apple" | "google";
export const providerName = (provider: Provider): string => provider === "apple" ? "Apple" : "Google";

export function availableProviders(bridge = getNativeBridge()): Provider[] {
  if (!isAppRuntime() || process.env.NEXT_PUBLIC_ENABLE_PROVIDER_SIGN_IN !== "true") return [];
  const platform = bridge?.platform();
  return platform === "ios" ? ["apple", "google"] : platform === "android" ? ["google"] : [];
}

export type ProviderOutcome =
  | { status: "signed-in" | "connected" | "cancelled" | "consent-required" }
  | { status: "error"; message: string };

export function providerErrorMessage(error: unknown, provider: Provider): string {
  if (error instanceof ApiError && error.code === "PROVIDER_LINK_REQUIRES_SIGN_IN") {
    return `An account with this email already exists. Sign in with your password, then connect ${providerName(provider)} in Settings.`;
  }
  if (error instanceof ApiError && error.code === "LAST_SIGN_IN_METHOD") {
    return "Set a password first, so you can still sign in.";
  }
  return error instanceof Error ? error.message : "Couldn't sign in. Try again.";
}

/** Each attempt, including consent completion and linking, gets fresh credentials. */
export async function providerSignIn(
  provider: Provider,
  options: { consent?: boolean; connect?: boolean } = {},
  bridge: NativeBridge | null = getNativeBridge()
): Promise<ProviderOutcome> {
  if (!bridge || !availableProviders(bridge).includes(provider)) return { status: "cancelled" };
  try {
    const { nonce } = await apiFetch<{ nonce: string }>("/api/auth/provider/nonce", { method: "POST" });
    const credentials = await bridge.providerSignIn(provider, nonce);
    if (credentials === "cancelled") return { status: "cancelled" };
    const signup = options.consent ? {
      termsVersion: PUBLIC_TERMS_VERSION, privacyVersion: PUBLIC_PRIVACY_VERSION, adultAttested: true
    } : undefined;
    await apiFetch(options.connect ? "/api/users/me/identities" : "/api/auth/provider", {
      method: "POST", body: { provider, idToken: credentials.idToken, nonce, ...(!options.connect && signup ? { signup } : {}) }
    });
    return { status: options.connect ? "connected" : "signed-in" };
  } catch (error) {
    if (!options.connect && error instanceof ApiError && error.code === "PROVIDER_SIGNUP_CONSENT_REQUIRED") {
      return { status: "consent-required" };
    }
    return { status: "error", message: providerErrorMessage(error, provider) };
  }
}
