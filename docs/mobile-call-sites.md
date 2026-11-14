# Web-to-Mobile Call Sites

Inventory of browser-side and server-coupled call sites in `apps/web/src` (excluding `apps/web/src/app/api/**` and `*.test.*`).

## 1. `fetch(` Calls

| File | Line | Scope | Snippet |
| --- | --- | --- | --- |
| `apps/web/src/shared/save-file.ts` | 35 | client | `const response = await fetch(url, { credentials: "same-origin", ...init });` |
| `apps/web/src/shared/api/client.ts` | 44 | client | `response = await fetch(url, init);` |
| `apps/web/src/shared/api/csv.ts` | 26 | client | `const response = await fetch(url, {` |
| `apps/web/src/shared/api/csv.ts` | 63 | client | `const response = await fetch("/api/tracking/import.csv", { method: "POST", headers: { "content-type": "text/csv" }, b...` |
| `apps/web/src/features/settings/privacy-data-panel.tsx` | 36 | client | `const response = await fetch("/api/users/me/export", {` |
| `apps/web/src/features/analytics/analytics-api-proxy.ts` | 20 | server-only | `const upstream = await fetch(buildApiUrl(request, targetPath), {` |
| `apps/web/src/features/workouts/workout-api-proxy.ts` | 30 | server-only | `const upstream = await fetch(buildApiUrl(request, targetPath), init);` |
| `apps/web/src/features/auth/auth-api-proxy.ts` | 39 | server-only | `const upstream = await fetch(\`${getApiBaseUrl()}/auth/${target}\`, init);` |
| `apps/web/src/features/status/public-status-proxy.ts` | 29 | server-only | `const upstream = await fetch(\`${getApiBaseUrl()}/status-metrics\`, {` |
| `apps/web/src/features/auth/server-auth.ts` | 22 | server-only | `const response = await fetch(\`${getApiBaseUrl()}/auth/me\`, {` |

## 2. `"/api/"` String and Template Literals

### `apps/web/src/request-security.ts`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/request-security.ts` | 289 | `isApiPath` | other (pathname prefix check) | `return pathname === "/api" \|\| pathname.startsWith("/api/");` |

### `apps/web/src/shared/api-base-url.ts`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/shared/api-base-url.ts` | 2 | module (`getApiBaseUrl`) | other (default base path constant) | `const DEFAULT_API_BASE_PATH = "/api/v1";` |

### `apps/web/src/shared/server-logging.ts`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/shared/server-logging.ts` | 83 | `normalizeTargetPath` | other (log route normalization) | `return \`/api/${segments.map(normalizeSegment).join("/")}\`;` |

### `apps/web/src/shared/api/csv.ts`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/shared/api/csv.ts` | 3 | module (`CSV_EXPORT_URL`) | other (exported constant; passed to `fetchFile` -> raw `fetch`) | `export const CSV_EXPORT_URL = "/api/workouts/export.csv";` |
| `apps/web/src/shared/api/csv.ts` | 4 | module (`TRACKING_CSV_EXPORT_URL`) | other (exported constant; passed to `fetchFile` -> raw `fetch`) | `export const TRACKING_CSV_EXPORT_URL = "/api/tracking/export.csv";` |
| `apps/web/src/shared/api/csv.ts` | 50 | `previewWorkoutCsv` | raw `fetch` (via `postCsv`) | `return postCsv("/api/workouts/import.csv/preview", file);` |
| `apps/web/src/shared/api/csv.ts` | 55 | `importWorkoutCsv` | raw `fetch` (via `postCsv`) | `? "/api/workouts/import.csv?confirmNameWarnings=true"` |
| `apps/web/src/shared/api/csv.ts` | 56 | `importWorkoutCsv` | raw `fetch` (via `postCsv`) | `: "/api/workouts/import.csv";` |
| `apps/web/src/shared/api/csv.ts` | 63 | `importTrackingCsv` | raw `fetch` | `const response = await fetch("/api/tracking/import.csv", { method: "POST", headers: { "content-type": "text/csv" }, b...` |

