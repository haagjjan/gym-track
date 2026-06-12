import type { ReactNode } from "react";
import {
  handleCockpitPointerLeave,
  handleCockpitPointerMove
} from "../../shared/ui/cockpit/cockpit-reactive";
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
      onPointerLeave={handleCockpitPointerLeave}
      onPointerMove={handleCockpitPointerMove}
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
