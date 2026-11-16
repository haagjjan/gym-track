"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { ExternalLink } from "../../shared/ui/external-link";
import { ErrorState, Skeleton } from "../../shared/ui/ui";

interface InboxMessage {
  id: string; title: string; body: string; actionUrl: string | null; essential: boolean;
  shownAt: string | null; dismissedAt: string | null; respondedAt: string | null;
}

export function MessageInbox(): ReactNode {
  const [items, setItems] = useState<InboxMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setItems(null);
    void apiFetch<{ items: InboxMessage[] }>("/api/messages?inbox=true")
      .then((result) => setItems(result.items))
      .catch((caught: unknown) => setError(errorMessage(caught, "Couldn't load messages. Check your connection and try again.")));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ErrorState message={error} retry={load} />;
  if (items === null) return <Skeleton className="h-24 rounded-[var(--radius-card)]" />;
  if (items.length === 0) return <p className="text-body text-text-secondary">No messages yet. Notes from the team will show up here.</p>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">
      {items.map((message) => (
        <li className="px-4 py-3" key={message.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {message.essential ? <p className="text-footnote text-warning">Service notice</p> : null}
              <h2 className="break-words text-headline text-text">{message.title}</h2>
            </div>
            <span className="shrink-0 text-footnote text-text-secondary">{message.respondedAt ? "Answered" : message.dismissedAt ? "Dismissed" : message.shownAt ? "Seen" : "New"}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-subhead text-text-secondary">{message.body}</p>
          {message.actionUrl ? <ExternalLink className="inline-flex min-h-11 items-center break-all text-body text-accent" href={message.actionUrl}>Open related link</ExternalLink> : null}
        </li>
      ))}
    </ul>
  );
}
