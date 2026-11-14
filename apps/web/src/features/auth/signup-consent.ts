/**
 * The signup form sets `noValidate`, so the browser never enforces the
 * `required` checkboxes. This check is the only gate before the request is
 * sent, and the request must only claim consent the user actually gave.
 */
export interface SignupConsent {
  adult: boolean;
  policies: boolean;
}

export function readSignupConsent(form: FormData): SignupConsent {
  return {
    adult: form.get("adult") === "on",
    policies: form.get("policies") === "on"
  };
}

export function signupConsentError(consent: SignupConsent): string | null {
  if (consent.adult && consent.policies) {
    return null;
  }

  if (!consent.adult && !consent.policies) {
    return "Confirm that you're at least 18 and live in Switzerland, and accept the Terms and Privacy Notice.";
  }

  return consent.adult
    ? "Accept the Terms and Privacy Notice to create an account."
    : "Confirm that you're at least 18 and live in Switzerland.";
}
