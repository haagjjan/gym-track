"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { apiFetch } from "../../shared/api/client";

interface InboxMessage {
  id: string; title: string; body: string; actionUrl: string | null; essential: boolean;
  shownAt: string | null; dismissedAt: string | null; respondedAt: string | null;
}

export function MessageInbox(): ReactNode {
  const [items, setItems] = useState<InboxMessage[] | null>(null);
  useEffect(() => { void apiFetch<{ items: InboxMessage[] }>("/api/messages?inbox=true").then((result) => setItems(result.items)).catch(() => setItems([])); }, []);
  if (items === null) return <p className="text-sm text-outline">Loading messages…</p>;
  if (items.length === 0) return <p className="rounded border border-outline-dim/50 p-5 text-sm text-outline">You have no messages yet.</p>;
  return <div className="space-y-3">{items.map((message) => <article className="rounded border border-outline-dim/60 bg-surface p-4" key={message.id}><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1 basis-56"><p className={`label-caps ${message.essential ? "text-lavender" : "text-cyan"}`}>{message.essential ? "Service notice" : "Founding Beta"}</p><h2 className="mt-1 break-words font-display text-lg font-bold text-fg">{message.title}</h2></div><span className="shrink-0 text-[10px] uppercase text-outline">{message.respondedAt ? "Answered" : message.dismissedAt ? "Dismissed" : message.shownAt ? "Seen" : "New"}</span></div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-fg-muted">{message.body}</p>{message.actionUrl ? <a className="mt-2 inline-flex min-h-11 items-center break-all text-cyan underline" href={message.actionUrl} rel="noreferrer" target="_blank">Open related link ↗</a> : null}</article>)}</div>;
}
