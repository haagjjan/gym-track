import type { PointerEvent } from "react";

const pointerStrength = {
  rotate: 2.8,
  shift: 4
};

export function handleCockpitPointerMove(event: PointerEvent<HTMLElement>): void {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) {
    return;
  }

  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;

  target.style.setProperty("--cockpit-pointer-x", `${(x + 0.5) * 100}%`);
  target.style.setProperty("--cockpit-pointer-y", `${(y + 0.5) * 100}%`);
  target.style.setProperty(
    "--cockpit-pointer-rotate-x",
    `${(-y * pointerStrength.rotate).toFixed(2)}deg`
  );
  target.style.setProperty(
    "--cockpit-pointer-rotate-y",
    `${(x * pointerStrength.rotate).toFixed(2)}deg`
  );
  target.style.setProperty(
    "--cockpit-pointer-shift-x",
    `${(x * pointerStrength.shift).toFixed(2)}px`
  );
  target.style.setProperty(
    "--cockpit-pointer-shift-y",
    `${(y * pointerStrength.shift).toFixed(2)}px`
  );
}

export function handleCockpitPointerLeave(event: PointerEvent<HTMLElement>): void {
  const target = event.currentTarget;

  target.style.setProperty("--cockpit-pointer-x", "50%");
  target.style.setProperty("--cockpit-pointer-y", "50%");
  target.style.setProperty("--cockpit-pointer-rotate-x", "0deg");
  target.style.setProperty("--cockpit-pointer-rotate-y", "0deg");
  target.style.setProperty("--cockpit-pointer-shift-x", "0px");
  target.style.setProperty("--cockpit-pointer-shift-y", "0px");
}
