import { backTarget } from "../../features/shell/navigation";

export type AndroidBackAction =
  | { kind: "close-keyboard" }
  | { kind: "close-modal" }
  | { kind: "history-back" }
  | { kind: "go"; path: string }
  | { kind: "exit" };

export interface AndroidBackState {
  keyboardOpen: boolean;
  modalOpen: boolean;
  /** The shell's own history list (see features/shell/navigation). */
  history: readonly string[];
  path: string;
  signedIn: boolean;
}

/**
 * What the Android back button does, in the order docs/DESIGN.md sets: close the
 * keyboard, close the top sheet, go back in the in-app history, go Home from
 * another tab root, exit on Home. Signed-out screens with nothing behind them exit.
 */
export function androidBackAction(state: AndroidBackState): AndroidBackAction {
  if (state.keyboardOpen) return { kind: "close-keyboard" };
  if (state.modalOpen) return { kind: "close-modal" };

  const target = backTarget(state.history, state.path, state.signedIn);

  if (target.kind === "history") return { kind: "history-back" };
  if (!state.signedIn) return { kind: "exit" };
  if (target.kind === "parent") return { kind: "go", path: target.path };

  return state.path === "/" ? { kind: "exit" } : { kind: "go", path: "/" };
}