### `apps/web/src/shared/api/hooks.ts`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/shared/api/hooks.ts` | 49 | `useWorkoutsInfinite` | `apiFetch` | `\`/api/workouts?${workoutListParams(options, HISTORY_PAGE_SIZE, pageParam)}\`,` |
| `apps/web/src/shared/api/hooks.ts` | 72 | `useExerciseProgress` | `apiFetch` | `\`/api/analytics/exercises/${exerciseId}/progress\`,` |
| `apps/web/src/shared/api/hooks.ts` | 85 | `useWorkouts` | `apiFetch` | `apiFetch<ListWorkoutsPayload>(\`/api/workouts?limit=${limit}&offset=0\`, { signal })` |
| `apps/web/src/shared/api/hooks.ts` | 94 | `useWorkout` | `apiFetch` | `\`/api/workouts/${workoutId}\`,` |
| `apps/web/src/shared/api/hooks.ts` | 109 | `useCompletedExercises` | `apiFetch` | `\`/api/analytics/exercises?timeZone=${encodeURIComponent(timeZone)}\`,` |
| `apps/web/src/shared/api/hooks.ts` | 149 | `useWeeklyVolume` | `apiFetch` | `\`/api/analytics/weekly-volume?startDate=${startDate}&endDate=${endDate}\`,` |
| `apps/web/src/shared/api/hooks.ts` | 183 | `useWorkoutMutations` (`createWorkout`) | `apiFetch` | `const payload = await apiFetch<{ workout: WorkoutDetail }>("/api/workouts", {` |
| `apps/web/src/shared/api/hooks.ts` | 196 | `useWorkoutMutations` (`endWorkout`) | `apiFetch` | `\`/api/workouts/${workoutId}/end\`,` |
| `apps/web/src/shared/api/hooks.ts` | 214 | `useWorkoutMutations` (`updateWorkout`) | `apiFetch` | `\`/api/workouts/${workoutId}\`,` |
| `apps/web/src/shared/api/hooks.ts` | 225 | `useWorkoutMutations` (`deleteWorkout`) | `apiFetch` | `apiFetch<void>(\`/api/workouts/${workoutId}\`, { method: "DELETE" }),` |
| `apps/web/src/shared/api/hooks.ts` | 246 | `useMergeExercises` | `apiFetch` | `\`/api/exercises/${sourceExerciseId}/merge\`,` |
| `apps/web/src/shared/api/hooks.ts` | 288 | `exerciseSummaryUrl` (`useExerciseSummary`) | `apiFetch` | `const path = \`/api/analytics/exercises/${exerciseId}/summary\`;` |

### `apps/web/src/shared/api/session-hooks.ts`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/shared/api/session-hooks.ts` | 43 | `useSessionMutations` (`addExercise`) | `apiFetch` | `const payload = await apiFetch<{ replayed: boolean; sessionExercise: SessionExercise }>(\`/api/workouts/${workoutId}/...` |
| `apps/web/src/shared/api/session-hooks.ts` | 58 | `useSessionMutations` (`removeExercise`) | `apiFetch` | `mutationFn: ({ sessionExerciseId }: { sessionExerciseId: string }) => apiFetch(\`/api/workouts/${workoutId}/exercise...` |
| `apps/web/src/shared/api/session-hooks.ts` | 62 | `useSessionMutations` (`reorderExercises`) | `apiFetch` | `mutationFn: ({ items }: { items: { sessionExerciseId: string; position: number }[] }) => apiFetch(\`/api/workouts/${w...` |
| `apps/web/src/shared/api/session-hooks.ts` | 84 | `useSessionMutations` (`addSet`) | `apiFetch` | `const payload = await apiFetch<{ replayed: boolean; set: WorkoutSet }>(\`/api/workouts/${workoutId}/exercises/${sessi...` |
| `apps/web/src/shared/api/session-hooks.ts` | 91 | `useSessionMutations` (`updateSet`) | `apiFetch` | `const payload = await apiFetch<{ set: WorkoutSet }>(\`/api/sets/${setId}\`, { method: "PATCH", body: input });` |
| `apps/web/src/shared/api/session-hooks.ts` | 97 | `useSessionMutations` (`deleteSet`) | `apiFetch` | `mutationFn: ({ setId }: { setId: string }) => apiFetch(\`/api/sets/${setId}\`, { method: "DELETE" }),` |

### `apps/web/src/shared/api/catalog-hooks.ts`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/shared/api/catalog-hooks.ts` | 30 | `useMuscleGroups` | `apiFetch` | `const payload = await apiFetch<{ items: MuscleGroup[] }>("/api/muscle-groups", { signal });` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 45 | `useExerciseSearch` | `apiFetch` | `const payload = await apiFetch<{ items: Exercise[] }>(\`/api/exercises?${params}\`, { signal });` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 83 | `useExercisesInfinite` | `apiFetch` | `return apiFetch<ExerciseListPayload>(\`/api/exercises?${params}\`, { signal });` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 99 | `useExercises` | `apiFetch` | `const payload = await apiFetch<{ items: Exercise[] }>(\`/api/exercises?${params}\`, { signal });` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 109 | `useExerciseOptions` | `apiFetch` | `queryFn: ({ signal }) => apiFetch<ExerciseOptions>("/api/exercises/options", { signal })` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 119 | `useExerciseNameSuggestions` | `apiFetch` | `const payload = await apiFetch<{ items: Exercise[] }>(\`/api/exercises/name-suggestions?name=${encodeURIComponent(t...` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 138 | `useExerciseMutations` (`create`) | `apiFetch` | `const payload = await apiFetch<{ exercise: Exercise }>("/api/exercises", { method: "POST", body: input });` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 145 | `useExerciseMutations` (`update`) | `apiFetch` | `const payload = await apiFetch<{ exercise: Exercise }>(\`/api/exercises/${exerciseId}\`, { method: "PATCH", body: in...` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 167 | `useTemplates` | `apiFetch` | `const payload = await apiFetch<{ items: WorkoutTemplate[] }>(\`/api/workout-templates?${params}\`, { signal });` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 177 | `useUserPreferences` | `apiFetch` | `const payload = await apiFetch<{ preferences: UserPreferences }>("/api/users/me/preferences", { signal });` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 187 | `useUpdateUserPreferences` | `apiFetch` | `const payload = await apiFetch<{ preferences: UserPreferences }>("/api/users/me/preferences", { method: "PATCH", bod...` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 213 | `useTemplateMutations` (`create`) | `apiFetch` | `const create = useTemplateMutation(async (input: { name: string; exerciseIds: string[] }) => (await apiFetch<{ temp...` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 214 | `useTemplateMutations` (`update`) | `apiFetch` | `const update = useTemplateMutation(async ({ templateId, ...input }: { templateId: string; name?: string; exerciseIds...` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 215 | `useTemplateMutations` (`duplicate`) | `apiFetch` | `const duplicate = useTemplateMutation(async ({ templateId }: { templateId: string }) => (await apiFetch<{ template:...` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 216 | `useTemplateMutations` (`remove`) | `apiFetch` | `const remove = useTemplateMutation(({ templateId }: { templateId: string }) => apiFetch(\`/api/workout-templates/${...` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 217 | `useTemplateMutations` (`start`) | `apiFetch` | `const start = useTemplateMutation(async ({ templateId }: { templateId: string }) => (await apiFetch<{ workout: { wo...` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 218 | `useTemplateMutations` (`createFromWorkout`) | `apiFetch` | `const createFromWorkout = useTemplateMutation(async ({ workoutId, name }: { workoutId: string; name: string }) => (...` |
| `apps/web/src/shared/api/catalog-hooks.ts` | 219 | `useTemplateMutations` (`updateFromWorkout`) | `apiFetch` | `const updateFromWorkout = useTemplateMutation(async ({ templateId, workoutId }: { templateId: string; workoutId: s...` |

