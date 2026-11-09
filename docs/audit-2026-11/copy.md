# Audit appendix: copy findings (Step 6)

1,661 strings were pulled from `apps/web/src` with the TypeScript AST, and five `gemini-3.8-flash-medium` workers flagged the problem ones. The main session matched each row against the extracted strings: 221 of 225 matched exactly, and the 4 mismatches are merged variants or a wrong path prefix. Suggested rewrites are drafts for Step 10 and should follow the voice guide in the new DESIGN.md.

Labels that show in ALL CAPS on screen often come from CSS (`uppercase`, 50 uses in 26 files), not from the string. See the main audit.

| Category | Location (`apps/web/src/`) | Current | Suggested |
|---|---|---|---|
| TERMINAL | app/error.tsx:16 | SYSTEM_FAULT | Something went wrong |
| TERMINAL | app/error.tsx:24 | REINITIALIZE | Try again |
| TERMINAL | features/auth/cancel-deletion-screen.tsx:19 | ACCOUNT_RECOVERY | Account recovery |
| TERMINAL | features/auth/cancel-deletion-screen.tsx:19 | RETURN_TO_LOGIN | Back to sign in |
| TERMINAL | features/avatar/avatar-stage.tsx:261 | STATIC_MODE // 3D_UNAVAILABLE | 3D avatar unavailable |
| TERMINAL | features/dashboard/dashboard-panels.tsx:103 | ${shortDate(session.startedAt)} // ${session.totalSets} sets // ${formatDuration(session.startedAt, session.endedAt)} | ${shortDate(session.startedAt)} · ${session.totalSets} sets · ${formatDuration(session.startedAt, session.endedAt)} |
| TERMINAL | features/dashboard/dashboard-panels.tsx:163 | SESSION_${shortDate(session.startedAt).replace(/\s+/g, "_")} | Workout on ${shortDate(session.startedAt)} |
| TERMINAL | features/dashboard/dashboard-panels.tsx:78 | ${formatKgValue(topSet.weightKg)}kg × ${topSet.reps} // ${shortDate(topSet.sessionDate)} | ${formatKgValue(topSet.weightKg)}kg × ${topSet.reps} · ${shortDate(topSet.sessionDate)} |
| TERMINAL | features/exercises/exercises-screen.tsx:44 | WORKOUTS | Workouts |
| TERMINAL | features/history/csv-panel.tsx:105 | EXPORT_CSV | Export CSV |
| TERMINAL | features/history/csv-panel.tsx:152 | BLOCKED_EXERCISE_NAMES | Blocked exercise names |
| TERMINAL | features/legal/legal-page.tsx:31 | [controller configuration required] | Configuration required |
| TERMINAL | features/legal/legal-page.tsx:32 | [controller address required] | Address required |
| TERMINAL | features/legal/legal-page.tsx:33 | [privacy contact required] | Privacy contact required |
| TERMINAL | features/legal/legal-page.tsx:34 | [support contact required] | Support contact required |
| TERMINAL | features/legal/legal-page.tsx:37 | [security contact required] | Security contact required |
| TERMINAL | features/legal/legal-page.tsx:6 | PUBLICATION_BLOCKED: controller and contact configuration is incomplete. Approved | Configuration incomplete |
| TERMINAL | features/progress/progress-chart.tsx:138 | — RESET | Reset zoom |
| TERMINAL | features/progress/progress-panels.tsx:29 | ${exercise.primaryMuscleGroup.name} // ${exercise.plottedSetCount} plotted sets | ${exercise.primaryMuscleGroup.name} · ${exercise.plottedSetCount} sets |
| TERMINAL | features/progress/progress-screen.tsx:134 | ${selected.primaryMuscleGroup.name} // last trained ${shortDate(selected.lastDoneAt)} | ${selected.primaryMuscleGroup.name} · Last trained ${shortDate(selected.lastDoneAt)} |
| TERMINAL | features/progress/progress-summary-metrics.tsx:57 | EST_1RM | Est. 1RM |
| TERMINAL | features/session/session-completion-summary.tsx:53 | WORKOUT_COMPLETE | Workout complete |
| TERMINAL | features/session/session-header.tsx:141 | LIVE · | Live |
| TERMINAL | features/session/session-mode-navigation.tsx:23 | SET MODE · | Set mode |
| TERMINAL | features/session/session-screen-support.tsx:32 | WORKOUT_UNREACHABLE | Workout unavailable |
| TERMINAL | features/settings/merge-exercises-panel.tsx:43 | MERGE_AWAY (duplicate) | Duplicate exercise |
| TERMINAL | features/settings/merge-exercises-panel.tsx:44 | MERGE_INTO (keep) | Exercise to keep |
| TERMINAL | features/settings/merge-exercises-panel.tsx:45 | REVIEW_MERGE | Review merge |
| TERMINAL | features/settings/merge-exercises-panel.tsx:66 | MERGE_COMPLETE | Merge complete |
| TERMINAL | features/settings/privacy-data-panel.tsx:81 | CURRENT_PASSWORD | Current password |
| TERMINAL | features/templates/completion-template-actions.tsx:48 | TEMPLATE_SAVED | Template saved |
| TERMINAL | features/templates/completion-template-actions.tsx:48 | VIEW_TEMPLATES → | View templates → |
| TERMINAL | features/templates/completion-template-actions.tsx:49 | TEMPLATE_UNCHANGED | Template unchanged |
| TERMINAL | features/templates/completion-template-actions.tsx:52 | SAVE_AS_NEW_TEMPLATE | Save as new template |
| TERMINAL | features/templates/completion-template-actions.tsx:52 | KEEP_TEMPLATE_UNCHANGED | Keep template unchanged |
| TERMINAL | features/templates/completion-template-actions.tsx:52 | SAVE_WORKOUT_STRUCTURE_AS_TEMPLATE | Save as template |
| TERMINAL | features/templates/templates-screen.tsx:82 | WORKOUTS | Workouts |
| TERMINAL | features/volume/body-map-2d.tsx:117 | LOADING_BODY_MAP | Loading body map… |
| TERMINAL | features/volume/heatmap.ts:63 | >${formatRangeValue(lower)} sets / WK (${formatRangeValue(ceiling)}+ stays at max heat) | Over ${formatRangeValue(lower)} sets/week |
| TERMINAL | features/volume/heatmap.ts:64 | >0–${formatRangeValue(upper)} | 1–${formatRangeValue(upper)} sets/week |
| TERMINAL | features/volume/volume-body-map.tsx:214 | STATIC_MODE // 3D_UNAVAILABLE | 3D body map unavailable |
| CASE | app/cookies/page.tsx:4 | Cookie & Device Storage Notice | Cookie and storage notice |
| CASE | app/support/page.tsx:12 | Support & Service Status | Support & service status |
| CASE | app/workouts/templates/page.tsx:7 | Workout Templates | Workout templates |
| CASE | features/admin/audit-admin-panel.tsx:55 | LOAD OLDER EVENTS | Load older events |
| CASE | features/admin/campaign-admin-panel.tsx:332 | SAVE DRAFT | Save draft |
| CASE | features/admin/deletion-support-panel.tsx:43 | STOP DELETION | Stop deletion |
| CASE | features/admin/deletion-support-panel.tsx:43 | STOPPING… | Stopping… |
| CASE | features/admin/user-admin-panel.tsx:109 | SIGN OUT EVERYWHERE | Sign out everywhere |
| CASE | features/admin/user-admin-panel.tsx:90 | APPLYING… | Applying… |
| CASE | features/auth/account-flow-screens.tsx:116 | SEND RESET LINK | Send reset link |
| CASE | features/auth/account-flow-screens.tsx:220 | RESET PASSWORD | Reset password |
| CASE | features/auth/auth-screen.tsx:14 | SIGN IN | Sign in |
| CASE | features/auth/auth-screen.tsx:21 | CREATE ACCOUNT | Create account |
| CASE | features/dashboard/dashboard-panels.tsx:82 | ${formatKgValue(topSet.estimatedOneRepMaxKg)} KG | ${formatKgValue(topSet.estimatedOneRepMaxKg)} kg |
| CASE | features/dashboard/dashboard-screen.tsx:184 | START WORKOUT | Start workout |
| CASE | features/dashboard/dashboard-screen.tsx:184 | RESUME WORKOUT | Resume workout |
| CASE | features/exercises/exercise-form.tsx:172 | SAVE EXERCISE | Save exercise |
| CASE | features/exercises/exercise-picker.tsx:97 | LOAD MORE EXERCISES | Load more exercises |
| CASE | features/history/csv-panel.tsx:125 | PREVIEW IMPORT | Preview import |
| CASE | features/history/csv-panel.tsx:164 | CONFIRM IMPORT | Confirm import |
| CASE | features/history/history-screen.tsx:86 | WORKOUTS | Workouts |
| CASE | features/onboarding/help-screen.tsx:12 | Help & Tutorial | Help & tutorial |
| CASE | features/onboarding/help-screen.tsx:16 | Example Progress | Example progress |
| CASE | features/onboarding/help-screen.tsx:16 | Example Volume | Example volume |
| CASE | features/privacy/device-privacy.tsx:112 | COOKIE & DEVICE STORAGE | Cookie & device storage |
| CASE | features/privacy/device-privacy.tsx:115 | ESSENTIAL ONLY | Essential only |
| CASE | features/privacy/device-privacy.tsx:115 | ALLOW FUNCTIONAL | Allow functional |
| CASE | features/privacy/device-privacy.tsx:80 | OLDER DEVICE DATA FOUND | Older device data found |
| CASE | features/privacy/device-privacy.tsx:82 | REMOVE OLD DATA | Remove old data |
| CASE | features/privacy/device-privacy.tsx:82 | IMPORT TO THIS ACCOUNT | Import to this account |
| CASE | features/progress/progress-chart-controls.tsx:13 | WEIGHT | Weight |
| CASE | features/progress/progress-summary-metrics.tsx:63 | ${formatKgValue(allTime.bestTopSet.estimatedOneRepMaxKg)} KG | ${formatKgValue(allTime.bestTopSet.estimatedOneRepMaxKg)} kg |
| CASE | features/session/active-exercise-panel.tsx:134 | Add Set | Add set |
| CASE | features/session/active-exercise-panel.tsx:151 | REMOVE EXERCISE | Remove exercise |
| CASE | features/session/rest-timer.tsx:107 | −15S | −15s |
| CASE | features/session/rest-timer.tsx:115 | +15S | +15s |
| CASE | features/session/session-header.tsx:94 | CONFIRM FINISH | Finish workout |
| CASE | features/session/session-screen.tsx:208 | DISCARD WORKOUT | Discard workout |
| CASE | features/session/session-screen.tsx:208 | DELETE LOG | Delete workout |
| CASE | features/session/set-composer.tsx:98 | SAVE SET | Save set |
| CASE | features/settings/heat-ceiling-panel.tsx:41 | SAVE HEAT CEILING | Save heat ceiling |
| CASE | features/settings/merge-exercises-panel.tsx:51 | MERGE EXERCISES | Merge exercises |
| CASE | features/settings/privacy-data-panel.tsx:54 | CLEAR DATA ON THIS DEVICE | Clear data on this device |
| CASE | features/settings/privacy-data-panel.tsx:59 | DOWNLOAD ACCOUNT EXPORT | Download account data |
| CASE | features/settings/privacy-data-panel.tsx:63 | REVIEW ACCOUNT DELETION | Review account deletion |
| CASE | features/settings/privacy-data-panel.tsx:67 | SCHEDULE DELETE | Schedule deletion |
| CASE | features/settings/privacy-data-panel.tsx:67 | CANCEL | Cancel |
| CASE | features/settings/settings-screen.tsx:38 | Account & Security | Account & security |
| CASE | features/settings/settings-screen.tsx:39 | Training & Volume | Training & volume |
| CASE | features/settings/settings-screen.tsx:40 | Body Profile | Body profile |
| CASE | features/settings/settings-screen.tsx:42 | Privacy & Data | Privacy & data |
| CASE | features/settings/settings-screen.tsx:43 | Help & Support | Help & support |
| CASE | features/settings/settings-screen.tsx:44 | Exercise Maintenance | Exercise maintenance |
| CASE | features/settings/settings-screen.tsx:45 | SIGN OUT | Sign out |
| CASE | features/settings/settings-screen.tsx:45 | Sign Out | Sign out |
| CASE | features/settings/settings-screen.tsx:77 | YRS | yrs |
| CASE | features/settings/settings-screen.tsx:77 | CM | cm |
| CASE | features/settings/settings-screen.tsx:77 | KG | kg |
| CASE | features/templates/template-editor.tsx:112 | SAVE TEMPLATE | Save template |
| CASE | features/templates/template-editor.tsx:85 | Edit Template | Edit template |
| CASE | features/templates/template-editor.tsx:85 | New Workout Template | New workout template |
| CASE | features/templates/templates-screen.tsx:120 | DELETE TEMPLATE | Delete template |
| CASE | features/volume/body-map-2d.tsx:127 | FRONT | Front |
| CASE | features/volume/body-map-2d.tsx:136 | BACK | Back |
| CASE | features/volume/heatmap.ts:65 | ${range} sets / WK | ${range} sets/week |
| CASE | features/volume/volume-interaction.ts:15 | SWIPE SIDEWAYS TO ROTATE · SWIPE UP/DOWN TO SCROLL | Swipe sideways to rotate · Swipe to scroll |
| CASE | features/volume/volume-interaction.ts:21 | DRAG TO ORBIT · SCROLL TO ZOOM | Drag to rotate · Scroll to zoom |
| CASE | features/workouts/workout-tabs.tsx:7 | Workout History | Workout history |
| CASE | shared/ui/confirm-dialog.tsx:46 | CANCEL | Cancel |
| JARGON | app/cookies/page.tsx:12 | (name configurable) is a Secure, HttpOnly, SameSite=Lax login cookie. It contains | Keeps you signed in securely on this device. |
| JARGON | app/error.tsx:21 | An unexpected error interrupted the session. | An unexpected error occurred. Please try again. |
| JARGON | app/muscle-spike/page.tsx:7 | Muscle Mask Spike — Batch C Part 2 | Muscle anatomy preview |
| JARGON | app/support/page.tsx:13 | . Include what you were doing, the approximate time, route/screen, browser famil | Include what happened, the screen, and your device. |
| JARGON | features/analytics/analytics-api-proxy.ts:33 | The API is unavailable. | Unable to connect. Please try again later. |
| JARGON | features/auth/account-flow-screens.tsx:178 | This reset link is missing its token. Open the link from the email directly... | This link is incomplete. Open the link from your email |
| JARGON | features/dashboard/dashboard-panels.tsx:88 | Auto-derived — pin your own in Settings → | Calculated automatically — pin favorites in Settings → |
| JARGON | features/exercises/exercises-screen.tsx:86 | Unspecified classification | Other |
| JARGON | features/exercises/exercises-screen.tsx:99 | This is a system exercise. It stays consistent for everyone and cannot be edited. | Standard exercise. It cannot be edited. |
| JARGON | features/history/csv-format-dialog.tsx:15 | Required seeded muscle slug | Muscle group (e.g. chest, back) |
| JARGON | features/history/csv-format-dialog.tsx:18 | Required compact positive integer, starting at 1 | Exercise order number (starting at 1) |
| JARGON | features/history/csv-format-dialog.tsx:55 | Muscle slugs | Muscle groups |
| JARGON | features/privacy/device-privacy.tsx:113 | We always use one essential sign-in cookie and active-set recovery storage. Funct | Essential storage keeps you signed in. |
| JARGON | features/privacy/device-privacy.tsx:81 | This browser has body profile or display data saved before per-account isolation | Found older profile data saved on this browser. |
| JARGON | features/progress/progress-panels.tsx:62 | RIR | Reps in reserve (RIR) |
| JARGON | features/session/session-completion-summary.tsx:65 | TONNAGE | Volume |
| JARGON | features/session/session-screen-support.tsx:24 | TONNAGE | Volume |
| JARGON | features/session/session-set-list.tsx:133 | Grip, tempo, pain flag… | Grip, tempo, form cues… |
| JARGON | features/session/session-set-list.tsx:148 | SAVE HISTORICAL EDIT | Save changes |
| JARGON | features/settings/privacy-data-panel.tsx:52 | Opt in to account-linked, first-party usage events retained for 90 days. | Share anonymous app usage to help improve GymTrack. |
| JARGON | features/settings/privacy-data-panel.tsx:57 | Download your server-held account data as JSON. Workout CSV export remains availab | Download a copy of your account data. |
| JARGON | features/settings/settings-screen.tsx:77 | Body profile values are optional functional storage, scoped to this account in th | Body stats are saved only on this device. |
| JARGON | features/status/public-status-proxy.ts:19 | This origin cannot read status metrics. | Service status is temporarily unavailable. |
| JARGON | features/templates/completion-template-actions.tsx:42 | The source template could not be updated. | Couldn't update template. Please try again. |
| JARGON | features/templates/completion-template-actions.tsx:48 | The ordered exercise structure was saved without sets or performance data. | Exercises saved as a template. Logged sets were excluded. |
| JARGON | features/templates/completion-template-actions.tsx:52 | This session’s exercise IDs or order differ from | Exercises or order differ from |
| JARGON | features/templates/completion-template-actions.tsx:52 | . Choose what happens to the reusable structure. | . Choose how to update the template. |
| JARGON | features/volume/volume-body-map.tsx:216 | This device cannot render the body map. Select muscles from the distribution matrix instead. | This device can't render 3D. Pick muscles from the list. |
| JARGON | features/workouts/facet-filters.tsx:120 | Editability | Access |
| JARGON | features/workouts/workout-api-proxy.ts:39 | The API is unavailable. | Unable to connect. Check your connection and try again. |
| ERROR | features/admin/audit-admin-panel.tsx:29 | The audit log could not be loaded. | Could not load audit log. Tap to retry. |
| ERROR | features/admin/campaign-admin-panel.tsx:102 | The campaign action failed. | Could not update campaign. Please try again. |
| ERROR | features/admin/campaign-admin-panel.tsx:241 | The draft could not be saved. | Could not save draft. Please try again. |
| ERROR | features/admin/campaign-admin-panel.tsx:81 | Campaign data could not be loaded. | Could not load campaigns. Tap to retry. |
| ERROR | features/admin/campaign-responses-panel.tsx:39 | The answers could not be loaded. | Could not load answers. Tap to retry. |
| ERROR | features/admin/campaign-switch.tsx:34 | The setting could not be saved. | Could not update setting. Please try again. |
| ERROR | features/admin/deletion-support-panel.tsx:37 | The deletion could not be stopped. | Could not stop deletion. Please try again. |
| ERROR | features/admin/overview-panel.tsx:38 | The overview could not be loaded. | Could not load overview. Tap to retry. |
| ERROR | features/admin/user-admin-panel.tsx:30 | The member list could not be loaded. | Could not load member list. Tap to retry. |
| ERROR | features/admin/user-admin-panel.tsx:53 | The action failed. | Could not complete action. Please try again. |
| ERROR | features/dashboard/dashboard-screen.tsx:215 | Could not start a workout | Couldn't start workout. Try again. |
| ERROR | features/exercises/exercise-form.tsx:146 | Muscle groups could not be loaded. | Couldn't load muscle groups. Tap to retry. |
| ERROR | features/exercises/exercise-form.tsx:78 | Exercise could not be saved. | Couldn't save exercise. Try again. |
| ERROR | features/exercises/exercise-picker.tsx:91 | Exercises could not be loaded. | Couldn't load exercises. Tap to retry. |
| ERROR | features/exercises/exercises-screen.tsx:52 | Exercises could not be loaded. | Couldn't load exercises. Tap to retry. |
| ERROR | features/launch/launch-screen.tsx:149 | Templates could not be loaded. | Couldn't load templates. Pull down to refresh. |
| ERROR | features/launch/launch-screen.tsx:40 | The workout could not be started. | Couldn't start workout. Please try again. |
| ERROR | features/launch/launch-screen.tsx:54 | The template workout could not be started. | Couldn't start template. Please try again. |
| ERROR | features/messages/message-center.tsx:41 | The message could not be dismissed. | Couldn't dismiss message. Please try again. |
| ERROR | features/messages/message-center.tsx:56 | The response could not be saved. | Couldn't save response. Please try again. |
| ERROR | features/onboarding/demo-copy-template.tsx:34 | The example template could not be copied. | Couldn't copy template. Please try again. |
| ERROR | features/onboarding/use-onboarding.ts:14 | Onboarding requires an authenticated account. | Please sign in to continue onboarding. |
| ERROR | features/onboarding/use-onboarding.ts:47 | Tutorial progress could not be loaded. | Couldn't load tutorial progress. Please try again. |
| ERROR | features/privacy/device-privacy.tsx:105 | Device privacy context is unavailable. | Storage settings unavailable. Please reload. |
| ERROR | features/session/active-exercise-panel.tsx:49 | The exercise could not be removed. | Couldn't remove exercise. Try again. |
| ERROR | features/session/session-screen.tsx:119 | The workout could not be completed. | Couldn't finish workout. Try again. |
| ERROR | features/session/session-screen.tsx:124 | The workout name could not be saved. | Couldn't save workout name. Try again. |
| ERROR | features/session/session-screen.tsx:132 | That did not work | Something went wrong. Try again. |
| ERROR | features/session/session-screen.tsx:222 | The workout could not be deleted. | Couldn't delete workout. Try again. |
| ERROR | features/session/session-screen.tsx:79 | The exercise could not be added. | Couldn't add exercise. Try again. |
| ERROR | features/session/session-screen.tsx:99 | Exercise reorder failed. | Couldn't reorder exercises. Try again. |
| ERROR | features/session/session-set-list.tsx:76 | The set could not be deleted. | Couldn't delete set. Try again. |
| ERROR | features/session/session-set-list.tsx:86 | The set could not be updated. | Couldn't update set. Try again. |
| ERROR | features/session/session-time-panel.tsx:49 | The workout times could not be updated. | Couldn't update workout times. Try again. |
| ERROR | features/session/use-session-set-logging.ts:117 | The set could not be saved. | Couldn't save set. Try again. |
| ERROR | features/settings/favorite-lifts-panel.tsx:60 | Nothing found | No exercises found |
| ERROR | features/settings/favorite-lifts-panel.tsx:68 | All slots are full | Pin limit reached (unpin an exercise first) |
| ERROR | features/settings/heat-ceiling-panel.tsx:40 | Heat ceiling could not be saved. | Couldn't save heat ceiling. Please try again. |
| ERROR | features/settings/merge-exercises-panel.tsx:32 | The exercises could not be merged. | Couldn't merge exercises. Please try again. |
| ERROR | features/settings/merge-exercises-panel.tsx:90 | Nothing found | No exercises found |
| ERROR | features/settings/privacy-data-panel.tsx:23 | The password was not accepted. | Incorrect password. Please try again. |
| ERROR | features/settings/privacy-data-panel.tsx:44 | Deletion could not be scheduled. | Couldn't schedule deletion. Please try again. |
| ERROR | features/status/public-status-proxy.ts:44 | Live project metrics are unavailable. | Live status is unavailable. Please try again later. |
| ERROR | features/templates/completion-template-actions.tsx:31 | The template could not be created. | Couldn't create template. Try again. |
| ERROR | features/templates/completion-template-actions.tsx:47 | Template options could not be loaded. | Couldn't load template options. Try again. |
| ERROR | features/templates/template-editor.tsx:76 | Template could not be saved. | Couldn't save template. Try again. |
| ERROR | features/templates/templates-screen.tsx:110 | Duplicate failed. | Couldn't duplicate template. Try again. |
| ERROR | features/templates/templates-screen.tsx:125 | Delete failed. | Couldn't delete template. Try again. |
| ERROR | features/templates/templates-screen.tsx:60 | The workout could not be started. | Couldn't start workout. Try again. |
| ERROR | features/templates/templates-screen.tsx:96 | That did not work | Something went wrong. Try again. |
| ERROR | features/templates/templates-screen.tsx:97 | The linked template could not be loaded. | Couldn't load template. Try again. |
| ERROR | features/templates/templates-screen.tsx:99 | Templates could not be loaded. | Couldn't load templates. Tap to retry. |
| ERROR | features/volume/volume-screen.tsx:115 | Weekly volume could not be loaded. | Couldn't load weekly volume. Tap to retry. |
| ERROR | shared/api/client.ts:60 | Something went wrong. | Something went wrong. Please try again. |
| ERROR | shared/api/csv.ts:38 | CSV request failed. | Could not process CSV. Please try again. |
| INCONSISTENT | app/error.tsx:18 | Something broke in Gym Progress Tracker | Something went wrong in GymTrack |
| INCONSISTENT | app/layout.tsx:20 | Gym Progress Tracker | GymTrack |
| INCONSISTENT | features/auth/account-flow-screens.tsx:26 | Gym Progress Tracker | GymTrack |
| INCONSISTENT | features/auth/registration-disabled-screen.tsx:30 | Go to login | Go to sign in |
| INCONSISTENT | features/dashboard/dashboard-screen.tsx:248 | Latest workouts | Recent workouts (matches line 221) |
| INCONSISTENT | features/history/history-screen.tsx:110 | TOTAL SESSIONS | Total workouts |
| INCONSISTENT | features/history/history-screen.tsx:144 | DELETE LOG | Delete workout |
| INCONSISTENT | features/history/history-screen.tsx:87 | New Session | New workout |
| INCONSISTENT | features/onboarding/demo-guide.tsx:36 | Explore freely. Practice resets when you reload or exit. | Explore freely. Example resets when you reload or exit. |
| INCONSISTENT | features/onboarding/demo-history.tsx:23 | This practice was reset. Choose one of the example logs from History. | This example was reset. Choose an example log. |
| INCONSISTENT | features/onboarding/demo-session.tsx:70 | Only this practice will reset. Your account is unchanged. | Only this example will reset. Your account is unchanged. |
| INCONSISTENT | features/session/session-header.tsx:120 | Discard workout vs Delete workout log | Discard workout / Delete workout |
| INCONSISTENT | features/session/use-start-session.ts:33 | session ("The session could not be started") vs workout | Couldn't start workout. Try again. |
| INCONSISTENT | features/settings/merge-exercises-panel.tsx:68 | sessions and | workouts and (uses "sessions" instead of "workouts") |
| INCONSISTENT | features/shell/app-shell.tsx:257 | Start workout session | Start workout (matches primary buttons) |
| TONE | app/support/page.tsx:15 | This is an early version running on a single self-hosted server. It may be slow, | GymTrack is in active development. Back up data anytime. |
| TONE | features/admin/admin-screen.tsx:55 | The administration console is only available on a large screen. Its tables are w | Please use a desktop browser to manage accounts. |
| TONE | features/avatar/avatar-stage.tsx:263 | This device cannot render the 3D avatar. Metrics remain live. | Can't render 3D avatar here. Your stats still update. |
| TONE | features/exercises/exercise-form.tsx:206 | Name blocked | Name unavailable |
| TONE | features/messages/message-center.tsx:105 | Acknowledge | Got it |
| TONE | features/messages/message-center.tsx:91 | Select acknowledge to confirm you saw this message. | Tap acknowledge to confirm you've seen this. |
| TONE | features/session/session-set-list.tsx:96 | Saving permanently changes this completed workout. | Update this completed workout? |
| TONE | features/session/validate-set-draft.ts:11 | Reps must be a whole number of at least one. | Enter at least 1 rep. |
| TONE | features/session/validate-set-draft.ts:12 | RIR must be a whole number from 0 to 10. | Enter an RIR from 0 to 10. |
| TONE | features/session/validate-set-draft.ts:13 | Notes must be at most 1,000 characters. | Notes can be up to 1,000 characters. |
| TONE | features/session/validate-set-draft.ts:7 | Weight must be positive, below 10,000 kg, with at most two decimal places. | Enter a weight between 0.01 and 9,999 kg. |
| TONE | features/settings/help-support-panel.tsx:20 | Voluntary; no extra access or priority. The external provider’s terms apply. | Optional support. External provider terms apply. |
| TONE | features/settings/privacy-data-panel.tsx:62 | Deletion revokes access immediately and permanently removes live account and work | Your account and workouts will be deleted in 7 days. |
| FILLER | features/onboarding/demo-screen.tsx:40 | Use the workout controls, then see what your logs reveal in Progress and Volume. | Log a workout and see how your stats update. |
| FILLER | features/onboarding/demo-screen.tsx:41 | A workout, from start to insight | How a workout works |
