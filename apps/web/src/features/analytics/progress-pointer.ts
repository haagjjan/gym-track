import type { PointerEvent } from "react";

export function handleProgressPointerMove(event: PointerEvent<HTMLElement>): void {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;

  target.style.setProperty("--progress-pointer-x", `${(x + 0.5) * 100}%`);
  target.style.setProperty("--progress-pointer-y", `${(y + 0.5) * 100}%`);
  target.style.setProperty("--progress-pointer-rotate-x", `${(-y * 2.8).toFixed(2)}deg`);
  target.style.setProperty("--progress-pointer-rotate-y", `${(x * 2.8).toFixed(2)}deg`);
}

export function handleProgressPointerLeave(event: PointerEvent<HTMLElement>): void {
  const target = event.currentTarget;

  target.style.setProperty("--progress-pointer-x", "50%");
  target.style.setProperty("--progress-pointer-y", "50%");
  target.style.setProperty("--progress-pointer-rotate-x", "0deg");
  target.style.setProperty("--progress-pointer-rotate-y", "0deg");
}