### `apps/web/src/features/admin/audit-admin-panel.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/admin/audit-admin-panel.tsx` | 25 | `AuditAdminPanel` (`load`) | `apiFetch` | `const page = await apiFetch<AuditPage>(\`/api/admin/audit-events${query}\`);` |

### `apps/web/src/features/admin/campaign-admin-panel.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/admin/campaign-admin-panel.tsx` | 76 | `CampaignAdminPanel` (`load`) | `apiFetch` | `apiFetch<{ items: AdminUser[] }>("/api/admin/users"),` |
| `apps/web/src/features/admin/campaign-admin-panel.tsx` | 77 | `CampaignAdminPanel` (`load`) | `apiFetch` | `apiFetch<{ items: Campaign[] }>("/api/admin/campaigns")` |
| `apps/web/src/features/admin/campaign-admin-panel.tsx` | 95 | `CampaignAdminPanel` (`runAction`) | `apiFetch` | `await apiFetch(\`/api/admin/campaigns/${encodeURIComponent(campaign.id)}/action\`, {` |
| `apps/web/src/features/admin/campaign-admin-panel.tsx` | 219 | `CampaignAdminPanel` (`create`) | `apiFetch` | `await apiFetch("/api/admin/campaigns", {` |

### `apps/web/src/features/admin/campaign-responses-panel.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/admin/campaign-responses-panel.tsx` | 38 | `CampaignResponsesPanel` | `apiFetch` | `void apiFetch<CampaignReport>(\`/api/admin/campaigns/${encodeURIComponent(campaignId)}/responses\`)` |

### `apps/web/src/features/admin/campaign-switch.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/admin/campaign-switch.tsx` | 18 | `CampaignSwitch` | `apiFetch` | `void apiFetch<AdminSettings>("/api/admin/settings")` |
| `apps/web/src/features/admin/campaign-switch.tsx` | 27 | `CampaignSwitch` (`toggle`) | `apiFetch` | `const next = await apiFetch<AdminSettings>("/api/admin/settings", {` |

### `apps/web/src/features/admin/deletion-support-panel.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/admin/deletion-support-panel.tsx` | 17 | `DeletionSupportPanel` (`load`) | `apiFetch` | `const result = await apiFetch<{ items: AdminUser[] }>("/api/admin/users");` |
| `apps/web/src/features/admin/deletion-support-panel.tsx` | 28 | `DeletionSupportPanel` (`cancel`) | `apiFetch` | `const result = await apiFetch<{ notificationStatus: "FAILED" \| "SENT" }>(\`/api/admin/users/${encodeURIComponent(se...` |

### `apps/web/src/features/admin/overview-panel.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/admin/overview-panel.tsx` | 30 | `OverviewPanel` (`load`) | `apiFetch` | `apiFetch<AdminOverview>("/api/admin/overview"),` |
| `apps/web/src/features/admin/overview-panel.tsx` | 31 | `OverviewPanel` (`load`) | `apiFetch` | `apiFetch<{ items: AdminUser[] }>("/api/admin/users")` |

### `apps/web/src/features/admin/user-admin-panel.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/admin/user-admin-panel.tsx` | 26 | `UserAdminPanel` (`load`) | `apiFetch` | `const result = await apiFetch<{ items: AdminUser[] }>("/api/admin/users");` |
| `apps/web/src/features/admin/user-admin-panel.tsx` | 107 | `statusUrl` (`applyAction`) | `apiFetch` | `function statusUrl(userId: string): string { return \`/api/admin/users/${encodeURIComponent(userId)}/status\`; }` |
| `apps/web/src/features/admin/user-admin-panel.tsx` | 108 | `sessionUrl` (`applyAction`) | `apiFetch` | `function sessionUrl(userId: string): string { return \`/api/admin/users/${encodeURIComponent(userId)}/sessions/rev...` |

