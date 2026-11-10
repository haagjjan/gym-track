"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
import { Button } from "../../shared/ui/button";
import { useModalBehavior } from "../../shared/ui/use-modal-behavior";

interface UserMessage {
  id: string;
  title: string;
  body: string;
  responseType: "ACKNOWLEDGEMENT" | "RATING" | "SINGLE_CHOICE" | "FREE_TEXT";
  responseOptions: string[];
  actionUrl: string | null;
  essential: boolean;
}

export function MessageCenter({ inline = false }: { inline?: boolean }): ReactNode {
  const [message, setMessage] = useState<UserMessage | null>(null);
  const [text, setText] = useState("");
  const [choice, setChoice] = useState("");
  const [rating, setRating] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await apiFetch<{ items: UserMessage[] }>("/api/messages").catch(() => ({ items: [] }));
    setMessage(result.items[0] ?? null);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function dismiss(): Promise<void> {
    if (!message) return;
    setBusy(true);
    try {
      await apiFetch(`/api/messages/${encodeURIComponent(message.id)}/dismiss`, { method: "POST", body: {} });
      setMessage(null);
      await load();
    } catch (caught) {
      setError(errorMessage(caught, "Couldn't dismiss the message. Check your connection and try again."));
    } finally { setBusy(false); }
  }

  async function respond(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!message) return;
    const response = buildResponse(message.responseType, { choice, rating, text });
    if (!response) { setError("Choose or enter a response first."); return; }
    setBusy(true);
    try {
      await apiFetch(`/api/messages/${encodeURIComponent(message.id)}/respond`, { method: "POST", body: response });
      setMessage(null); setText(""); setChoice(""); setRating(0); setError(null);
      await load();
    } catch (caught) {
      setError(errorMessage(caught, "Couldn't save your answer. Check your connection and try again."));
    } finally { setBusy(false); }
  }

  const dialogRef = useModalBehavior<HTMLDivElement>({
    isOpen: Boolean(message && !inline),
    onClose: () => { void dismiss(); }
  });

  if (!message) {
    return inline ? <p className="text-body text-text-secondary">You have no new messages.</p> : null;
  }

  const content = (
    <article className={inline ? "w-full rounded-[var(--radius-card)] bg-surface p-4" : "max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-[var(--radius-card)] bg-surface-raised px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:rounded-[var(--radius-card)] sm:pt-4"}>
      {inline ? null : <div aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-full bg-control-line sm:hidden" />}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">{message.essential ? <p className="text-footnote text-warning">Service notice</p> : null}<h2 className="break-words text-title-3 text-text">{message.title}</h2></div>
        <button aria-label="Dismiss message" className="min-h-11 shrink-0 px-3 text-body text-accent disabled:text-text-muted" data-modal-initial-focus disabled={busy} onClick={() => void dismiss()} type="button">Close</button>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-body text-text-secondary">{message.body}</p>
      {message.actionUrl ? <a className="mt-1 inline-flex min-h-11 items-center break-all text-body text-accent" href={message.actionUrl} rel="noreferrer" target="_blank">Open related link</a> : null}
      <form className="mt-5 space-y-3" onSubmit={(event) => void respond(event)}>
        <ResponseInput message={message} choice={choice} rating={rating} setChoice={setChoice} setRating={setRating} setText={setText} text={text} />
        {error ? <p className="text-subhead text-danger" role="alert">{error}</p> : null}
        <p className="text-footnote text-text-secondary">Answering is optional. Closing puts this message away for good.</p>
        <Button className="w-full" disabled={busy} type="submit">{busy ? "Saving…" : responseLabel(message.responseType)}</Button>
      </form>
    </article>
  );

  return inline ? content : <div aria-label="Message" aria-modal="true" className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" ref={dialogRef} role="dialog" tabIndex={-1}>{content}</div>;
}

function ResponseInput(props: { message: UserMessage; choice: string; rating: number; text: string; setChoice(value: string): void; setRating(value: number): void; setText(value: string): void }): ReactNode {
  const { message } = props;
  if (message.responseType === "ACKNOWLEDGEMENT") return <p className="text-body text-text">Tap Acknowledge to confirm you saw this message.</p>;
  if (message.responseType === "RATING") return <fieldset><legend className="text-subhead text-text-secondary">Your rating</legend><div className="mt-2 flex gap-2">{[1, 2, 3, 4, 5].map((value) => <button aria-pressed={props.rating === value} className={`num size-11 rounded-full ${props.rating === value ? "bg-accent text-on-accent" : "bg-surface text-text"}`} key={value} onClick={() => props.setRating(value)} type="button">{value}</button>)}</div></fieldset>;
  if (message.responseType === "SINGLE_CHOICE") return <fieldset><legend className="text-subhead text-text-secondary">Your answer</legend><div className="mt-2 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-surface">{message.responseOptions.map((option) => <label className="flex min-h-11 items-center gap-3 px-4 py-2 text-body text-text" key={option}><input checked={props.choice === option} name={`choice-${message.id}`} onChange={() => props.setChoice(option)} type="radio" /><span className="min-w-0 break-words">{option}</span></label>)}</div></fieldset>;
  return <label className="block"><span className="text-subhead text-text-secondary">Your feedback (optional)</span><textarea className="mt-2 min-h-28 w-full rounded-[var(--radius-control)] border border-control-line bg-surface-raised p-3 text-body text-text" maxLength={1_000} onChange={(event) => props.setText(event.currentTarget.value)} value={props.text} /><span className="num text-footnote text-text-muted">{props.text.length}/1000</span></label>;
}

function buildResponse(type: UserMessage["responseType"], value: { choice: string; rating: number; text: string }): Record<string, unknown> | null {
  if (type === "ACKNOWLEDGEMENT") return { type, acknowledged: true };
  if (type === "RATING") return value.rating ? { type, rating: value.rating } : null;
  if (type === "SINGLE_CHOICE") return value.choice ? { type, choice: value.choice } : null;
  return value.text.trim() ? { type, text: value.text.trim() } : null;
}

function responseLabel(type: UserMessage["responseType"]): string {
  return type === "ACKNOWLEDGEMENT" ? "Acknowledge" : "Send answer";
}
