# Private Beta 1 Remediation Matrix

## Status and evidence

- Evidence source: `private-beta-1-report.md` (kept unchanged).
- Tested production baseline: `1ba15973df255d2e5bd3b94def03e25b050e870a` on Samsung S22 Plus, Firefox, and mobile data.
- Remediation target: make exercise creation/selection and the full workout loop ready for an open-but-capped public beta.
- Source precedence: this completed report supersedes usability audits v4, v3, and v2 where they conflict.

Automated coverage is repository evidence, not a substitute for the final Samsung/Firefox retest. Rows marked “device retest” remain open until that exact black-box run passes.

## Observation-to-remediation matrix

| Report observation | Implemented remediation | Automated evidence | Manual verification |
| --- | --- | --- | --- |
| First exercise should be selected initially; later choices should remain selected | Live-session selection falls back to the first exercise and retains valid React page state | `session-screen-support.test.ts` | Device retest: enter overview, select another exercise, move between modes |
| Add Set opens the number keyboard | Removed set-editor/composer automatic focus; workout-name focus remains intentional | Playwright core workout loop checks composer and editor focus | Device retest with Firefox keyboard closed/open |
| First set always starts at 20 kg | Workout detail returns the best working set from the latest earlier qualifying workout; draft priority is current-session latest set, previous performance, then 20 kg | draft unit tests, API integration ownership/deletion/tie test, Playwright previous-set prefill | Device retest across two workouts |
| Long exercise names are hidden | Exercise overview, picker rows, and set-mode headings wrap/break instead of truncate | Playwright viewport/no-overflow suite | Verify representative long names at 390 px and 430 px |
| Earlier best set is unavailable in live logging | Active exercise shows a History-style previous-performance pill with workout context | API integration + Playwright previous-performance check | Compare against History on device |
| Muscle dropdowns push creation actions down | Primary/secondary selectors are bounded overlays and do not participate in form layout | Playwright exercise create/edit selectors | Open both selectors above the Firefox keyboard |
| Set type cannot be changed after saving | Set editor patches type, weight, reps, RIR, and note through the existing endpoint | API set PATCH coverage + Playwright working→warmup→working round trip | Device retest for both directions |
| First +/- tap mutates while dismissing the keyboard | A focused composer input consumes the first stepper tap and blurs; the next tap steps | Playwright checks no first mutation and second-tap mutation | Device retest with weight, reps, and note focus |
| Picker automatically opens keyboard | Removed picker search automatic focus | Playwright checks search is not focused | Device retest after opening and reopening picker |
| Picker heading/search/actions move as results shrink | Mobile picker uses a bounded visual-height column; heading/search/facets/footer are fixed regions and only results scroll | Playwright mobile core flow and no-overflow viewports | Retest with toolbar motion and keyboard open |
| Search and “did you mean” are imprecise | Ranking is exact name, approved alias, prefix/substring, trigram typo similarity, then muscle/equipment; creation keeps explicit custom-name choice | name-quality/catalog unit tests and fuzzy/alias integration tests | Try `RDL`, `dumbell`, partial names, and unrelated noise |
| Too few system exercises | Added deterministic 820-row reviewed catalog from the current 152 names plus logging-compatible Free Exercise DB records | catalog invariant test; fresh/up/down and legacy-conflict migration checks | Browse pages/facets and spot-check classifications |
| Semantic corrections are weak | Added repo-owned approved aliases and typo matching; no external AI/runtime dependency | alias/normalization tests and PostgreSQL search integration | Verify likely local spelling/abbreviation cases |
| Bottom navigation moves during scrolling | Mobile tab layer is fixed, opaque, constant-height, and uses inner safe-area padding without backdrop blur | responsive Playwright sweep | Firefox toolbar-scroll device retest |
| Settings icon is malformed | App shell uses a conventional gear icon | Type/lint/build and responsive smoke | Visual device confirmation |
| Working/warmup colors are inverted or weak | Working is lavender; warmup is muted light green; bright green remains completion/success | Playwright set-type flow | Compare live and History views |
| “Workouts” primary tab is misleading | Primary navigation label is `History`; routes and center workout action are unchanged | shell smoke coverage | Verify desktop and mobile navigation |
| Completion screen is messy | Existing route now leads with success, duration/exercise/set/tonnage metrics, History/Dashboard actions, and grouped secondary template/time controls | Playwright core completion assertions | Device retest after finishing a workout |

## Catalog provenance and review

- Upstream: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), Unlicense.
- Pinned revision: `b0eed061e1c832b3ed815fbaa4b45b3cdc14df49`.
- Source records reviewed: 873.
- Included source records: 709.
- Current catalog names unioned: 152.
- Final unique system records: 820.
- Excluded records: 164, recorded individually in `apps/api/catalog/system-exercise-catalog-review.json`.
- Exclusions cover cardio, stretching, incompatible strongman movements, and duration/distance-only logging needs. Instructions and media are not imported.
- Muscle mapping uses the existing 12 groups: back subdivisions→Back, abductors→Glutes, adductors→Quads, and neck→Traps.
- New equipment values are `EZ bar`, `medicine ball`, and `stability ball`.
- Case-insensitive conflicts never rename, promote, or overwrite user-owned exercises; the migration emits a manual-review notice.

## Final verification still required

1. QA at 390 px, 430 px, and 1440 px, including keyboard-open picker/editor states.
2. Repeat the complete black-box workout on Samsung S22 Plus, Firefox, and mobile data.
3. Exercise browser-toolbar scrolling, picker result changes, both muscle overlays, first-tap keyboard dismissal, background recovery, and completion actions.
4. Confirm History, Progress, Volume, authentication, recovery, and existing workout data remain correct.
