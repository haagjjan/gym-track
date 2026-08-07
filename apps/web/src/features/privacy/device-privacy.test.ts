import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clearUserDeviceData } from "./device-privacy";

describe("device data clearing", () => {
  it("clears functional, filter, and active-draft data only for the selected user", () => {
    const localStorage = new MemoryStorage([
      ["body-cockpit.display.v1:user-1", "{}"],
      ["gym-progress:set-draft:user-1:workout-1:exercise-1", "{}"],
      ["gym-progress:set-draft:user-2:workout-1:exercise-1", "{}"],
      ["unrelated", "keep"]
    ]);
    const sessionStorage = new MemoryStorage([
      ["gym-progress:filters:history:user-1", "{}"],
      ["gym-progress:filters:history:user-2", "{}"]
    ]);
    const restore = installWindow(localStorage, sessionStorage);
    try {
      clearUserDeviceData("user-1");

      assert.equal(localStorage.getItem("body-cockpit.display.v1:user-1"), null);
      assert.equal(localStorage.getItem("gym-progress:set-draft:user-1:workout-1:exercise-1"), null);
      assert.equal(sessionStorage.getItem("gym-progress:filters:history:user-1"), null);
      assert.notEqual(localStorage.getItem("gym-progress:set-draft:user-2:workout-1:exercise-1"), null);
      assert.notEqual(sessionStorage.getItem("gym-progress:filters:history:user-2"), null);
      assert.equal(localStorage.getItem("unrelated"), "keep");
    } finally {
      restore();
    }
  });
});

class MemoryStorage {
  private readonly values: Map<string, string>;

  public constructor(entries: Array<[string, string]>) {
    this.values = new Map(entries);
  }

  public get length(): number { return this.values.size; }
  public getItem(key: string): string | null { return this.values.get(key) ?? null; }
  public key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  public removeItem(key: string): void { this.values.delete(key); }
}

function installWindow(localStorage: MemoryStorage, sessionStorage: MemoryStorage): () => void {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage, sessionStorage }
  });
  return () => {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  };
}
