"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { HudButton } from "../../shared/ui/ui";
import { formatDateTime } from "../../shared/format";
import { IconCheck, IconClose } from "../shell/icons";
import { useConfirmTap } from "./use-confirm-tap";

interface SessionHeaderProps {
  focusName: boolean;
  isEnding: boolean;
  isOpen: boolean;
  isRenaming: boolean;
  onDelete: () => void;
  onEnd: () => void;
  onRename: (title: string | null) => void;
  startedAt: string;
  title: string | null;
}

export function SessionHeader(props: SessionHeaderProps): ReactNode {
  const confirmEnd = useConfirmTap(props.onEnd);
  const [draftTitle, setDraftTitle] = useState(props.title ?? "");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDraftTitle(props.title ?? ""), [props.title]);
  useEffect(() => {
    if (!menuOpen) return;

    const close = (event: PointerEvent): void => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menuOpen]);

  function saveTitle(): void {
    const trimmed = draftTitle.trim();
    const next = trimmed.length > 0 ? trimmed : null;

    if (next !== props.title) props.onRename(next);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-outline-dim/40 bg-void/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2 sm:px-4">
        <Link
          aria-label={props.isOpen ? "Back to dashboard" : "Back to workout history"}
          className="flex size-11 shrink-0 items-center justify-center rounded border border-outline-dim text-fg-muted transition-colors hover:border-cyan hover:text-cyan"
          href={props.isOpen ? "/" : "/workouts"}
        >
          <IconClose />
        </Link>

        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="session-name">Workout name</label>
          <input
            autoFocus={props.focusName}
            className="min-h-10 w-full rounded border border-transparent bg-transparent px-2 font-display text-sm font-bold text-fg placeholder:text-outline hover:border-outline-dim focus:border-cyan focus:bg-surface-low/60 focus:outline-none"
            disabled={props.isRenaming}
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
            placeholder={`Workout ${formatDateTime(props.startedAt)}`}
            value={draftTitle}
          />
          {props.isOpen ? (
            <SessionLiveTimer isRenaming={props.isRenaming} startedAt={props.startedAt} />
          ) : (
            <p className="px-2 text-[10px] uppercase tracking-[0.08em] text-outline">Completed workout{props.isRenaming ? " · saving…" : ""}</p>
          )}
        </div>

        {props.isOpen ? (
          <HudButton
            className={confirmEnd.isArmed ? "animate-pulse-slow" : ""}
            disabled={props.isEnding}
            onClick={confirmEnd.trigger}
            variant={confirmEnd.isArmed ? "success" : "outline"}
          >
            <IconCheck />
            {props.isEnding ? "FINISHING…" : confirmEnd.isArmed ? "CONFIRM FINISH" : "FINISH"}
          </HudButton>
        ) : null}

        <div className="relative" ref={menuRef}>
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Workout actions"
            className="flex size-11 items-center justify-center rounded border border-outline-dim text-xl leading-none text-fg-muted hover:border-cyan hover:text-cyan"
            onClick={() => setMenuOpen((current) => !current)}
            type="button"
          >
            <span aria-hidden className="-mt-2">…</span>
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-12 z-40 min-w-48 rounded-lg border border-outline-dim bg-surface p-1 shadow-2xl" role="menu">
              <button
                className="flex min-h-11 w-full items-center rounded px-3 text-left text-xs font-semibold text-red hover:bg-red/10"
                onClick={() => {
                  setMenuOpen(false);
                  props.onDelete();
                }}
                role="menuitem"
                type="button"
              >
                {props.isOpen ? "Discard workout" : "Delete workout log"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function SessionLiveTimer({ isRenaming, startedAt }: { isRenaming: boolean; startedAt: string }): ReactNode {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <p className="flex items-center gap-1.5 px-2 font-mono text-[10px] uppercase tracking-[0.08em] text-outline">
      <span aria-hidden className="status-dot bg-outline motion-safe:animate-[pulse_1s_ease-in-out_infinite] motion-reduce:animate-none" />
      LIVE · {formatLiveElapsedSeconds((now - new Date(startedAt).getTime()) / 1_000)}{isRenaming ? " · saving…" : ""}
    </p>
  );
}

function formatLiveElapsedSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3_600);
  const minutes = Math.floor((clamped % 3_600) / 60);
  const seconds = clamped % 60;
  const pad = (value: number): string => String(value).padStart(2, "0");

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