### `apps/web/src/features/auth/account-flow-screens.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/auth/account-flow-screens.tsx` | 39 | `ForgotPasswordScreen` (`handleSubmit`) | `apiFetch` | `await apiFetch("/api/auth/forgot-password", { method: "POST", body: { email } });` |
| `apps/web/src/features/auth/account-flow-screens.tsx` | 111 | `ResetPasswordScreen` (`handleSubmit`) | `apiFetch` | `await apiFetch("/api/auth/reset-password", {` |
| `apps/web/src/features/auth/account-flow-screens.tsx` | 184 | `VerifyEmailScreen` | `apiFetch` | `apiFetch("/api/auth/verify-email", { method: "POST", body: { token } })` |

### `apps/web/src/features/auth/auth-screen.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/auth/auth-screen.tsx` | 114 | `AuthScreen` (`handleSubmit`) | `apiFetch` | `await apiFetch(\`/api/auth/${mode}\`, { method: "POST", body });` |

### `apps/web/src/features/auth/cancel-deletion-screen.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/auth/cancel-deletion-screen.tsx` | 19 | `CancelDeletionScreen` (`cancel`) | `apiFetch` | `"/api/users/me/deletion/cancel",` |

### `apps/web/src/features/launch/launch-screen.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/launch/launch-screen.tsx` | 33 | `LaunchScreen` (`startFromScratch`) | `apiFetch` | `const payload = await apiFetch<{ workout: WorkoutDetail }>("/api/workouts", {` |

### `apps/web/src/features/messages/message-center.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/messages/message-center.tsx` | 28 | `MessageCenter` (`load`) | `apiFetch` | `const result = await apiFetch<{ items: UserMessage[] }>("/api/messages").catch(() => ({ items: [] }));` |
| `apps/web/src/features/messages/message-center.tsx` | 38 | `MessageCenter` (`dismiss`) | `apiFetch` | `await apiFetch(\`/api/messages/${encodeURIComponent(message.id)}/dismiss\`, { method: "POST", body: {} });` |
| `apps/web/src/features/messages/message-center.tsx` | 53 | `MessageCenter` (`respond`) | `apiFetch` | `await apiFetch(\`/api/messages/${encodeURIComponent(message.id)}/respond\`, { method: "POST", body: response });` |

### `apps/web/src/features/messages/message-inbox.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/messages/message-inbox.tsx` | 15 | `MessageInbox` | `apiFetch` | `useEffect(() => { void apiFetch<{ items: InboxMessage[] }>("/api/messages?inbox=true").then((result) => setItems(re...` |

### `apps/web/src/features/onboarding/demo-copy-template.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/onboarding/demo-copy-template.tsx` | 27 | `DemoCopyTemplate` (`copy`) | `apiFetch` | `const result = await apiFetch<{ items: Exercise[] }>(\`/api/exercises?search=${encodeURIComponent(expected.name)}&li...` |

### `apps/web/src/features/onboarding/use-onboarding.ts`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/onboarding/use-onboarding.ts` | 20 | `useOnboarding` | `apiFetch` | `queryFn: async ({ signal }) => (await apiFetch<{ onboarding: OnboardingState }>("/api/users/me/onboarding", { signal...` |
| `apps/web/src/features/onboarding/use-onboarding.ts` | 26 | `useOnboarding` | `apiFetch` | `(await apiFetch<{ onboarding: OnboardingState }>("/api/users/me/onboarding", { method: "PATCH", body: { version: 2,...` |

### `apps/web/src/features/privacy/device-privacy.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/privacy/device-privacy.tsx` | 35 | `DevicePrivacyProvider` | `apiFetch` | `void apiFetch<{ preferences: PrivacyPreferences }>("/api/users/me/privacy-preferences")` |
| `apps/web/src/features/privacy/device-privacy.tsx` | 46 | `DevicePrivacyProvider` (`update`) | `apiFetch` | `const result = await apiFetch<{ preferences: PrivacyPreferences }>("/api/users/me/privacy-preferences", { method: "...` |

### `apps/web/src/features/session/session-screen.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/session/session-screen.tsx` | 55 | `SessionScreen` | `apiFetch` | `queryFn: () => apiFetch<TrackingPayload>(\`/api/tracking/workouts/${workoutId}\`) });` |

### `apps/web/src/features/session/use-start-session.ts`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/session/use-start-session.ts` | 45 | `findOpenWorkout` (`useStartSession`) | `apiFetch` | `const payload = await apiFetch<ListWorkoutsPayload>("/api/workouts?limit=10&offset=0");` |

### `apps/web/src/features/settings/privacy-data-panel.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/settings/privacy-data-panel.tsx` | 36 | `PrivacyDataPanel` (`exportAccount`) | raw `fetch` | `const response = await fetch("/api/users/me/export", {` |
| `apps/web/src/features/settings/privacy-data-panel.tsx` | 52 | `PrivacyDataPanel` (`deleteAccount`) | `apiFetch` | `const result = await apiFetch<{ deletionDueAt: string }>("/api/users/me/deletion", {` |

