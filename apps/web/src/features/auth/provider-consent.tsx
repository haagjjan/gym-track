"use client";

import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { Button } from "../../shared/ui/button";
import { Sheet } from "../../shared/ui/sheet";

export function ProviderConsent({ pending, error, onClose, onConfirm }: {
  pending: boolean; error: string | null; onClose: () => void; onConfirm: () => void;
}): ReactNode {
  const titleId = useId();
  const [adult, setAdult] = useState(false);
  const [policies, setPolicies] = useState(false);
  return (
    <Sheet isOpen labelledBy={titleId} onClose={onClose} portal width="md">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title-3 text-text" id={titleId}>Create account</h2>
        <Button disabled={pending} onClick={onClose} variant="plain">Close</Button>
      </div>
      <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); if (adult && policies && !pending) onConfirm(); }}>
        <label className="flex min-h-11 items-start gap-3 py-2.5 text-subhead text-text-secondary">
          <input checked={adult} className="size-6 shrink-0 accent-[var(--accent)]" onChange={(event) => setAdult(event.target.checked)} required type="checkbox" />
          I&apos;m at least 18 and live in Switzerland.
        </label>
        <label className="flex min-h-11 items-start gap-3 py-2.5 text-subhead text-text-secondary">
          <input checked={policies} className="size-6 shrink-0 accent-[var(--accent)]" onChange={(event) => setPolicies(event.target.checked)} required type="checkbox" />
          <span>I accept the <Link className="text-accent underline" href="/terms">Terms</Link> and have read the <Link className="text-accent underline" href="/privacy">Privacy Notice</Link>.</span>
        </label>
        {error ? <p className="text-subhead text-danger" role="alert">{error}</p> : null}
        <Button className="w-full" disabled={pending || !adult || !policies} type="submit">{pending ? "Creating account…" : "Create account"}</Button>
      </form>
    </Sheet>
  );
}
