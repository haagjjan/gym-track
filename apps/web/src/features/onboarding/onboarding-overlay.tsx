"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useModalBehavior } from "../../shared/ui/use-modal-behavior";
import { HudButton } from "../../shared/ui/ui";
import { useOnboarding } from "./use-onboarding";

const tourSteps = [
  { title: "Welcome, Founding Member", body: "The center Workout action starts or resumes a session. Your access has no scheduled expiry." },
  { title: "Log in the moment", body: "Choose exercises, add working or warmup sets, record reps, weight and RIR, then finish the session." },
  { title: "Review the signal", body: "History keeps completed sessions. Progress tracks exercise performance. Volume explains weekly working-set distribution." },
  { title: "Help stays available", body: "Replay this tour, try a private practice workout, and open contextual ? buttons from Help & Tutorial in Settings." }
] as const;

export function OnboardingOverlay({ pathname }: { pathname: string }): ReactNode {
  const { onboarding, mark } = useOnboarding();
  const [step, setStep] = useState(0);
  const [replay, setReplay] = useState(false);
  useEffect(() => {
    function start(): void { setStep(0); setReplay(true); }
    if (window.sessionStorage.getItem("gym:replay-tour") === "1") {
      window.sessionStorage.removeItem("gym:replay-tour");
      start();
    }
    window.addEventListener("gym:replay-tour", start);
    return () => window.removeEventListener("gym:replay-tour", start);
  }, []);
  useEffect(() => {
    const mapped = pathname === "/workouts" ? "history" : pathname === "/progress" ? "progress" : pathname === "/weekly-volume" ? "volume" : null;
    if (mapped) void mark(mapped);
  }, [mark, pathname]);
  const visible = Boolean(pathname === "/" && onboarding && (!onboarding.steps.tour || replay));
  const dismiss = (): void => { setReplay(false); void mark("tour"); };
  const dialogRef = useModalBehavior<HTMLElement>({
    initialFocus: "dialog",
    isOpen: visible,
    onClose: dismiss
  });
  if (!visible) return null;
  const current = tourSteps[step] ?? tourSteps[0];
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-4 sm:items-center"><section aria-labelledby="tour-title" aria-modal="true" className="w-full max-w-lg rounded-xl border border-cyan/50 bg-surface p-5 text-fg shadow-2xl" ref={dialogRef} role="dialog" tabIndex={-1}><p className="label-caps text-cyan">GUIDED_TOUR · {step + 1}/{tourSteps.length}</p><h2 className="mt-2 font-display text-xl font-bold" id="tour-title">{current.title}</h2><p className="mt-3 text-sm leading-relaxed text-fg-muted">{current.body}</p><div className="mt-5 grid grid-cols-[auto_1fr] gap-2"><HudButton onClick={dismiss} variant="ghost">DISMISS</HudButton><HudButton onClick={() => { if (step === tourSteps.length - 1) dismiss(); else setStep((value) => value + 1); }}>{step === tourSteps.length - 1 ? "FINISH TOUR" : "NEXT"}</HudButton></div></section></div>;
}