### `apps/web/src/features/settings/settings-screen.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/settings/settings-screen.tsx` | 40 | `SettingsScreen` (`logout`) | `apiFetch` | `await apiFetch("/api/auth/logout", { method: "POST", body: {} }).catch(() => null);` |
| `apps/web/src/features/settings/settings-screen.tsx` | 149 | `EmailVerificationNotice` (`resend`) | `apiFetch` | `const result = await apiFetch<{ status: "FAILED" \| "NOT_REQUIRED" \| "SENT" }>("/api/auth/resend-verification", { me...` |

### `apps/web/src/features/shell/app-shell.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/shell/app-shell.tsx` | 276 | `DesktopSidebar` (`handleLogout`) | `apiFetch` | `await apiFetch("/api/auth/logout", { method: "POST", body: {} }).catch(() => null);` |

### `apps/web/src/features/shell/home-header-actions.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/shell/home-header-actions.tsx` | 20 | `useHasPendingMessages` | `apiFetch` | `queryFn: ({ signal }) => apiFetch<{ items: unknown[] }>("/api/messages", { signal }),` |

### `apps/web/src/features/templates/templates-screen.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/templates/templates-screen.tsx` | 46 | `TemplatesScreen` | `apiFetch` | `queryFn: async ({ signal }) => (await apiFetch<{ template: WorkoutTemplate }>(\`/api/workout-templates/${initialTempl...` |

### `apps/web/src/features/tracking/tracking-progress.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/tracking/tracking-progress.tsx` | 19 | `TrackingProgress` | `apiFetch` | `const query = useQuery({ queryKey: ["tracking-progress"], queryFn: () => apiFetch<TrackingPayload>("/api/tracking/p...` |

### `apps/web/src/features/tracking/tracking-readout.tsx`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/tracking/tracking-readout.tsx` | 10 | `TrackingReadout` | `apiFetch` | `const query = useQuery({ queryKey: ["tracking", workoutId], queryFn: () => apiFetch<TrackingPayload>(\`/api/tracking...` |

### `apps/web/src/features/tracking/use-tracking.ts`

| File | Line | Function / Hook | Mechanism | Snippet |
| --- | --- | --- | --- | --- |
| `apps/web/src/features/tracking/use-tracking.ts` | 10 | `useTracking` | `apiFetch` | `const prefix = \`/api/tracking/workouts/${encodeURIComponent(workoutId)}\`;` |

## 3. Server Imports and `process.env` Reads in `features/**` and `shared/**`

| File | Line | What Is Read / Imported | Snippet |
| --- | --- | --- | --- |
| `apps/web/src/shared/client-diagnostics.ts` | 74 | `process.env.NODE_ENV` | `return process.env.NODE_ENV !== "production"` |
| `apps/web/src/shared/client-diagnostics.ts` | 75 | `process.env.NEXT_PUBLIC_CLIENT_DIAGNOSTICS` | `\|\| process.env.NEXT_PUBLIC_CLIENT_DIAGNOSTICS === "1";` |
| `apps/web/src/shared/server-logging.ts` | 67 | `process.env.APP_ENV`, `process.env.NODE_ENV` | `environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? "unknown",` |
| `apps/web/src/shared/server-logging.ts` | 68 | `process.env.APP_RELEASE` | `version: process.env.APP_RELEASE ?? "unknown",` |
| `apps/web/src/shared/api-base-url.ts` | 5 | `process.env.API_BASE_URL`, `process.env.NEXT_PUBLIC_API_BASE_URL` | `const configuredUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;` |
| `apps/web/src/shared/api-base-url.ts` | 11 | `process.env.API_INTERNAL_HOSTPORT` | `const internalHostport = process.env.API_INTERNAL_HOSTPORT;` |
| `apps/web/src/shared/api-base-url.ts` | 14 | `process.env.API_BASE_PATH` | `const basePath = process.env.API_BASE_PATH ?? DEFAULT_API_BASE_PATH;` |
| `apps/web/src/shared/bff-client-attribution.ts` | 9 | `process.env.BFF_CLIENT_IP_SECRET` | `const secret = process.env.BFF_CLIENT_IP_SECRET;` |
| `apps/web/src/features/analytics/analytics-api-proxy.ts` | 1 | `next/server` (`NextRequest`) | `import type { NextRequest } from "next/server";` |
| `apps/web/src/features/analytics/analytics-api-proxy.ts` | 2 | `next/server` (`NextResponse`) | `import { NextResponse } from "next/server";` |
| `apps/web/src/features/workouts/workout-api-proxy.ts` | 1 | `next/server` (`NextRequest`) | `import type { NextRequest } from "next/server";` |
| `apps/web/src/features/workouts/workout-api-proxy.ts` | 2 | `next/server` (`NextResponse`) | `import { NextResponse } from "next/server";` |
| `apps/web/src/features/auth/server-auth.ts` | 1 | `next/headers` (`cookies`, `headers`) | `import { cookies, headers } from "next/headers";` |
| `apps/web/src/features/auth/auth-api-proxy.ts` | 1 | `next/server` (`NextRequest`) | `import type { NextRequest } from "next/server";` |
| `apps/web/src/features/auth/auth-api-proxy.ts` | 2 | `next/server` (`NextResponse`) | `import { NextResponse } from "next/server";` |
| `apps/web/src/features/status/public-status-proxy.ts` | 1 | `next/server` (`NextRequest`) | `import type { NextRequest } from "next/server";` |
| `apps/web/src/features/status/public-status-proxy.ts` | 2 | `next/server` (`NextResponse`) | `import { NextResponse } from "next/server";` |
| `apps/web/src/features/legal/legal-page.tsx` | 52 | `process.env.SUPPORT_EMAIL` | `const supportEmail = process.env.SUPPORT_EMAIL;` |
| `apps/web/src/features/legal/legal-page.tsx` | 55 | `process.env.CONTROLLER_NAME` | `controller: process.env.CONTROLLER_NAME ?? "Controller name not configured",` |
| `apps/web/src/features/legal/legal-page.tsx` | 56 | `process.env.CONTROLLER_ADDRESS` | `address: process.env.CONTROLLER_ADDRESS ?? "Controller address not configured",` |
| `apps/web/src/features/legal/legal-page.tsx` | 57 | `process.env.PRIVACY_EMAIL` | `privacyEmail: process.env.PRIVACY_EMAIL ?? "Privacy contact not configured",` |
| `apps/web/src/features/legal/legal-page.tsx` | 61 | `process.env.SECURITY_EMAIL` | `securityEmail: process.env.SECURITY_EMAIL ?? supportEmail ?? "Security contact not configured"` |
| `apps/web/src/features/legal/legal-page.tsx` | 67 | `process.env.CONTROLLER_NAME` | `process.env.CONTROLLER_NAME &&` |
| `apps/web/src/features/legal/legal-page.tsx` | 68 | `process.env.CONTROLLER_ADDRESS` | `process.env.CONTROLLER_ADDRESS &&` |
| `apps/web/src/features/legal/legal-page.tsx` | 69 | `process.env.PRIVACY_EMAIL` | `process.env.PRIVACY_EMAIL &&` |
| `apps/web/src/features/legal/legal-page.tsx` | 70 | `process.env.SUPPORT_EMAIL` | `process.env.SUPPORT_EMAIL` |
| `apps/web/src/features/auth/registration-mode.ts` | 5 | `process.env` (default parameter) | `source: EnvironmentSource = process.env` |
| `apps/web/src/features/auth/registration-mode.ts` | 20 | `process.env` (default parameter) | `export function isRegistrationEnabled(source: EnvironmentSource = process.env): boolean {` |

