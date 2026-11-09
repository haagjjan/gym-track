"use client";

import type { ReactNode } from "react";
import { Button } from "./button";
import { Sheet } from "./sheet";

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
  pendingLabel = "Deleting…",
  title,
  tone = "danger"
}: ConfirmDialogProps): ReactNode {
  const isDanger = tone === "danger";

  return (
    <Sheet closeOnEscape={!isPending} closeOnScrim={!isPending} describedBy="confirm-dialog-message" isOpen={isOpen} labelledBy="confirm-dialog-title" onClose={onCancel} role="alertdialog" width="md">
      <h2 className="text-title-3 text-text" id="confirm-dialog-title">{title}</h2>
      <p className="mt-2 text-body text-text-secondary" id="confirm-dialog-message">{message}</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Button className="sm:order-2" disabled={isPending} onClick={onConfirm} variant={isDanger ? "destructive" : "primary"}>{isPending ? pendingLabel : confirmLabel}</Button>
        <Button className="sm:order-1" data-modal-initial-focus disabled={isPending} onClick={onCancel} variant="secondary">Cancel</Button>
      </div>
    </Sheet>
  );
}
