"use client";

import type { ReactNode } from "react";
import { Skeleton } from "../../shared/ui/ui";
import { IconMinus, IconPlus } from "../../shared/ui/icons";
import {
  REST_MAX_SECONDS,
  REST_MIN_SECONDS,
  REST_STEP_SECONDS,
  formatRestSeconds,
  useRestPreference
} from "../session/use-rest-preferences";
import { Group, Row, SavedStatus, useSavedFlash } from "./settings-ui";

/**
 * Rest length between sets: 0 to 10 minutes in quarter-minute steps.
 *
 * The slider, the stepper buttons, and the stored value all move in the same
 * 15-second increments, so the countdown can never land on a duration the
 * controls cannot reproduce.
 */
export function RestTimerPanel(): ReactNode {
  const { restSeconds, save: saveRest, isLoaded } = useRestPreference();
  const { flash, saved } = useSavedFlash();
  const save = (seconds: number): void => { saveRest(seconds); flash(); };

  return (
    <div className="space-y-2"><Group><Row>
      {!isLoaded ? (
        <Skeleton className="h-24" />
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-footnote text-text-secondary">
                Starts after each set you save. Set it to 0 to turn the countdown off.
              </p>
            </div>
            <p aria-live="polite" className="shrink-0 num text-title-2 text-accent">
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
              className="min-h-11 min-w-0 flex-1 accent-accent"
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

          <div className="mt-1 flex justify-between text-caption text-text-muted">
            <span>Off</span>
            <span>10:00</span>
          </div>
        </>
      )}
    </Row></Group><SavedStatus saved={saved} /></div>
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
      className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--text)_9%,transparent)] text-accent active:opacity-70 disabled:cursor-not-allowed disabled:text-text-muted"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
