"use client";

import type { ReactNode } from "react";
import { Panel, Skeleton } from "../../shared/ui/ui";
import { IconMinus, IconPlus } from "../shell/icons";
import {
  REST_MAX_SECONDS,
  REST_MIN_SECONDS,
  REST_STEP_SECONDS,
  formatRestSeconds,
  useRestPreference
} from "../session/use-rest-preferences";

/**
 * Rest length between sets: 0 to 10 minutes in quarter-minute steps.
 *
 * The slider, the stepper buttons, and the stored value all move in the same
 * 15-second increments, so the countdown can never land on a duration the
 * controls cannot reproduce.
 */
export function RestTimerPanel(): ReactNode {
  const { restSeconds, save, isLoaded } = useRestPreference();

  return (
    <Panel accent="cyan" eyebrow="Rest between sets">
      {!isLoaded ? (
        <Skeleton className="h-28" />
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-fg">Rest countdown</p>
              <p className="mt-1 text-[11px] leading-relaxed text-fg-muted">
                Starts automatically after each set you save. Set it to zero to turn the
                countdown off. Stored on this device.
              </p>
            </div>
            <p aria-live="polite" className="shrink-0 font-mono text-2xl text-cyan">
              {formatRestSeconds(restSeconds)}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <StepButton
              disabled={restSeconds <= REST_MIN_SECONDS}
              label="Shorten rest by 15 seconds"
              onClick={() => save(restSeconds - REST_STEP_SECONDS)}
            >
              <IconMinus />
            </StepButton>

            <input
              aria-label="Rest countdown length"
              aria-valuetext={formatRestSeconds(restSeconds)}
              className="min-h-11 min-w-0 flex-1 accent-cyan"
              max={REST_MAX_SECONDS}
              min={REST_MIN_SECONDS}
              onChange={(event) => save(Number(event.currentTarget.value))}
              step={REST_STEP_SECONDS}
              type="range"
              value={restSeconds}
            />

            <StepButton
              disabled={restSeconds >= REST_MAX_SECONDS}
              label="Extend rest by 15 seconds"
              onClick={() => save(restSeconds + REST_STEP_SECONDS)}
            >
              <IconPlus />
            </StepButton>
          </div>

          <div className="mt-1 flex justify-between text-[10px] text-outline">
            <span>Off</span>
            <span>10:00</span>
          </div>
        </>
      )}
    </Panel>
  );
}

function StepButton({
  children,
  disabled,
  label,
  onClick
}: {
  children: ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}): ReactNode {
  return (
    <button
      aria-label={label}
      className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded border border-outline-dim text-cyan transition-colors hover:border-cyan disabled:cursor-not-allowed disabled:border-outline-dim/50 disabled:text-outline"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
