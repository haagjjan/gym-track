"use client";

import { useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "../../shared/api/client";
import { Button } from "../../shared/ui/button";
import { ConfirmDialog } from "../../shared/ui/confirm-dialog";
import { availableProviders, providerErrorMessage, providerName, providerSignIn, type Provider } from "../auth/provider-sign-in";
import { Group, Row, Section } from "./settings-ui";

type Identity = { provider: Provider; created_at: string };

export function SignInMethodsPanel(): ReactNode {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [identities, setIdentities] = useState<Identity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [disconnect, setDisconnect] = useState<Provider | null>(null);

  async function load(): Promise<void> {
    setError(null);
    try {
      const result = await apiFetch<{ identities: Identity[] }>("/api/users/me/identities");
      setIdentities(result.identities);
    } catch (error) { setError(providerErrorMessage(error, "google")); }
  }

  useEffect(() => {
    const available = availableProviders();
    setProviders(available);
    if (available.length > 0) void load();
  }, []);

  async function connect(provider: Provider): Promise<void> {
    if (pending) return;
    setPending(true);
    setError(null);
    const outcome = await providerSignIn(provider, { connect: true });
    if (outcome.status === "error") setError(outcome.message);
    if (outcome.status === "connected") await load();
    setPending(false);
  }

  async function unlink(): Promise<void> {
    if (!disconnect || pending) return;
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/users/me/identities/${disconnect}`, { method: "DELETE" });
      await load();
    } catch (error) { setError(providerErrorMessage(error, disconnect)); }
    setDisconnect(null);
    setPending(false);
  }

  if (providers.length === 0) return null;
  // Keep an existing Apple connection visible after moving to Android; only
  // the providers available on this device can be connected here.
  const listed = [...new Set([...providers, ...(identities ?? []).map((identity) => identity.provider)])];
  return (
    <Section title="Sign-in methods">
      <Group>
        {!identities ? <Row><p className="text-body text-text-secondary" role="status">{error ? "Couldn't load sign-in methods." : "Loading sign-in methods…"}</p></Row> : listed.map((provider) => {
          const connected = identities.some((identity) => identity.provider === provider);
          return <Row className="flex items-center justify-between gap-3" key={provider}>
            <div><p className="text-body text-text">{providerName(provider)}</p><p className="text-footnote text-text-secondary">{connected ? "Connected" : "Not connected"}</p></div>
            <Button disabled={pending} onClick={() => connected ? setDisconnect(provider) : void connect(provider)} size="compact" variant="secondary">{connected ? "Disconnect" : "Connect"}</Button>
          </Row>;
        })}
      </Group>
      {error ? <div className="px-4"><p className="text-subhead text-danger" role="alert">{error}</p><Button disabled={pending} onClick={() => void load()} variant="plain">Try again</Button></div> : null}
      <ConfirmDialog confirmLabel="Disconnect" isOpen={disconnect !== null} isPending={pending} message={`Disconnect ${disconnect ? providerName(disconnect) : "this provider"} from your account?`} onCancel={() => { if (!pending) setDisconnect(null); }} onConfirm={() => void unlink()} pendingLabel="Disconnecting…" title="Disconnect sign-in method?" />
    </Section>
  );
}
