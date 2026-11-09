"use client";

import { useCallback, useEffect, useState } from "react";
import { scopedStorageKey, useDevicePrivacy } from "./device-privacy";

/**
 * How a device-local preference is stored. `decode` gets the raw string and
 * returns the value to use, or `undefined` to fall back to the default.
 * The default codec is JSON.
 */
export interface StorageCodec<T> {
  decode: (raw: string) => T | undefined;
  encode?: (value: T) => string;
}

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

/**
 * Reads a stored value. Storage that is turned off, empty, unreadable or
 * corrupt all give the fallback.
 */
export function readStoredValue<T>(
  storage: StorageReader,
  key: string,
  enabled: boolean,
  fallback: T,
  codec: StorageCodec<T>
): T {
  if (!enabled) {
    return fallback;
  }

  try {
    const raw = storage.getItem(key);

    return raw === null ? fallback : (codec.decode(raw) ?? fallback);
  } catch {
    return fallback;
  }
}

/** Writes a value when storage is on. Quota and private-mode errors are ignored. */
export function writeStoredValue<T>(
  storage: StorageWriter,
  key: string,
  enabled: boolean,
  value: T,
  codec: StorageCodec<T>
): void {
  if (!enabled) {
    return;
  }

  try {
    storage.setItem(key, codec.encode ? codec.encode(value) : JSON.stringify(value));
  } catch {
    // The value still lasts for this session.
  }
}

/**
 * A per-user, per-device preference in localStorage that honours the
 * functional-storage choice. `normalize` runs on every saved value. Pass a
 * stable `fallback` and `codec` (module constants), since they are effect
 * dependencies.
 */
export function useScopedLocalStorage<T>(
  baseKey: string,
  fallback: T,
  codec: StorageCodec<T>,
  normalize?: (value: T) => T
): { value: T; save: (next: T) => void; isLoaded: boolean } {
  const { functionalStorageEnabled, userId } = useDevicePrivacy();
  const storageKey = scopedStorageKey(baseKey, userId);
  const [value, setValue] = useState<T>(fallback);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setValue(
      readStoredValue(globalThis.localStorage, storageKey, functionalStorageEnabled, fallback, codec)
    );
    setIsLoaded(true);
  }, [codec, fallback, functionalStorageEnabled, storageKey]);

  const save = useCallback(
    (next: T): void => {
      const bounded = normalize ? normalize(next) : next;

      setValue(bounded);
      writeStoredValue(globalThis.localStorage, storageKey, functionalStorageEnabled, bounded, codec);
    },
    [codec, functionalStorageEnabled, normalize, storageKey]
  );

  return { value, save, isLoaded };
}
