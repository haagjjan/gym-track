"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../shared/ui/button";
import { ProviderConsent } from "./provider-consent";
import { availableProviders, providerName, providerSignIn, type Provider } from "./provider-sign-in";

export function ProviderButtons({ pending, setPending }: { pending: boolean; setPending: (value: boolean) => void }): ReactNode {
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [consent, setConsent] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setProviders(availableProviders()); }, []);

  async function signIn(provider: Provider, accepted = false): Promise<void> {
    if (pending) return;
    setPending(true);
    setError(null);
    const outcome = await providerSignIn(provider, { consent: accepted });
    setPending(false);
    if (outcome.status === "signed-in") { router.push("/"); router.refresh(); }
    if (outcome.status === "consent-required") setConsent(provider);
    if (outcome.status === "error") setError(outcome.message);
  }

  if (providers.length === 0) return null;
  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-3 text-subhead text-text-secondary"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
      {providers.map((provider) => (
        provider === "apple" ? (
          <button className="flex min-h-[3.125rem] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-white px-5 text-headline text-black active:opacity-70 disabled:opacity-50" disabled={pending} key={provider} onClick={() => void signIn(provider)} type="button">
            <AppleLogo /> Continue with Apple
          </button>
        ) : <Button className="w-full" disabled={pending} key={provider} onClick={() => void signIn(provider)} variant="secondary">Continue with {providerName(provider)}</Button>
      ))}
      {error && !consent ? <p className="text-subhead text-danger" role="alert">{error}</p> : null}
      {consent ? <ProviderConsent error={error} onClose={() => { if (!pending) { setConsent(null); setError(null); } }} onConfirm={() => void signIn(consent, true)} pending={pending} /> : null}
    </div>
  );
}

function AppleLogo(): ReactNode {
  return <svg aria-hidden="true" className="size-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 12.54c.03 3.17 2.78 4.22 2.81 4.24-.02.07-.44 1.51-1.45 3-.88 1.29-1.79 2.58-3.23 2.61-1.41.03-1.87-.84-3.48-.84-1.6 0-2.11.81-3.44.87-1.39.05-2.44-1.39-3.32-2.67-1.8-2.62-3.18-7.4-1.33-10.63.92-1.6 2.57-2.61 4.36-2.64 1.36-.03 2.65.92 3.48.92.84 0 2.4-1.14 4.04-.97.69.03 2.62.28 3.86 2.1-.1.06-2.31 1.35-2.3 4.01ZM14.4 4.67c.73-.89 1.22-2.12 1.09-3.35-1.05.04-2.32.7-3.07 1.59-.67.78-1.26 2.03-1.1 3.23 1.17.09 2.36-.6 3.08-1.47Z" /></svg>;
}
