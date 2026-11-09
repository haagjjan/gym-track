"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalBehavior } from "./use-modal-behavior";

/**
 * Bottom sheet on phones, centred dialog from `sm` up (DESIGN.md, Sheets):
 * scrim, rounded top, grabber, no blur.
 */
export const sheetOverlayClass = "fixed inset-0 flex items-end justify-center bg-black/50 sm:items-center sm:p-4";

const panelBaseClass = "w-full bg-surface-raised px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 rounded-t-[var(--radius-card)] sm:rounded-[var(--radius-card)] sm:pt-4";

const panelWidthClass = {
  md: "sm:max-w-md",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl"
} as const;

export const sheetPanelClass = `${panelBaseClass} ${panelWidthClass["2xl"]}`;

export function SheetGrabber(): ReactNode {
  return <div aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-full bg-control-line sm:hidden" />;
}

interface SheetProps {
  children: ReactNode;
  /** Extra panel classes, such as height and scrolling. Width goes through `width`. */
  className?: string;
  closeOnEscape?: boolean;
  /** Tapping the scrim closes the sheet. Off for sheets holding a form in progress. */
  closeOnScrim?: boolean;
  describedBy?: string;
  isOpen: boolean;
  /** Stacking layer, as a literal Tailwind class. */
  layer?: "z-50" | "z-[60]" | "z-[70]";
  labelledBy: string;
  onClose: () => void;
  /** Render into `document.body`, for sheets opened from inside clipped containers. */
  portal?: boolean;
  role?: "dialog" | "alertdialog";
  width?: keyof typeof panelWidthClass;
}

/** A modal sheet: focus trap, Escape, inert background and scroll lock come from `useModalBehavior`. */
export function Sheet({
  children,
  className,
  closeOnEscape = true,
  closeOnScrim = true,
  describedBy,
  isOpen,
  layer = "z-[70]",
  labelledBy,
  onClose,
  portal = false,
  role = "dialog",
  width = "2xl"
}: SheetProps): ReactNode {
  const dialogRef = useModalBehavior<HTMLElement>({ closeOnEscape, isOpen, onClose });

  if (!isOpen) return null;

  const sheet = (
    <div
      className={`${sheetOverlayClass} ${layer}`}
      onMouseDown={closeOnScrim ? (event) => { if (event.target === event.currentTarget) onClose(); } : undefined}
      role={closeOnScrim ? undefined : "presentation"}
    >
      <section
        aria-describedby={describedBy}
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={`${panelBaseClass} ${panelWidthClass[width]}${className ? ` ${className}` : ""}`}
        ref={dialogRef}
        role={role}
        tabIndex={-1}
      >
        <SheetGrabber />
        {children}
      </section>
    </div>
  );

  return portal ? createPortal(sheet, document.body) : sheet;
}
