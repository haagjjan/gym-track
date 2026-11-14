"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalBehavior } from "../../shared/ui/use-modal-behavior";

export function SessionEditorDock({
  children,
  label,
  onClose
}: {
  children: ReactNode;
  label: string;
  onClose: () => void;
}): ReactNode {
  const isMobile = useMobileViewport();
  const [viewport, setViewport] = useState({ bottom: 0, maxHeight: 0 });
  const dialogRef = useModalBehavior<HTMLDivElement>({
    initialFocus: "dialog",
    isOpen: isMobile === true,
    onClose
  });

  useEffect(() => {
    if (!isMobile) return;
    const updateViewport = (): void => {
      const visual = window.visualViewport;
      const height = visual?.height ?? window.innerHeight;
      const offsetTop = visual?.offsetTop ?? 0;
      setViewport({
        bottom: Math.max(0, window.innerHeight - height - offsetTop),
        maxHeight: Math.max(240, Math.min(height * 0.82, height - 16))
      });
    };

    updateViewport();
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
    };
  }, [isMobile]);

  if (isMobile === null) return null;

  const editor = (
    <div
      aria-label={label}
      className={isMobile
        // Save/Cancel rows (data-sheet-actions) stay pinned when the form is taller than a small phone.
        ? "fixed inset-x-0 z-50 overflow-y-auto overscroll-contain rounded-t-[var(--radius-card)] bg-surface-raised px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-2 [&_[data-sheet-actions]]:sticky [&_[data-sheet-actions]]:bottom-0 [&_[data-sheet-actions]]:z-10 [&_[data-sheet-actions]]:bg-surface-raised [&_[data-sheet-actions]]:py-2"
        : "static mt-3 overflow-visible rounded-[var(--radius-card)] bg-surface-raised p-4"}
      aria-modal={isMobile || undefined}
      ref={dialogRef}
      role="dialog"
      style={isMobile ? { bottom: viewport.bottom, maxHeight: viewport.maxHeight || "82dvh" } : undefined}
      tabIndex={isMobile ? -1 : undefined}
    >
      {isMobile ? <div aria-hidden className="mx-auto mb-3 h-1 w-9 rounded-full bg-control-line" /> : null}
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  );

  if (!isMobile) return editor;

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>): void {
    if (event.target === event.currentTarget) onClose();
  }

  return createPortal(<div className="fixed inset-0 z-40 bg-black/50" onMouseDown={closeFromBackdrop}>{editor}</div>, document.body);
}

function useMobileViewport(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = (): void => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}
