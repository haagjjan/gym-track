import type { CSSProperties, ReactNode } from "react";
import {
  compareVolumeTotals,
  volumeBand,
  type VolumeMuscleTotal
} from "./volume-analytics";
import { VolumeEmptyState } from "./volume-empty-state";

export function VolumeDistributionMatrix({
  onSelect,
  selectedSlug,
  totals
}: {
  onSelect(slug: string): void;
  selectedSlug: string;
  totals: Map<string, VolumeMuscleTotal>;
}): ReactNode {
  const items = [...totals.values()].sort(compareVolumeTotals);
  const maxSets = Math.max(...items.map((item) => item.workingSets), 1);

  if (items.length === 0) {
    return (
      <section className="volumeMatrixPanel">
        <VolumeEmptyState title="NO_VOLUME_MATRIX" message="Log working sets to populate muscle distribution." />
      </section>
    );
  }

  return (
    <section className="volumeMatrixPanel" aria-labelledby="volume-matrix-title">
      <div className="volumeSectionHeader">
        <div>
          <p className="eyebrow">Distribution matrix</p>
          <h2 id="volume-matrix-title">Muscle load order</h2>
        </div>
      </div>
      <div className="volumeMatrixRows">
        {items.map((item) => (
          <button
            aria-pressed={item.muscleGroup.slug === selectedSlug}
            className="volumeMatrixRow"
            data-band={volumeBand(item.weeklyAverageSets)}
            key={item.muscleGroup.slug}
            onClick={() => onSelect(item.muscleGroup.slug)}
            style={volumeRowStyle(item.workingSets, maxSets)}
            type="button"
          >
            <span>{item.muscleGroup.name}</span>
            <strong>{item.workingSets}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function volumeRowStyle(workingSets: number, maxSets: number): CSSProperties {
  return {
    "--volume-row-fill": `${Math.max(8, (workingSets / maxSets) * 100)}%`
  } as CSSProperties;
}
