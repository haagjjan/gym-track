"use client";

import { createContext, useContext, type ReactNode } from "react";

const ExtendedTrackingContext = createContext(false);

/** Makes the server's `ENABLE_EXTENDED_TRACKING` flag readable in client components. */
export function ExtendedTrackingProvider({ children, enabled }: { children: ReactNode; enabled: boolean }): ReactNode {
  return <ExtendedTrackingContext.Provider value={enabled}>{children}</ExtendedTrackingContext.Provider>;
}

/** True when time and cardio exercises are switched on. */
export function useExtendedTracking(): boolean {
  return useContext(ExtendedTrackingContext);
}
