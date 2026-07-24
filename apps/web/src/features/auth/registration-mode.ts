export type RegistrationMode = "ENABLED" | "DISABLED";
type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export function readRegistrationMode(
  source: EnvironmentSource = process.env
): RegistrationMode {
  const configured = source.REGISTRATION_MODE;

  if (configured === "ENABLED" || configured === "DISABLED") {
    return configured;
  }

  if (configured !== undefined) {
    throw new Error("REGISTRATION_MODE must be ENABLED or DISABLED.");
  }

  return source.NODE_ENV === "production" ? "DISABLED" : "ENABLED";
}

export function isRegistrationEnabled(source: EnvironmentSource = process.env): boolean {
  return readRegistrationMode(source) === "ENABLED";
}
