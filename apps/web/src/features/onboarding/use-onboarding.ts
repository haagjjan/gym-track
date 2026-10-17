"use client";

import { createContext, useCallback, useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../shared/api/client";

export interface OnboardingState { version: number; steps: Record<string, boolean>; }
interface LocalState { pending: Record<string, boolean>; error: string | null; }
export const OnboardingAccountContext = createContext<string | null>(null);
const emptyLocal: LocalState = { pending: {}, error: null };

export function useOnboarding() {
  const userId = useContext(OnboardingAccountContext);
  if (!userId) throw new Error("Onboarding requires an authenticated account.");
  const client = useQueryClient();
  const remoteKey = ["onboarding", userId] as const;
  const localKey = ["onboarding-pending", userId] as const;
  const remote = useQuery({
    queryKey: remoteKey,
    queryFn: async ({ signal }) => (await apiFetch<{ onboarding: OnboardingState }>("/api/users/me/onboarding", { signal })).onboarding
  });
  const local = useQuery<LocalState>({ queryKey: localKey, queryFn: () => emptyLocal, initialData: emptyLocal, enabled: false, gcTime: Infinity });
  const { mutateAsync } = useMutation({
    onMutate: async () => { await client.cancelQueries({ queryKey: remoteKey }); },
    mutationFn: async (steps: Record<string, boolean>) =>
      (await apiFetch<{ onboarding: OnboardingState }>("/api/users/me/onboarding", { method: "PATCH", body: { version: 2, steps } })).onboarding,
    onSuccess: (state, steps) => {
      // A delayed response must not erase a flag acknowledged by a newer request.
      client.setQueryData<OnboardingState>(remoteKey, (current) => ({ version: Math.max(current?.version ?? 2, state.version), steps: { ...state.steps, ...current?.steps, ...steps } }));
      client.setQueryData<LocalState>(localKey, (current = emptyLocal) => ({
        pending: Object.fromEntries(Object.entries(current.pending).filter(([key, value]) => steps[key] !== value)), error: null
      }));
    },
    onError: () => client.setQueryData<LocalState>(localKey, (current = emptyLocal) => ({ ...current, error: "Your tutorial progress could not be synced. You can keep going and retry from Help." }))
  });
  const save = useCallback(async (steps: Record<string, boolean>): Promise<void> => {
    client.setQueryData<LocalState>(["onboarding-pending", userId], (current = emptyLocal) => ({ ...current, pending: { ...current.pending, ...steps } }));
    await mutateAsync(steps).catch(() => undefined);
  }, [client, mutateAsync, userId]);
  const mark = useCallback(async (step: string): Promise<void> => {
    const remote = client.getQueryData<OnboardingState>(["onboarding", userId]);
    const local = client.getQueryData<LocalState>(["onboarding-pending", userId]);
    if (!(local?.pending[step] ?? remote?.steps[step])) await save({ [step]: true });
  }, [client, save, userId]);
  return {
    onboarding: remote.data ? { ...remote.data, steps: { ...remote.data.steps, ...local.data.pending } } : null,
    error: local.data.error ?? (remote.isError ? "Tutorial progress could not be loaded." : null),
    mark,
    retry: async (): Promise<void> => {
      const pending = client.getQueryData<LocalState>(localKey)?.pending ?? {};
      if (Object.keys(pending).length) await save(pending);
      else await remote.refetch();
    }
  };
}
