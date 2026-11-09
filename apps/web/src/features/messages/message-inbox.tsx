"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch } from "../../shared/api/client";
import { Skeleton } from "../../shared/ui/ui";

interface InboxMessage {
  id: string; title: string; body: string; actionUrl: string | null; essential: boolean;
  shownAt: string | null; dismissedAt: string | null; respondedAt: string | null;
}

export function MessageInbox(): ReactNode {
  const [items, setItems] = useState<InboxMessage[] | null>(null);
  useEffect(() => { void apiFetch<{ items: InboxMessage[] }>("/api/messages?inbox=true").then((result) => setItems(result.items)).catch(() => setItems([])); }, []);
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
          {message.actionUrl ? <a className="inline-flex min-h-11 items-center break-all text-body text-accent" href={message.actionUrl} rel="noreferrer" target="_blank">Open related link</a> : null}
        </li>
      ))}
    </ul>
  );
}
