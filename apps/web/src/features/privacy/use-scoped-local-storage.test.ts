import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readStoredValue, writeStoredValue, type StorageCodec } from "./use-scoped-local-storage";

function memoryStorage(initial: Record<string, string> = {}): Pick<Storage, "getItem" | "setItem"> & {
  data: Record<string, string>;
} {
  const data = { ...initial };

  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    }
  };
}

const jsonCodec: StorageCodec<{ n: number }> = {
  decode: (raw) => JSON.parse(raw) as { n: number }
};
const numberCodec: StorageCodec<number> = {
  decode: (raw) => (Number.isFinite(Number(raw)) ? Number(raw) : undefined),
  encode: String
};

describe("readStoredValue", () => {
  it("returns the stored value when storage is on", () => {
    const storage = memoryStorage({ k: '{"n":3}' });

    assert.deepEqual(readStoredValue(storage, "k", true, { n: 0 }, jsonCodec), { n: 3 });
  });

  it("ignores stored data when storage is off", () => {
    const storage = memoryStorage({ k: '{"n":3}' });

    assert.deepEqual(readStoredValue(storage, "k", false, { n: 0 }, jsonCodec), { n: 0 });
  });

  it("falls back on a missing key, corrupt JSON, a rejected value or a throwing storage", () => {
    const fallback = { n: 0 };

    assert.equal(readStoredValue(memoryStorage(), "k", true, fallback, jsonCodec), fallback);
    assert.equal(readStoredValue(memoryStorage({ k: "{" }), "k", true, fallback, jsonCodec), fallback);
    assert.equal(readStoredValue(memoryStorage({ k: "abc" }), "k", true, 7, numberCodec), 7);

    const throwing = {
      getItem: () => {
        throw new Error("SecurityError");
      }
    };

    assert.equal(readStoredValue(throwing, "k", true, fallback, jsonCodec), fallback);
  });
});

describe("writeStoredValue", () => {
  it("writes JSON by default and uses a custom encoder when given", () => {
    const storage = memoryStorage();

    writeStoredValue(storage, "a", true, { n: 1 }, jsonCodec);
    writeStoredValue(storage, "b", true, 90, numberCodec);

    assert.deepEqual(storage.data, { a: '{"n":1}', b: "90" });
  });

  it("writes nothing when storage is off and swallows quota errors", () => {
    const storage = memoryStorage();

    writeStoredValue(storage, "a", false, { n: 1 }, jsonCodec);
    assert.deepEqual(storage.data, {});

    const full = {
      setItem: () => {
        throw new Error("QuotaExceededError");
      }
    };

    assert.doesNotThrow(() => writeStoredValue(full, "a", true, { n: 1 }, jsonCodec));
  });
});
