# GymTrack design system

Status: **approved by the owner on 2026-11-08** (Step 8 of the UX rework). Step 9 applied the tokens and the app shell; Step 10 (2026-11-09) moved every screen over, removed the old class names and made the light theme follow the phone setting. This version replaces the "Aether Fitness System" token dump; the old text is in git history.

## Brief

- **Job:** operate. People log sets between exercises and check their progress afterwards.
- **Audience:** gym-goers on a phone, often one-handed, sweaty, in bad light and bad reception. Desktop is a secondary view.
- **Ships as:** a Capacitor app on iOS and Android with this exact web UI (ADR 0021). Every rule here assumes a native app frame, not a browser tab.
- **References:** Hevy and Strong for the workout logger and history; Apple Fitness for summary screens and type. Take their patterns (tab bar, grouped lists, bottom actions, large titles, quiet chrome). Copy none of their branding, icons or colors.
- **Keep:** the 3D figure and the muscle-volume map. They are what makes GymTrack different, so they get space and the rest of the UI stays quiet around them.
- **Avoid:** everything the November 2026 audit called sci-fi or terminal: monospace body text, tracked ALL-CAPS labels, `//` and `·` separators, glows, chamfered corners, cards nested in cards, decorative connector beams, `→` on every link, `01`/`02` numbering on non-sequences.

## Concept

A calm, native-feeling training log where the only spectacle is your own body. Every screen has one job and one primary action. The figure is the reward for logging.

## App frame

These rules come first because the shipped app runs in a full-screen WebView.

- `viewport-fit=cover` in the viewport meta. Pad every fixed element with `env(safe-area-inset-*)`:
  - the top bar with `inset-top`
  - the tab bar, bottom action bars and sheets with `inset-bottom`
  - full-bleed rows with `inset-left` and `inset-right` in landscape
