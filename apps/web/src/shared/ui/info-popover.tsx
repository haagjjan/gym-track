"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function InfoPopover({ label, children }: { label: string; children: ReactNode }): ReactNode {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    function close(event: KeyboardEvent): void {
      const active = document.activeElement;
      const ownsFocus = active === buttonRef.current || popoverRef.current?.contains(active);
      if (event.key === "Escape" && ownsFocus) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", close, true);
    return () => document.removeEventListener("keydown", close, true);
  }, [open]);

  return <span className="relative inline-flex align-middle"><button aria-controls={popoverId} aria-expanded={open} aria-haspopup="dialog" aria-label={`Information about ${label}`} className="-my-2 ml-0.5 inline-flex size-11 items-center justify-center rounded-full text-footnote font-semibold text-text-secondary before:absolute before:size-6 before:rounded-full before:border before:border-control-line before:content-[''] relative" onClick={() => setOpen((value) => !value)} ref={buttonRef} type="button">?</button>{open ? <span aria-label={`Information about ${label}`} aria-modal="false" className="fixed left-4 right-4 top-1/2 z-50 -translate-y-1/2 rounded-[var(--radius-card)] bg-surface-raised p-4 text-left text-subhead font-normal normal-case tracking-normal text-text-secondary shadow-2xl sm:absolute sm:left-1/2 sm:right-auto sm:top-9 sm:w-72 sm:-translate-x-1/2 sm:translate-y-0" id={popoverId} ref={popoverRef} role="dialog">{children}<button className="mt-2 block min-h-11 text-accent" onClick={() => { setOpen(false); buttonRef.current?.focus(); }} type="button">Close</button></span> : null}</span>;
}
