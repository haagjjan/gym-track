export interface SpikeControlState {
  /** Mock readiness score 0-100 driving rim-glow intensity. */
  readiness: number;
  /** 1 -> 0 decay after a PR event; shifts rim color toward neon green. */
  pulse: number;
  /** 0 -> 1 particle burst progress; 1 means idle/hidden. */
  burstProgress: number;
}

export function createInitialSpikeControlState(): SpikeControlState {
  return {
    readiness: 72,
    pulse: 0,
    burstProgress: 1
  };
}