Note: `0` imports of `"server-only"`.

## 4. `target="_blank"` and `window.open(` Usages

| File | Line | URL Expression | Snippet |
| --- | --- | --- | --- |
| `apps/web/src/app/support/page.tsx` | 15 | `"https://status.gymtrack.ch"` | `<a className="text-accent underline" href="https://status.gymtrack.ch" rel="noreferrer" target="_blank">service stat...` |
| `apps/web/src/app/support/page.tsx` | 17 | `"https://www.tripo3d.ai/"` | `<a href="https://www.tripo3d.ai/" className="text-accent underline" rel="noreferrer" target="_blank">Tripo 3D</a>` |
| `apps/web/src/app/support/page.tsx` | 17 | `"https://creativecommons.org/licenses/by/4.0/"` | `<a href="https://creativecommons.org/licenses/by/4.0/" className="text-accent underline" rel="noreferrer" target="_blank...` |
| `apps/web/src/features/settings/help-support-panel.tsx` | 24 | `supportUrl` | `<a className={rowClass} href={supportUrl} rel="noreferrer" target="_blank">` |
| `apps/web/src/features/messages/message-inbox.tsx` | 30 | `message.actionUrl` | `{message.actionUrl ? <a className="inline-flex min-h-11 items-center break-all text-body text-accent" href={message.a...` |
| `apps/web/src/features/messages/message-center.tsx` | 78 | `message.actionUrl` | `{message.actionUrl ? <a className="mt-1 inline-flex min-h-11 items-center break-all text-body text-accent" href={m...` |

Note: `0` calls to `window.open(`.

## 5. `save-file.ts` Exports and Download Mechanisms

| File | Line | Mechanism | Snippet |
| --- | --- | --- | --- |
| `apps/web/src/shared/save-file.ts` | 24 | `URL.createObjectURL` | `const url = URL.createObjectURL(file);` |
| `apps/web/src/shared/save-file.ts` | 27 | `<a download>` (`link.download`) | `link.download = file.name;` |
| `apps/web/src/shared/save-file.ts` | 38 | `content-disposition` header parse | `const name = /filename="?([^";]+)"?/i.exec(response.headers.get("content-disposition") ?? "")?.[1] ?? fallbackName;` |
| `apps/web/src/features/settings/privacy-data-panel.tsx` | 44 | `saveFile` export | `const result = await saveFile(file);` |
| `apps/web/src/features/history/csv-panel.tsx` | 62 | `saveFile` export | `const result = await saveFile(exported);` |
| `apps/web/src/features/history/csv-panel.tsx` | 72 | `fetchFile` export | `? await fetchFile(CSV_EXPORT_URL, "gym-workouts.csv")` |
| `apps/web/src/features/history/csv-panel.tsx` | 73 | `fetchFile` export | `: await fetchFile(TRACKING_CSV_EXPORT_URL, "gym-time-cardio.csv");` |
| `apps/web/src/features/history/csv-format-dialog.tsx` | 64 | `<a download>` (data URI) | `<a className={buttonClass("secondary")} download="gym-workouts-sample.csv" href={\`data:text/csv;charset=utf-8,${en...` |
| `apps/web/src/features/workouts/workout-api-proxy.ts` | 93 | `content-disposition` header read | `const contentDisposition = upstream.headers.get("content-disposition");` |
| `apps/web/src/features/workouts/workout-api-proxy.ts` | 100 | `content-disposition` header forward | `responseHeaders.set("content-disposition", contentDisposition);` |

