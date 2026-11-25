"use client";

import { createContext, useCallback, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { practiceWorkout } from "./demo-data";
import { initialDemoState, type DemoState } from "./demo-state";

interface DemoContextValue { state: DemoState; setState: Dispatch<SetStateAction<DemoState>>; record: (event: string) => void; }
const DemoContext = createContext<DemoContextValue | null>(null);
export function DemoProvider({ children, startWithPractice = false }: { children: ReactNode; startWithPractice?: boolean }): ReactNode {
  const [state, setState] = useState(() => {
    const now = Date.now();
    const base = initialDemoState(now);
    return startWithPractice ? { ...base, entered: true, practice: practiceWorkout(now) } : base;
  });
  const record = useCallback((event: string): void => {
    setState((current) => current.events.includes(event) ? current : { ...current, events: [...current.events, event] });
  }, []);
  return <DemoContext.Provider value={{ state, setState, record }}>{children}</DemoContext.Provider>;
}
export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error("Example controls require the demo route layout.");
  return value;
}
export function useDemoWorkouts() {
  const { state } = useDemo();
  return state.practice && !state.practice.isOpen ? [state.practice, ...state.samples] : state.samples;
}
