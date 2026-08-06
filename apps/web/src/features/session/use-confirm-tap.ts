"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Two-tap confirm for destructive actions: first tap arms for a short window,
 * second tap executes. Faster and more thumb-friendly mid-set than a modal.
 */
export function useConfirmTap(action: () => void, windowMs = 2600): {
  isArmed: boolean;
  trigger: () => void;
} {
  const [isArmed, setIsArmed] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function trigger(): void {
    if (isArmed) {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      setIsArmed(false);
      action();
      return;
    }

    setIsArmed(true);
    timeoutRef.current = window.setTimeout(() => setIsArmed(false), windowMs);
  }

  return { isArmed, trigger };
}
