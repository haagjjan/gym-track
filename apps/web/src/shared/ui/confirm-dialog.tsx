"use client";

import { useEffect, type ReactNode } from "react";
import { HudButton } from "./ui";

interface ConfirmDialogProps {
  confirmLabel: string;
  isOpen: boolean;
  isPending?: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  pendingLabel?: string;
  title: string;
  tone?: "danger" | "warning";
}

export function ConfirmDialog({
  confirmLabel,
  isOpen,
  isPending = false,
  message,
  onCancel,
  onConfirm,
  pendingLabel = "DELETING…",
  title,
  tone = "danger"
}: ConfirmDialogProps): ReactNode {
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !isPending) onCancel();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, isPending, onCancel]);

  if (!isOpen) return null;
  const isDanger = tone === "danger";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-void/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <section aria-labelledby="confirm-dialog-title" aria-modal="true" className={`glass w-full rounded-t-xl border p-4 sm:max-w-md sm:rounded-xl ${isDanger ? "border-red/30" : "border-lavender/40"}`} role="alertdialog">
        <p className={`label-caps ${isDanger ? "text-red" : "text-lavender"}`}>{isDanger ? "DESTRUCTIVE_ACTION" : "CONFIRM_ACTION"}</p>
        <h2 className="mt-1 font-display text-lg font-bold text-fg" id="confirm-dialog-title">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-fg-muted">{message}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <HudButton disabled={isPending} onClick={onCancel} variant="ghost">CANCEL</HudButton>
          <HudButton disabled={isPending} onClick={onConfirm} variant={isDanger ? "danger" : "primary"}>{isPending ? pendingLabel : confirmLabel}</HudButton>
        </div>
      </section>
    </div>
  );
}
