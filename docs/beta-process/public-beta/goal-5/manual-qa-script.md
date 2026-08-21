# Manual QA Script — SQC-7 and SQC-8

**Status:** Ready to execute; not yet run

**Recorded:** 2026-08-20

**Owner:** Controller / device operator

These two gates are the last ones whose findings change application code, so they run **before**
the SQC-4 freeze. Anything found after the freeze costs a new SHA and a redeploy.

## Where to run it

Run against **staging**, not production: production still serves the old private release, and
staging runs the candidate behind the same real Cloudflare Access, Tunnel and proxy path.

One friction point to plan for: staging is behind Cloudflare Access, so the phone needs an Access
session. Complete that login on mobile data **before** starting the timed workflow, so the Access
redirect does not get mistaken for an application failure.

Record every failure with a screenshot and the step number. A failure here is a defect, not a note.

## SQC-7 — Samsung S22 Plus, Firefox, mobile data

Mobile data, not Wi-Fi. The point is real-network latency and a real Android keyboard.

| # | Step | Pass condition |
| --- | --- | --- |
| 1 | Sign in | Reaches the dashboard; no console-visible failure, no layout overflow |
| 2 | Start a workout | Workout opens; controls reachable without horizontal scrolling |
| 3 | Add an exercise from the picker | Search returns results; selection closes the picker and the exercise appears |
| 4 | Log three working sets | **Android keyboard does not cover the weight/reps inputs**; each set persists |
| 5 | Edit one logged set | The change saves and is visible after the sheet closes |
| 6 | End the workout | Summary reports the correct exercise, set and volume totals |
| 7 | History | The workout appears with correct totals |
| 8 | Progress | The session's sets are plotted |
| 9 | Weekly Volume | The 3D figure loads; **vertical swipe scrolls the page, horizontal drag orbits the figure** |
| 10 | Rotate to landscape and back | No layout break, no lost input |
| 11 | Airplane mode for ~10s mid-workout, then restore | No logged set is lost; the app recovers without a manual reload |

Step 4 and step 9 are the two most likely to fail — the keyboard overlay and the gesture conflict
are exactly what a desktop browser at a narrow viewport cannot reproduce.

## SQC-8 — Manual accessibility on production-shaped rendering

Automated coverage already closed SQC-5 and SQC-6. Those scans check **markup and computed
values**. The four checks below exist because a scan cannot judge whether the result is actually
usable — that needs a person. Each one says what it means, why the automated pass does not already
cover it, and exactly what to do.

### 1. Keyboard only — reported passing 2026-08-20

**What it means.** Some people cannot use a pointer at all and navigate entirely with Tab,
Shift+Tab, Enter and Escape.

**How to do it.** Unplug the mouse, or commit to not touching the trackpad. Traverse signup, a full
workout, settings and the legal pages using only the keyboard.

**Pass conditions.** The focus ring is visible at every step and never disappears; Tab order
follows the visual order; focus never enters the greyed-out background behind an open dialog; and
no control can only be reached by clicking.

### 2. Screen reader

**What it means.** A blind or low-vision member navigates by listening. The software speaks the
page aloud, and the app is usable only if the spoken output makes sense on its own.

**Why the axe scan does not cover this.** Axe verifies that a label exists in the markup. It cannot
tell you whether "text field" versus "Email address, text field" is what actually gets announced,
or whether adding a set produces any announcement at all rather than silence.

**How to do it.** macOS has VoiceOver built in — Cmd+F5 toggles it, and Ctrl+Option+arrow keys move
through the page. On Windows, NVDA is free. Turn the screen brightness down or look away, so you
are judging what you *hear*.

| Flow | Pass condition |
| --- | --- |
| Signup | Each field announces what it is and any error; the adult and policy attestations are reachable and their checked state is spoken |
| Workout logging | Weight and reps inputs announce their purpose; adding a set announces the result rather than changing the page silently |
| Modals | Opening announces that a dialog opened and its title; Escape returns focus and announces where it landed |
| Settings | Toggles announce on or off, not only their label |

### 3. Contrast

**What it means.** Text must be readable against whatever sits behind it. WCAG AA requires a
contrast ratio of at least **4.5:1** for normal text and **3:1** for large text.

**Why the axe scan does not cover this.** Axe resolves solid colours, but the design layers
translucency — `bg-surface/70`, `border-outline-dim/60`, backdrop blur. Axe usually cannot compute
what a semi-transparent layer actually renders as, so it skips those nodes rather than failing
them. A clean scan is not proof.

**How to do it.** Open the app, inspect a text element in Chrome DevTools, and click the colour
swatch next to `color` — DevTools shows the live contrast ratio against the real rendered
background, with a tick or cross for AA.

**What to sample:** body text; `text-fg-muted` (muted grey on a dark surface is the likeliest
failure); each button variant including disabled; the red error state; the green success state; and
the small print under the legal page headings.

### 4. Reduced motion

**What it means.** Animation triggers nausea and dizziness for people with vestibular disorders,
so operating systems expose a "reduce motion" preference that apps are expected to honour.

**Why devtools emulation is not enough.** Emulation flips the CSS media query only. It does not
catch animation driven from JavaScript that reads the preference at runtime, which is how the
3D scene decides what to do.

**How to do it.** macOS: System Settings → Accessibility → Display → Reduce motion. Windows:
Settings → Accessibility → Visual effects → Animation effects. Set it at the OS level, then load
the app fresh.

**Pass conditions.** The avatar turntable stops at its fixed starting rotation, the live status
animation stops, and nothing else on the page keeps moving.

## Recording the result

Both gates need evidence, not an assertion. For each: date, device or assistive technology and
version, staging release SHA, the step table with pass/fail, and screenshots for failures. Add the
result to [launch-gates.md](../goal-1/launch-gates.md) under SQC-7 and SQC-8, and raise any defect
before the freeze.
