import type { PointerEvent } from "react";

export function handleVolumePointerMove(event: PointerEvent<HTMLElement>): void {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;

  target.style.setProperty("--volume-pointer-x", `${(x + 0.5) * 100}%`);
  target.style.setProperty("--volume-pointer-y", `${(y + 0.5) * 100}%`);
  target.style.setProperty("--volume-pointer-rotate-x", `${(-y * 2.4).toFixed(2)}deg`);
  target.style.setProperty("--volume-pointer-rotate-y", `${(x * 2.4).toFixed(2)}deg`);
}

export function handleVolumePointerLeave(event: PointerEvent<HTMLElement>): void {
  const target = event.currentTarget;

  target.style.setProperty("--volume-pointer-x", "50%");
  target.style.setProperty("--volume-pointer-y", "50%");
  target.style.setProperty("--volume-pointer-rotate-x", "0deg");
  target.style.setProperty("--volume-pointer-rotate-y", "0deg");
}
