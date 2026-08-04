"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function SessionEditorDock({
  children,
  label,
  onClose
}: {
  children: ReactNode;
  label: string;
  onClose: () => void;
}): ReactNode {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const isMobile = useMobileViewport();
  const [viewport, setViewport] = useState({ bottom: 0, maxHeight: 0 });

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isMobile === null) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onCloseRef.current();
    };
    const updateViewport = (): void => {
      const visual = window.visualViewport;
      const height = visual?.height ?? window.innerHeight;
      const offsetTop = visual?.offsetTop ?? 0;
      setViewport({
        bottom: Math.max(0, window.innerHeight - height - offsetTop),
        maxHeight: Math.max(240, Math.min(height * 0.82, height - 16))
      });
    };

    window.addEventListener("keydown", closeOnEscape);
    if (isMobile) {
      document.body.style.overflow = "hidden";
      updateViewport();
      window.visualViewport?.addEventListener("resize", updateViewport);
      window.visualViewport?.addEventListener("scroll", updateViewport);
    }
    const frame = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", closeOnEscape);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      if (isMobile) document.body.style.overflow = previousOverflow;
    };
  }, [isMobile]);

  if (isMobile === null) return null;

  const editor = (
    <div
      aria-label={label}
      className={isMobile
        ? "fixed inset-x-0 z-50 overflow-y-auto rounded-t-2xl border border-cyan/30 bg-surface p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-2xl"
        : "static overflow-visible bg-transparent p-0"}
      ref={dialogRef}
      role="dialog"
      style={isMobile ? { bottom: viewport.bottom, maxHeight: viewport.maxHeight || "82dvh" } : undefined}
    >
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  );

  if (!isMobile) return editor;

  return createPortal(<><button aria-label={`Close ${label}`} className="fixed inset-0 z-40 bg-void/70 backdrop-blur-sm" onClick={onClose} type="button" />{editor}</>, document.body);
}

export function SessionTimerDock({ children }: { children: ReactNode }): ReactNode {
  const isMobile = useMobileViewport();
  if (isMobile === null) return null;
  const timer = <div className={isMobile ? "fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]" : "static mt-4 p-0"}><div className="mx-auto max-w-2xl">{children}</div></div>;
  return isMobile ? createPortal(timer, document.body) : timer;
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