## 6. Dynamic Route Links (`/workouts/<id>` and `/help/demo/<...>`)

| File | Line | Expression | Snippet |
| --- | --- | --- | --- |
| `apps/web/src/features/session/use-start-session.ts` | 30 | `openWorkout ? \`/workouts/${openWorkout}\` : "/workout"` | `router.push(openWorkout ? \`/workouts/${openWorkout}\` : "/workout");` |
| `apps/web/src/features/launch/launch-screen.tsx` | 37 | `` `/workouts/${payload.workout.id}?focusName=1` `` | `router.push(\`/workouts/${payload.workout.id}?focusName=1\`);` |
| `apps/web/src/features/launch/launch-screen.tsx` | 51 | `` `/workouts/${result.workoutId}?focusName=1` `` | `router.push(\`/workouts/${result.workoutId}?focusName=1\`);` |
| `apps/web/src/features/launch/launch-screen.tsx` | 69 | `` `/workouts/${activeWorkout.id}` `` | `href={\`/workouts/${activeWorkout.id}\`}` |
| `apps/web/src/features/templates/templates-screen.tsx` | 61 | `` `/workouts/${result.workoutId}?focusName=1` `` | `router.push(\`/workouts/${result.workoutId}?focusName=1\`);` |
| `apps/web/src/features/dashboard/dashboard-panels.tsx` | 101 | `` `/workouts/${session.id}` `` | `<Link className="flex min-h-[60px] items-center gap-3 px-4 py-2.5" href={\`/workouts/${session.id}\`}>` |
| `apps/web/src/features/history/history-row.tsx` | 64 | `` detailHref ?? `/workouts/${workout.id}` `` | `<Link className={\`${buttonClass("secondary")} mt-4 w-full\`} href={detailHref ?? \`/workouts/${workout.id}\`}>` |
| `apps/web/src/features/volume/volume-panels.tsx` | 195 | `` workoutHref?.(session.workoutId) ?? `/workouts/${session.workoutId}` `` | `<Link className="flex min-h-11 items-center justify-between gap-3 active:bg-surface-raised" href={workoutHref?.(ses...` |
| `apps/web/src/features/shell/app-shell.tsx` | 248 | `` `/workouts/${workout.id}` `` | `href={\`/workouts/${workout.id}\`}` |
| `apps/web/src/features/shell/app-shell.tsx` | 292 | `` `/workouts/${openWorkout.id}` `` | `href={\`/workouts/${openWorkout.id}\`}` |
| `apps/web/src/features/onboarding/demo-screen.tsx` | 31 | `` `/help/demo/${demoLessons[index]?.path ?? ""}` `` | `router.push(\`/help/demo/${demoLessons[index]?.path ?? ""}\`);` |
| `apps/web/src/features/onboarding/demo-screen.tsx` | 36 | `"/help/demo/session"` | `router.push("/help/demo/session");` |
| `apps/web/src/features/onboarding/demo-screen.tsx` | 44 | `` `/help/demo/${exploreTarget}` `` | `router.push(\`/help/demo/${exploreTarget}\`);` |
| `apps/web/src/features/onboarding/demo-screen.tsx` | 55 | `` `/help/demo/${path}` `` | `href={\`/help/demo/${path}\`}` |
| `apps/web/src/features/onboarding/demo-screen.tsx` | 59 | `"/help/demo/session"` | `{state.practice?.isOpen ? <Link className={buttonClass("primary")} href="/help/demo/session">Resume example workout...` |
| `apps/web/src/features/onboarding/demo-guide.tsx` | 36 | `` `/help/demo/${demoLessons[nextIndex]?.path ?? ""}` `` | `router.push(\`/help/demo/${demoLessons[nextIndex]?.path ?? ""}\`);` |
| `apps/web/src/features/onboarding/demo-session.tsx` | 49 | `"/help/demo/workout"` | `href="/help/demo/workout"` |
| `apps/web/src/features/onboarding/demo-session.tsx` | 52 | `"/help/demo/history"` | `<SessionHeader backHref="/help/demo/history" backLabel="Back to example history" focusName={false} isOpen={workout...` |
| `apps/web/src/features/onboarding/demo-analytics-screens.tsx` | 37 | `` `/help/demo/history/${id}` `` | `workoutHref={(id) => \`/help/demo/history/${id}\`} />;` |
| `apps/web/src/features/onboarding/demo-history.tsx` | 31 | `` `/help/demo/history/${workout.id}` `` | `detailHref={\`/help/demo/history/${workout.id}\`}` |
| `apps/web/src/features/shell/app-shell.tsx` | 52 | `"/help/demo/history"` | `history: "/help/demo/history",` |
| `apps/web/src/features/shell/app-shell.tsx` | 53 | `"/help/demo/workout"` | `workout: "/help/demo/workout",` |
| `apps/web/src/features/shell/app-shell.tsx` | 54 | `"/help/demo/progress"` | `progress: "/help/demo/progress",` |
| `apps/web/src/features/shell/app-shell.tsx` | 55 | `"/help/demo/volume"` | `volume: "/help/demo/volume"` |

