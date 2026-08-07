"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { apiFetch, errorMessage } from "../../shared/api/client";
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
      setError(errorMessage(caught, "The message could not be dismissed."));
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
      setError(errorMessage(caught, "The response could not be saved."));
    } finally { setBusy(false); }
  }

  const dialogRef = useModalBehavior<HTMLDivElement>({
    isOpen: Boolean(message && !inline),
    onClose: () => { void dismiss(); }
  });

  if (!message) {
    return inline ? <p className="rounded border border-outline-dim/50 p-5 text-sm text-outline">You have no new messages.</p> : null;
  }

  const content = (
    <article className="w-full max-w-lg rounded border border-cyan/40 bg-surface p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div><p className="label-caps text-cyan">{message.essential ? "SERVICE_NOTICE" : "FOUNDING_BETA_MESSAGE"}</p><h2 className="mt-2 font-display text-xl font-bold text-fg">{message.title}</h2></div>
        <button aria-label="Dismiss message" className="min-h-11 px-3 text-outline hover:text-fg" data-modal-initial-focus disabled={busy} onClick={() => void dismiss()} type="button">Close</button>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-fg-muted">{message.body}</p>
      {message.actionUrl ? <a className="mt-3 inline-flex min-h-11 items-center text-cyan underline" href={message.actionUrl} rel="noreferrer" target="_blank">Open related link ↗</a> : null}
      <form className="mt-5 space-y-3" onSubmit={(event) => void respond(event)}>
        <ResponseInput message={message} choice={choice} rating={rating} setChoice={setChoice} setRating={setRating} setText={setText} text={text} />
        {error ? <p className="text-sm text-red" role="alert">{error}</p> : null}
        <p className="text-xs text-outline">Responding is optional. Closing dismisses this message permanently.</p>
        <button className="min-h-11 rounded border border-cyan/60 px-4 font-display text-xs font-bold uppercase tracking-wider text-cyan disabled:opacity-50" disabled={busy} type="submit">{busy ? "SAVING…" : responseLabel(message.responseType)}</button>
      </form>
    </article>
  );

  return inline ? content : <div aria-label="Beta message" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4" ref={dialogRef} role="dialog" tabIndex={-1}>{content}</div>;
}

function ResponseInput(props: { message: UserMessage; choice: string; rating: number; text: string; setChoice(value: string): void; setRating(value: number): void; setText(value: string): void }): ReactNode {
  const { message } = props;
  if (message.responseType === "ACKNOWLEDGEMENT") return <p className="text-sm text-fg">Select acknowledge to confirm you saw this message.</p>;
  if (message.responseType === "RATING") return <fieldset><legend className="label-caps text-outline">RATING</legend><div className="mt-2 flex gap-2">{[1, 2, 3, 4, 5].map((value) => <button aria-pressed={props.rating === value} className={`size-11 rounded border ${props.rating === value ? "border-cyan bg-cyan/10 text-cyan" : "border-outline-dim text-fg"}`} key={value} onClick={() => props.setRating(value)} type="button">{value}</button>)}</div></fieldset>;
  if (message.responseType === "SINGLE_CHOICE") return <fieldset><legend className="label-caps text-outline">YOUR_RESPONSE</legend><div className="mt-2 grid gap-2">{message.responseOptions.map((option) => <label className="flex min-h-11 items-center gap-3 rounded border border-outline-dim px-3 text-sm text-fg" key={option}><input checked={props.choice === option} name={`choice-${message.id}`} onChange={() => props.setChoice(option)} type="radio" />{option}</label>)}</div></fieldset>;
  return <label className="block"><span className="label-caps text-outline">OPTIONAL_FEEDBACK</span><textarea className="mt-2 min-h-28 w-full rounded border border-outline-dim bg-surface-low p-3 text-fg" maxLength={1_000} onChange={(event) => props.setText(event.currentTarget.value)} value={props.text} /><span className="text-xs text-outline">{props.text.length}/1000</span></label>;
}

function buildResponse(type: UserMessage["responseType"], value: { choice: string; rating: number; text: string }): Record<string, unknown> | null {
  if (type === "ACKNOWLEDGEMENT") return { type, acknowledged: true };
  if (type === "RATING") return value.rating ? { type, rating: value.rating } : null;
  if (type === "SINGLE_CHOICE") return value.choice ? { type, choice: value.choice } : null;
  return value.text.trim() ? { type, text: value.text.trim() } : null;
}

function responseLabel(type: UserMessage["responseType"]): string {
  return type === "ACKNOWLEDGEMENT" ? "Acknowledge" : "Send optional response";
}
