import type { PointerEvent, ReactNode } from "react";
import type { HomeStat, VolumeBar } from "./dashboard-types";

interface HomeStatsPanelProps {
  anchor: "left" | "right";
  emptyMessage: string;
  emptyTitle: string;
  heading: string;
  isLoading?: boolean;
  items?: HomeStat[];
  volumeBars?: VolumeBar[];
}

export function HomeStatsPanel({
  anchor,
  emptyMessage,
  emptyTitle,
  heading,
  isLoading = false,
  items = [],
  volumeBars = []
}: HomeStatsPanelProps): ReactNode {
  const maxVolume = Math.max(...volumeBars.map((item) => item.workingSets), 1);

  return (
    <section
      aria-busy={isLoading}
      className="homeHudField"
      data-anchor={anchor}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
    >
      <div className="homeHudField__header">
        <span aria-hidden="true" />
        <h2>{heading}</h2>
      </div>

      {isLoading ? (
        <StatusCopy title="SCANNING_TELEMETRY" message="Syncing cockpit data." />
      ) : items.length > 0 ? (
        <dl className="homeHudField__metrics">
          {items.map((item) => (
            <div key={item.id}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
              {item.detail ? <p>{item.detail}</p> : null}
            </div>
          ))}
        </dl>
      ) : volumeBars.length > 0 ? (
        <div className="homeHudField__volume" aria-label={heading}>
          {volumeBars.map((item) => (
            <div key={item.slug}>
              <div className="homeHudField__track">
                <i style={{ height: `${barHeight(item.workingSets, maxVolume)}%` }} />
              </div>
              <span>{item.name}</span>
              <strong>{item.workingSets}</strong>
            </div>
          ))}
        </div>
      ) : (
        <StatusCopy title={emptyTitle} message={emptyMessage} />
      )}
    </section>
  );
}

function StatusCopy({ message, title }: { message: string; title: string }): ReactNode {
  return (
    <div className="homeHudField__status">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function barHeight(value: number, maxValue: number): number {
  if (value <= 0) {
    return 8;
  }

  return Math.max(14, Math.round((value / maxValue) * 100));
}

function handlePointerMove(event: PointerEvent<HTMLElement>): void {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;

  target.style.setProperty("--home-pointer-x", `${(x + 0.5) * 100}%`);
  target.style.setProperty("--home-pointer-y", `${(y + 0.5) * 100}%`);
  target.style.setProperty("--home-pointer-rotate-x", `${(-y * 5).toFixed(2)}deg`);
  target.style.setProperty("--home-pointer-rotate-y", `${(x * 5).toFixed(2)}deg`);
  target.style.setProperty("--home-pointer-shift-x", `${(x * 5).toFixed(2)}px`);
  target.style.setProperty("--home-pointer-shift-y", `${(y * 5).toFixed(2)}px`);
}

function handlePointerLeave(event: PointerEvent<HTMLElement>): void {
  const target = event.currentTarget;

  target.style.setProperty("--home-pointer-x", "50%");
  target.style.setProperty("--home-pointer-y", "50%");
  target.style.setProperty("--home-pointer-rotate-x", "0deg");
  target.style.setProperty("--home-pointer-rotate-y", "0deg");
  target.style.setProperty("--home-pointer-shift-x", "0px");
  target.style.setProperty("--home-pointer-shift-y", "0px");
}