## 7. `next/*` Imports in `features/**` and `shared/**`

| Module | Count | Files (`next/image`, `next/dynamic`, `next/font`) |
| --- | --- | --- |
| `next/link` | 25 | — |
| `next/navigation` | 14 | — |
| `next/dynamic` | 2 | `apps/web/src/features/volume/volume-screen.tsx`, `apps/web/src/features/dashboard/dashboard-screen.tsx` |
| `next/image` | 0 | none |
| `next/font` | 0 | none |

## 8. Browser Storage, Cookie, and Service Worker Uses

| File | Line | API |
| --- | --- | --- |
| `apps/web/src/features/session/set-draft-storage.ts` | 71 | `localStorage` |
| `apps/web/src/features/session/set-draft-storage.ts` | 83 | `localStorage` |
| `apps/web/src/features/session/set-draft-storage.ts` | 107 | `localStorage` |
| `apps/web/src/features/session/set-draft-storage.ts` | 136 | `localStorage` |
| `apps/web/src/features/session/set-draft-storage.ts` | 143 | `localStorage` |
| `apps/web/src/features/session/set-draft-storage.ts` | 155 | `localStorage` |
| `apps/web/src/features/session/set-draft-storage.ts` | 162 | `localStorage` |
| `apps/web/src/features/session/set-draft-storage.ts` | 163 | `localStorage` |
| `apps/web/src/features/session/set-draft-storage.ts` | 169 | `localStorage` |
| `apps/web/src/features/session/use-rest-preferences.ts` | 47 | `localStorage` |
| `apps/web/src/features/volume/volume-body-map.tsx` | 56 | `localStorage` |
| `apps/web/src/features/volume/volume-body-map.tsx` | 57 | `localStorage` |
| `apps/web/src/features/shell/theme.ts` | 26 | `localStorage` |
| `apps/web/src/features/shell/theme.ts` | 48 | `localStorage` |
| `apps/web/src/features/shell/theme.ts` | 53 | `localStorage` |
| `apps/web/src/features/shell/theme.ts` | 54 | `localStorage` |
| `apps/web/src/features/privacy/use-scoped-local-storage.ts` | 68 | `localStorage` |
| `apps/web/src/features/privacy/use-scoped-local-storage.ts` | 69 | `localStorage` |
| `apps/web/src/features/privacy/device-privacy.tsx` | 97 | `localStorage` |
| `apps/web/src/features/privacy/device-privacy.tsx` | 101 | `localStorage` |
| `apps/web/src/features/privacy/device-privacy.tsx` | 106 | `localStorage` |
| `apps/web/src/features/privacy/device-privacy.tsx` | 107 | `localStorage` |
| `apps/web/src/features/privacy/device-privacy.tsx` | 145 | `localStorage`, `sessionStorage` |
| `apps/web/src/features/session/session-screen.tsx` | 76 | `sessionStorage` |
| `apps/web/src/features/session/session-screen.tsx` | 88 | `sessionStorage` |
| `apps/web/src/features/shell/app-history.tsx` | 11 | `sessionStorage` |
| `apps/web/src/features/shell/app-history.tsx` | 20 | `sessionStorage` |
| `apps/web/src/features/workouts/filter-persistence.ts` | 39 | `sessionStorage` |
| `apps/web/src/features/workouts/filter-persistence.ts` | 54 | `sessionStorage` |
| `apps/web/src/features/workouts/filter-persistence.ts` | 58 | `sessionStorage` |

Note: `0` uses of `document.cookie`, `indexedDB`, or `navigator.serviceWorker`.

## Per-Feature-Folder Summary

| Feature Folder | Raw `fetch(` Calls | `"/api/"` Strings | Dynamic Links |
| --- | --- | --- | --- |
| `admin` | 0 | 15 | 0 |
| `analytics` | 1 | 0 | 0 |
| `auth` | 2 | 5 | 0 |
| `avatar` | 0 | 0 | 0 |
| `dashboard` | 0 | 0 | 1 |
| `exercises` | 0 | 0 | 0 |
| `history` | 0 | 0 | 1 |
| `launch` | 0 | 1 | 3 |
| `legal` | 0 | 0 | 0 |
| `messages` | 0 | 4 | 0 |
| `onboarding` | 0 | 3 | 10 |
| `privacy` | 0 | 2 | 0 |
| `progress` | 0 | 0 | 0 |
| `session` | 0 | 2 | 1 |
| `settings` | 1 | 3 | 0 |
| `shell` | 0 | 2 | 6 |
| `status` | 1 | 0 | 0 |
| `templates` | 0 | 1 | 1 |
| `tracking` | 0 | 3 | 0 |
| `volume` | 0 | 0 | 1 |
| `workouts` | 1 | 0 | 0 |