- Android: Capacitor SystemBars `insetsHandling: "native"`. Treat Android WebView below 140 as a known padded fallback, not as a layout target.
- No browser-only affordances. There is no swipe-back on iOS and the address bar is gone, so every screen below a tab root shows a back control (see Navigation).
- Downloads, `target="_blank"` and `window.open` don't work in the app. Policies and help open as in-app routes or sheets. Exports go through a native share sheet in the mobile work, which needs its plugin decision first. Until then, the web keeps its download.
- Status bar: light content on dark theme, dark content on light theme. In the app, call Capacitor `SystemBars.setStyle` whenever the theme changes, and verify it on both platforms. (The static mockup can't do this, so its Android dark screenshot shows dark icons.)
- Nothing scrolls under the tab bar or a bottom action bar without padding for it. The page scrolls; an inner container only scrolls in sheets.

## Navigation

**Tab bar** (bottom, 5 slots, always visible on tab roots):

| Slot | Label | Root | Contains |
|---|---|---|---|
| 1 | Home | `/` | Today's summary, figure, resume or start, personal bests, recent workouts |
| 2 | History | `/workouts` | Past workouts only |
| 3 | Workout (centre, raised) | `/workout` | Start empty, templates, exercise library; resumes an open workout |
| 4 | Progress | `/progress` | Lift charts |
| 5 | Volume | `/weekly-volume` | Muscle-volume map |

- Tab labels are sentence case, 11 px (the one exception to the 12 px minimum, as on iOS), icon above. The active tab uses `--accent` for icon and label. Inactive tabs use `--text-muted`.
- **Settings and Messages** are not tabs. On Home, the large-title header has a profile button (opens Settings) and an inbox button with an unread dot (opens Messages). Both screens are pushed and have a back control.
- **Templates and the exercise library** move from History to the Workout tab. History holds only past workouts.
- **Pushed screens** (workout detail, settings sections, help, legal, support) have a top bar with a back chevron and the previous screen's title, then the screen title.
- **Back contract:**
  - The shell keeps its own in-app history list in session storage, appending on each route change.
  - Back goes to the previous entry in that list (`router.back()`).
  - When the list is empty (deep link, reload, app start), back goes to the screen's parent from the route table below.
  - A screen never picks its own back target.

  | Route | Tab | Parent |
  |---|---|---|
  | `/` | Home | none |
  | `/workouts` | History | none |
  | `/workouts/[id]` (finished) | History | `/workouts` |
  | `/workout` | Workout | none |
  | `/workouts/templates`, `/workouts/exercises` | Workout | `/workout` |
  | `/workouts/[id]` (open, live workout) | Workout, full screen | `/workout` |
  | `/progress` | Progress | none |
  | `/weekly-volume` | Volume | none |
  | `/settings`, `/messages` | Home | `/` |
  | `/help`, `/support` | Home | `/settings` |
  | `/privacy`, `/terms`, `/cookies` | Home (signed in) or none | `/settings`, or `/signup` when signed out |

  URLs stay as they are. Only tab ownership changes, through this table and not the URL prefix.
- **Live workout** is full screen, without the tab bar.
  - The top bar has Minimize, the elapsed time and a menu with "Discard workout", which confirms in a sheet. Minimize returns to the screen the workout was opened from.
  - The bottom bar holds Finish and the rest timer.
- **While a workout is open:**
  - The Home and Workout tab roots show a resume card at the top (one primary "Resume workout" button).
  - Every other tab shows a 56 px mini bar above the tab bar (title, elapsed time, chevron). Tapping it opens the live workout, and page padding includes it.
  - The centre Workout tab always opens the launcher, never the session directly. Templates and the exercise library stay visible there under the resume card.
- **Android back** works through these steps in order:
  1. close the keyboard
  2. close the top sheet
  3. go back in the in-app history
  4. on a tab root other than Home, go to Home
  5. on Home, exit the app
- **Sheets** (bottom, rounded top corners, grabber) replace centred modals on phones: pickers, filters, confirmations with more than two choices, the set editor.
  - **Closing:** swipe down, the scrim, Escape, Android back, and a visible Close or Done button (swipe is never the only way).
  - **Focus:** trapped inside the sheet. The page behind gets `inert`, and focus returns to the trigger.
- **Keyboard:**
  - The focused field scrolls into view above the keyboard (use `visualViewport`).
  - Bottom action bars move above the keyboard or hide while it's open, and never cover the field.
  - The native resize mode (Capacitor Keyboard plugin) is decided in the mobile work.

## Type

One family, the platform's own, for a native feel and zero font loading:

```css
--font-sans: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
--font-numeric: ui-rounded, "SF Pro Rounded", var(--font-sans);
```

- **Numbers** (weights, reps, durations, stat values) use `--font-numeric` with `font-variant-numeric: tabular-nums`. Rounded numerals are the one typographic signature, as on Apple Fitness. Android falls back to Roboto.
- **No monospace anywhere** in the UI, and Space Grotesk and JetBrains Mono are removed.
- **No `uppercase` and no letter-spacing on labels.** The only exception is a single-word badge such as "PR", and even that stays sentence case where possible.

The scale follows iOS text styles in rem, so 200% zoom works:

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `large-title` | 34 / 41 | 700 | Tab root titles |
| `title-1` | 28 / 34 | 700 | Pushed screen titles on wide screens, hero numbers |
| `title-2` | 22 / 28 | 700 | Section headings |
| `title-3` | 20 / 25 | 600 | Card titles, sheet titles |
| `headline` | 17 / 22 | 600 | Row titles, button labels |
| `body` | 17 / 22 | 400 | Text, inputs |
| `callout` | 16 / 21 | 400 | Secondary text in rows |
| `subhead` | 15 / 20 | 400 | Metadata, helper text |
| `footnote` | 13 / 18 | 400 | Captions, legends, timestamps |
| `caption` | 12 / 16 | 500 | Chart axes, badges. Nothing is smaller, except tab labels (11 / 13). |

Inputs are at least 16 px, or iOS zooms on focus. Display numbers (`title-1` and up) may use tighter leading but never negative tracking below −0.01em.

## Color

Semantic tokens only. Components never use raw hex. Dark is the default theme; light follows `prefers-color-scheme` and a setting.

In Tailwind v4, the raw values live as CSS variables on `:root` and `[data-theme="light"]`, and `@theme` maps them by role (`--color-surface: var(--surface)` and so on). Components then use `bg-surface`, `text-text-secondary` and similar classes, and switching the theme never changes a class name.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0b0d10` | `#f2f3f5` | App background |
| `--surface` | `#15181c` | `#ffffff` | Cards, grouped list rows |
| `--surface-raised` | `#1e2227` | `#e9ecef` | Sheets, inputs, pressed rows |
| `--line` | `#2a2f35` | `#d9dde2` | Hairline separators (decorative) |
| `--control-line` | `#6b7580` | `#7b848d` | Input and checkbox borders (3:1) |
| `--text` | `#f1f3f5` | `#0f1215` | Primary text |
| `--text-secondary` | `#a7b0b9` | `#4a535c` | Secondary text |
| `--text-muted` | `#8a949e` | `#5f6871` | Metadata, inactive tabs |
| `--accent` | `#2dd4e6` | `#0b6f7c` | Primary buttons, active tab, links, focus ring |
| `--on-accent` | `#04191c` | `#ffffff` | Text on accent fills |
| `--success` | `#34d399` | `#15803d` | Completed, saved |
| `--warning` | `#fbbf24` | `#b45309` | Needs attention |
| `--danger` | `#f87171` | `#c81e1e` | Destructive actions, errors |

Contrast checked on 2026-11-08 (WCAG):

| Pair | Dark | Light |
|---|---|---|
| text on surface | 16.0 | 18.8 |
| text-secondary on surface | 8.1 | 7.8 |
| text-muted on surface | 5.8 | 5.7 |
| accent on surface | 9.9 | 5.9 |
| on-accent on accent | 10.1 | 5.9 |
| success / warning / danger on surface | 9.3 / 10.7 / 6.4 | 5.0 / 5.0 / 5.7 |
| control-line on surface | 3.8 | 3.8 |

Rules:
- **One accent.** Cyan stays as the brand thread, because it matches the figure's rim light. It marks the primary action, the active state, links and focus, and nothing decorative. There are no glows, no gradients on UI chrome, and no second or third accent. Lavender and neon green leave the UI palette.
- **Status colors** always come with an icon or a word, never color alone.
- **Personal bests** use a trophy icon plus the word "PR" in `--text`. Green isn't reserved for them.

### Data colors

- **The 3D bay stays a dark stage in both themes.** The figure card keeps its dark background in light mode, like a lit display case. So one validated heat ramp serves both themes, and light mode needs no second lighting setup.
- **Muscle-volume heat ramp** (sequential, one hue). On a dark figure it runs from dim to bright, so the most-trained muscle is the most visible. The current ramp does the opposite: its top stage is only 1.6:1 against the figure.

  | Untrained | Stage 1 | 2 | 3 | 4 | Stage 5 |
  |---|---|---|---|---|---|
  | `#2f353c` | `#7048c0` | `#8a5ce6` | `#a47cff` | `#c2a6ff` | `#e2d6ff` |

  Contrast against the figure (`#171a20`) rises from 2.8:1 to 12.7:1. Stage 1 is 2.0:1 against "untrained". Neighbouring stages are close (about 1.4:1), so the legend with set ranges is always visible, and tapping a muscle names its stage and set count in words. Because the stage stays dark, the same ramp is used in the light theme.
- **Charts** (Progress): one series per chart in `--accent`. A comparison series uses `--text-secondary`. There is never a second y-axis. Grid lines in `--line`, axes in `caption` and `--text-muted`. Line charts have a crosshair and tooltip. A table view of the same data sits one tap away.
- **Stat tiles:** label (sentence case, `subhead`, `--text-secondary`), value (`--font-numeric`, `title-1`, `--text`), unit in `callout` next to the value, optional delta with direction word ("up 12% vs last week"). Tiles never hold a chart and a number at the same size.

## Space, shape and layout

- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 40 px.
  - screen side margin: 16
  - card padding: 16
  - row height: at least 44 (single line) or 60 (two lines)
  - gap between sections: 24–32
- **Radius:** 12 for cards and sheets' top corners, 10 for buttons and inputs, full for chips and segmented controls. There are no chamfers. Hierarchy comes from space and type, not from borders.
- **One level of container.** A card never contains another bordered card. Inside a card, use rows with hairline separators.
- **Grouped lists** (iOS inset style) for settings, personal bests, recent workouts and history: `--surface` rows on `--bg`, 12 radius on the group, hairline separators inset 16 from the left, a chevron on rows that navigate.
- **Touch targets:** at least 44×44 px for every interactive element, including text links, checkboxes (24 px box inside a 44 px row) and chips. Inline text links get vertical padding to reach 44.
- **Primary action placement:** the main action of a screen sits in the bottom third.
  - a full-width button above the tab bar or in the bottom action bar
  - in a header only when it's a secondary action (Edit, Add)
- **Wide screens:** at 768 px and up, content runs in a 720 px column. At 1024 px and up, tab roots use two columns (main plus side panel) and the tab bar becomes a left sidebar with the same five destinations, plus Settings at the bottom. Phones stay the reference; wide layouts must not add features.

## Components

- **Buttons:**
  - **Primary:** filled `--accent`, `headline` text in `--on-accent`, 50 px tall, full width on phones. At most one per screen.
  - **Secondary:** `--surface-raised` fill and `--text`.
  - **Destructive:** `--danger` text on `--surface-raised`. Destructive actions confirm in a sheet, never in a browser dialog.
  - **Plain:** text in `--accent` with no fill, for header actions.
  - Labels are verbs in sentence case ("Start workout", "Save", "Finish workout").
- **Inputs:** `--surface-raised` fill, 1 px `--control-line` border, 10 radius, 50 px tall, label above in `subhead`. Errors appear below the field in `--danger`, with an icon. Use the right `type` and `inputmode` (`decimal` for weight, `numeric` for reps) so phones show number pads. Units sit outside the field as a suffix label, not inside the value. Password fields have a show/hide toggle.
- **Toggles:** native-looking switches (`role="switch"`) with no ON/OFF text. Changes save immediately and show a brief "Saved" confirmation. A form with several fields saves with one Save button at the bottom. Don't mix the two patterns on one screen.
- **Segmented controls:** for 2–4 views of the same data (1W, 1M, 3M, Max; Front and Back). Each segment is at least 44 px tall, and the selected one gets a `--surface` pill.
- **Set logger** (live workout, as built in Step 10):
  - **Exercise list:** a grouped list with a drag handle, the exercise name and its set count. A row opens that exercise. "Add exercises" sits under the list; it is the primary button only while the list is empty.
  - **Exercise view:** "Exercises" back control, "Exercise 2 of 5" with previous and next, the name as the heading, the muscles, then the previous best set ("100 kg × 8", the workout and its day).
  - **Set rows:** set number (W for warm-up), "60 kg × 8", RIR, and a chevron. Warm-up and Edited appear as words under the weight. A row opens the set editor sheet.
  - **New set and edit set** open in a sheet: Working or Warm-up as a segmented control, weight and reps steppers (−, value, unit, +; the value opens a number pad), RIR chips 0–5 with an info button, an optional note, then Save and Cancel. Delete is in the edit sheet and needs a second tap ("Tap again to delete"). Swipe-to-delete isn't built, so nothing depends on swiping.
  - **Saving a set** is what completes it. There's no pre-filled row with a done check: the composer opens with the last set's values (or the previous best weight for a first set), so a repeat set is Add set, then Save.
  - **Rest timer** starts after each saved set and lives in the bottom bar above Finish: ring, time left, −15 s, +15 s, Skip. It vibrates when rest is over.
  - **Finish workout** asks for a second tap ("Tap again to finish") instead of a sheet, because finishing can be corrected afterwards (times, sets) and happens once per workout.
- **States:** every data screen designs four states.
  - **Loading:** a skeleton in the final geometry; spinners only for actions.
  - **Empty:** one sentence saying why, plus the one action that fixes it ("No sets this week yet." with "Start workout").
  - **Error:** what happened and what to do, with a Retry button, next to the failed part. The rest of the screen keeps working.
  - **Offline:** a banner, with logging still allowed. This belongs to the mobile work and waits for the offline-sync ADR.
- **Icons:** one outline set on a 24 px grid with a 1.75 px stroke, extending the existing inline SVGs in `shared/ui/icons.tsx`. Adding an icon library is a dependency change and needs its own decision. Icons label tabs and actions, not paragraphs. No square bullet glyphs.

## Voice and copy

Write like a friendly coach texting you, not like a terminal.

- **Sentence case everywhere:** titles, buttons, tabs, labels, badges. "Start workout", not "START WORKOUT" or "Start Workout".
- **Plain words.** No internal names on screen: no `SNAKE_CASE`, enum values, ids or field keys. Examples:
  - `WORKOUT_COMPLETE` → "Workout complete"
  - `MERGE_AWAY (duplicate)` → "Duplicate to remove"
  - `EST_1RM` → "Estimated 1RM"
- **Jargon gets one explanation:** RIR is "Reps in reserve (RIR)" at first use, with an info sheet. "1RM" likewise. Retire "heat ceiling" and "functional storage": say what they do ("Weekly sets for full color", "Save settings on this device").
- **Names stay the same** across the app:
  - **workout**, not session
  - **exercise**
  - **set**
  - **template**
  - **personal best (PR)**
  - **discard** an unfinished workout, **delete** a finished one
- **Numbers and units:**
  - "100 kg × 8", "3 sets", "45 min", "1 h 12 min"
  - Dates: "Today", "Yesterday", "Mon 31 Aug". The year only when it isn't the current one.
  - Thousands separators per locale.
- **Errors** say what happened and what to do next, in one or two short sentences: "Couldn't save this set. Check your connection and try again." Never show raw validation text ("String must contain at least 1 character(s)"). Map validation to "Enter your username."
- **Empty states** say why the screen is empty and offer the next step.
- **No decoration in text:** no `//`, `·` chains, `→` arrows, `>` prompts, brackets or emoji. One arrow is fine as a chevron icon on a navigating row.
- **Legal and help pages** use `body` text at a readable 65-character measure. Version and compliance details go in a footer, not the header.

## Motion

- **Durations:** 120 ms (press feedback), 200 ms (toggles, segmented controls), 280 ms (sheets, push). Easing `cubic-bezier(0.2, 0, 0, 1)` for enter and `cubic-bezier(0.4, 0, 1, 1)` for exit.
- Animate only `transform` and `opacity`. No `transition: all`, no pulsing dots, no idle animation on UI chrome.
- Completing a set and setting a PR get one short confirmation each (a check fill, a small burst on the figure). These are the only celebratory moments.
- **Reduced motion:** sheets fade instead of slide, the figure stops auto-rotating, and confirmations become a static state.

## 3D figure and volume map

- **Home:** the figure sits in one card under the header, about 240 px tall on phones (not 36 dvh). Under it, three stat tiles for this week: workouts, sets, volume. The bay stays but is quieter: no connector beams, no motes, a softer floor glow.
- **Volume:** the figure is the screen. Front and Back are a segmented control above it, and the time range is a second segmented control. The legend sits under the figure. Tapping a muscle opens a sheet with its weekly sets and the exercises that hit it. Show a one-time gesture hint, not a permanent label.
- The figure must stay readable with no data: when nothing is trained, raise its base light so the anatomy is visible.
- Never let 3D push the primary action below the fold on a 390 × 844 screen.
- The canvas must not cover UI. Overlays such as the guide card and sheets stack above the canvas and its ambience layers (fixes the step 6 guide defect).

## Accessibility

- Contrast as listed above. Focus ring: 2 px `--accent` outline with 2 px offset, on every interactive element.
- Lists are lists (`ul`/`li`, including sortable ones), each screen has one `h1`, and data that looks like a table is a table.
- Dynamic text: layouts survive 200% zoom and long German exercise names (wrap to two lines, then truncate with the full name available).
- Every chart has a table view, and every color-coded state has a word.

## Assets

| Asset | Status | Note |
|---|---|---|
| 3D figure, pedestal, bay | Have | Restyle lighting and remove the decorative layers only |
| Region maps for the volume mask | Have | The owner draws any new art |
| Icons | Partly (`shared/ui/icons.tsx`) | Extend to the full outline set needed by the new navigation |
| App icon and splash | Missing | Needed for the mobile work, not this rework |

## Decisions log

- **2026-11-08: dark-first** with a full light theme. Gyms are often dimly lit and the figure looks best on dark; light is needed for daylight and accessibility.
- **2026-11-08: platform system font** instead of Space Grotesk and JetBrains Mono. A native feel inside Capacitor, no font loading, and the audit's monospace and caps findings disappear at the root.
- **2026-11-08: cyan kept as the only accent**, toned for contrast in each theme. Lavender and neon green leave the UI.
- **2026-11-08: heat ramp flipped** to dim-to-bright on the dark figure. The current ramp hides the most-trained muscles.
- **2026-11-08: Templates and Exercises move to the Workout tab, and Settings and Messages to the Home header.** History holds only history.
- **2026-11-08: "template" stays** as the user-facing name. It matches the API and existing users. Hevy's "routine" was considered and can be revisited in Step 10.
- **2026-11-08: the 3D bay stays dark in the light theme**, with one heat ramp for both. This came from Sol's review of light-mode 3D.
- **2026-11-08: the centre Workout tab always opens the launcher.** The resume card sits on top of it, so templates stay reachable during a workout (audit finding).
- **2026-11-08: URLs stay; tab ownership comes from the route table.** Moving `/workouts/templates` under `/workout` would break links for no user gain.
- **2026-11-09: a finished workout is deleted from its own screen** (menu, then a confirm sheet), not from the History list. History rows open the workout.
- **2026-11-09: settings that are one control save on their own** (weekly sets for full color, rest length, toggles, theme) and confirm with "Saved"; the body profile keeps one Save button.
- **2026-11-09: Home shows this week's workouts, sets and volume** under the figure. Body measurements live in Settings only.
- **2026-11-09: segmented controls behave like radio groups:** one tab stop, arrow keys move the selection (`shared/ui/radio-group.ts`).
