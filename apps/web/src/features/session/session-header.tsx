"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatClock, formatDayTime } from "../../shared/format";
import { useAppBack } from "../shell/app-history";
import { IconBack, IconChevronDown, IconMore } from "../../shared/ui/icons";

interface SessionHeaderProps {
  focusName: boolean;
  /** Fixed back destination, for the example workout that lives under /help/demo. */
  backHref?: string;
  backLabel?: string;
  isOpen: boolean;
  isRenaming: boolean;
  onDelete: () => void;
  onRename: (title: string | null) => void;
  startedAt: string;
  title: string | null;
}

const iconButton = "flex size-11 flex-none items-center justify-center rounded-full text-accent active:bg-surface-raised";

/**
 * Top bar of the full-screen workout (DESIGN.md, Navigation): Minimize while
 * the workout is open, Back once it is finished, the editable name with the
 * elapsed time, and a menu that holds Discard or Delete.
 */
export function SessionHeader(props: SessionHeaderProps): ReactNode {
  const [draftTitle, setDraftTitle] = useState(props.title ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setDraftTitle(props.title ?? ""), [props.title]);
  useEffect(() => {
    if (!menuOpen) return;

    const close = (event: PointerEvent): void => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const escape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", escape);
    };
  }, [menuOpen]);

  function saveTitle(): void {
    const trimmed = draftTitle.trim();
    const next = trimmed.length > 0 ? trimmed : null;

    if (next !== props.title) props.onRename(next);
  }

  const fallbackTitle = "Name this workout";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg pt-[env(safe-area-inset-top)]">
      <h1 className="sr-only">{props.title?.trim() || "Workout"}</h1>
      <div className="mx-auto flex max-w-5xl items-center gap-1 px-[max(0.25rem,env(safe-area-inset-left))] py-1.5 sm:px-3">
        {props.backHref ? (
          <Link aria-label={props.backLabel ?? "Back"} className={iconButton} href={props.backHref}>
            {props.isOpen ? <IconChevronDown /> : <IconBack />}
          </Link>
        ) : (
          <BackControl isOpen={props.isOpen} />
        )}

        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="session-name">Workout name</label>
          <input
            autoFocus={props.focusName}
            className="block min-h-8 w-full truncate rounded-[var(--radius-sm)] bg-transparent px-1.5 text-headline text-text placeholder:text-text-muted focus:bg-surface-raised"
            disabled={props.isRenaming}
            enterKeyHint="done"
            id="session-name"
            maxLength={120}
            onBlur={saveTitle}
            onChange={(event) => setDraftTitle(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") {
                setDraftTitle(props.title ?? "");
                event.currentTarget.blur();
              }
            }}
            placeholder={fallbackTitle}
            value={draftTitle}
          />
          <p className="px-1.5 text-footnote text-text-secondary">
            {props.isOpen ? <ElapsedTime startedAt={props.startedAt} /> : <>Finished, {formatDayTime(props.startedAt)}</>}
            {props.isRenaming ? <span className="text-text-muted">, saving…</span> : null}
          </p>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Workout actions"
            className={iconButton}
            ref={menuButtonRef}
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            <IconMore />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-12 z-40 min-w-56 overflow-hidden rounded-[var(--radius-card)] bg-surface-raised shadow-xl" role="menu">
              <button
                className="flex min-h-12 w-full items-center px-4 text-left text-body text-danger active:bg-line"
                onClick={() => {
                  setMenuOpen(false);
                  // Park focus on the menu button, so the confirm sheet hands it back there.
                  menuButtonRef.current?.focus();
                  props.onDelete();
                }}
                role="menuitem"
                type="button"
              >
                {props.isOpen ? "Discard workout" : "Delete workout"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/**
 * Minimize returns to wherever the workout was opened from. With no in-app
 * history (deep link, reload) an open workout falls back to the Workout tab and
 * a finished one to History, per the route table.
 */
function BackControl({ isOpen }: { isOpen: boolean }): ReactNode {
  const router = useRouter();
  const back = useAppBack();
  const fromHistory = back.target.kind === "history";

  function leave(): void {
    if (fromHistory) back.goBack();
    else router.replace(isOpen ? "/workout" : "/workouts");
  }

  if (isOpen) {
    return (
      <button aria-label="Minimize workout" className={iconButton} onClick={leave} type="button">
        <IconChevronDown />
      </button>
    );
  }

  return (
    <button className="flex min-h-11 flex-none items-center gap-0.5 rounded-full pr-2 text-body text-accent active:bg-surface-raised" onClick={leave} type="button">
      <IconBack />
      <span className="max-w-24 truncate">{fromHistory ? back.label : "History"}</span>
    </button>
  );
}

function ElapsedTime({ startedAt }: { startedAt: string }): ReactNode {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  return <span className="num" data-testid="workout-elapsed">{formatClock((now - new Date(startedAt).getTime()) / 1_000)}</span>;
}
