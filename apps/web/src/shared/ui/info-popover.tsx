"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function InfoPopover({ label, children }: { label: string; children: ReactNode }): ReactNode {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: KeyboardEvent): void {
      if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); }
    }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  return <span className="relative inline-flex align-middle"><button aria-expanded={open} aria-label={`Information about ${label}`} className="ml-1 inline-flex size-7 items-center justify-center rounded-full border border-outline-dim text-xs font-bold text-outline hover:border-cyan hover:text-cyan" onClick={() => setOpen((value) => !value)} ref={buttonRef} type="button">?</button>{open ? <span aria-label={`Information about ${label}`} className="fixed left-4 right-4 top-1/2 z-50 -translate-y-1/2 rounded-lg border border-cyan/40 bg-surface p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-fg-muted shadow-2xl sm:absolute sm:left-1/2 sm:right-auto sm:top-9 sm:w-72 sm:-translate-x-1/2 sm:translate-y-0" role="dialog">{children}<button className="mt-2 block min-h-9 text-cyan" onClick={() => { setOpen(false); buttonRef.current?.focus(); }} type="button">Close</button></span> : null}</span>;
}
