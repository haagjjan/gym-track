# Design Notes v1 — Body Cockpit UI Redesign

## 1. Design direction

The new UI direction is a dark, cyberpunk / tactical cockpit interface for a personal gym tracker. The app should feel like a **body-performance control system**, not a generic CRUD dashboard.

Working product identity:

- App name: `BODY_COCKPIT_V1.0`
- User framing: `Operator`
- Workouts framing: `Sessions`, `Protocols`, `Logs`
- Progress framing: `Evolution`, `Biometrics`, `Volume Intelligence`
- Visual tone: dark, sharp, technical, neon cyan, system-console inspired

Important: the visual language may be futuristic, but the actual workout flow must stay practical, readable, and fast.

---

## 2. Global visual rules

### Theme

Use a dark interface with high contrast and neon accents.

Core style:

- Black / near-black background
- Subtle borders and panels
- Cyan primary accent
- Purple secondary accent
- Occasional green for positive status
- Occasional red for destructive actions
- Slight glow on important active elements
- Thin grid/background lines where useful
- Strong card hierarchy

### Typography

The screenshots use a mixed technical style:

- Large bold sans-serif headings
- Monospace / terminal-style labels
- Uppercase system labels
- Underscore naming for flavor, for example `START_SESSION`, `TOTAL_SESSIONS`, `BODY_COCKPIT_V1.0`

Implementation rule:

- Do not overuse hard-to-read decorative fonts.
- Functional text must remain readable on mobile.
- Use the cockpit language mostly for labels, headings, and buttons.
- Exercise names and values should stay highly legible.

### Buttons

Primary CTA:

- Bright cyan fill
- Uppercase label
- Large tap target
- Strong contrast
- Used only for main action: start session, log set, complete session

Secondary actions:

- Dark background
- Cyan border or muted border
- Used for filters, expandable sections, navigation

Danger actions:

- Red/dark red panel
- Confirmation required
- Never one-click destructive

### Cards and panels

Cards should be dark panels with:

- Thin border
- Subtle glow only when active/selected
- Strong internal spacing
- Clear label/value hierarchy
- Left accent stripe for important stat cards

Avoid:

- Dense raw tables as primary UI
- Generic white/gray dashboard cards
- Too many identical boxes without hierarchy

---

## 3. Global layout

### Desktop

Common layout:

- Left sidebar navigation
- Top system bar
- Main content area
- Optional right context panel on analytics/logging screens

Sidebar includes:

- Operator block
- Main navigation
- Persistent `START_SESSION` button
- Optional recovery/status widget

Top bar includes:

- `BODY_COCKPIT_V1.0`
- Optional section nav
- System status
- Notification/settings icons

### Mobile

The desktop sidebar cannot simply shrink badly.

Mobile rule:

- Use top bar with menu icon
- Sidebar becomes drawer
- Main actions stay easy to reach
- Active workout logging must work one-handed
- No horizontal scrolling

---

## 4. Screen notes

## 4.1 Register / Create Operator Profile

Purpose:

Create a new user/operator profile.

Visual direction:

- Centered authentication panel
- Strong title: `CREATE_OPERATOR_PROFILE`
- Dark background with subtle system decoration
- Cyber/terminal labels

Visible elements:

- Brand mark and app name
- Email input
- Operator ID / username input
- Password/access code input
- Acknowledge checkbox
- Primary `REGISTER_PROFILE` button
- Login link
- Small system status badges

Functional requirements:

- Replace decorative placeholder copy with real product wording where needed.
- The checkbox should map to real terms/privacy acknowledgement if it stays.
- Do not fake biometric/security claims unless they are purely theme labels.

States:

- Empty
- Invalid email
- Username unavailable
- Password too weak
- Loading
- Registration failed
- Success/redirect

---

## 4.2 Login / Operator Login

Purpose:

Let existing users log in.

Visual direction:

- Split hero/login layout
- Large `WELCOME_BACK`
- Right-side login panel
- Dark blurred background
- Cyan CTA

Visible elements:

- Operator ID/email field
- Password/access code field
- Remember me checkbox
- Forgot code link
- Login button
- Create profile link
- System status copy

Functional requirements:

- Use actual auth fields supported by the backend.
- Do not call login `initiate session` if this conflicts with workout sessions; consider `AUTHENTICATE` or `LOGIN`.
- Keep password visibility toggle.

States:

- Empty
- Invalid credentials
- Loading
- Network error
- Logged in redirect

---

## 4.3 Dashboard / Home

Purpose:

Give the user the next useful action immediately.

Visual direction:

- Hero cockpit screen
- Background scene / platform visual
- Performance personal bests on the left
- Weekly volume and biometric summary on the right
- Recent logs along the bottom
- Large primary action: `INITIATE_SESSION`

Visible elements:

- Operator profile
- PB values: bench, squat, deadlift
- Weekly volume preview
- Biometric/status summary
- Recent logs strip
- Start/initiate workout button

Functional requirements:

- The page must answer: “What should I do now?”
- If active workout exists, primary action must be resume workout.
- If no active workout exists, primary action starts workout selection.
- Background visual is decorative only and must not block content.
- Use lazy-loaded/background image, not heavy 3D yet.

States:

- No workouts yet
- Active workout exists
- Recent workouts available
- Missing body metrics
- Loading

---

## 4.4 Workout / Select Operation Archetype

Purpose:

Start or resume a workout.

Visual direction:

- Mission selection screen
- Resume card at top if a live/open workout exists
- Custom protocol groups below
- Search/scan database on the right

Visible elements:

- Resume current/last session card
- Estimated duration
- Exercise chips
- Protocol categories:
  - Frontal / Push
  - Rear Guard / Pull
  - Foundation / Legs
  - Custom
- Start/continue action

Functional mapping:

- `Operation Archetype` = workout type/template group
- `Protocol` = reusable workout structure
- `Mission` = workout session

Functional requirements:

- Must support starting empty workout.
- Must support reusing last workout structure.
- Must not require a full template system in v1.
- Resume active workout must be visually dominant if available.

States:

- No active workout
- Active workout exists
- No protocols/templates yet
- Search empty
- Loading

---

## 4.5 Active Workout Logging

Purpose:

Core gym-use screen for logging sets quickly.

This is the most important screen.

Visual direction:

- Large active exercise title
- Session timer
- Current set rows/cards
- Right-side session metrics panel on desktop
- Insert exercise and complete session actions
- Cyber styling, but functional layout first

Visible elements:

- Current exercise name
- Muscle group
- Session timer
- Target volume / current set / previous max
- Set input:
  - weight
  - reps
  - RPE/RIR
  - log set button
- Previous/active sets
- Insert exercise
- Complete session
- Pause/scrub/delete session
- Session metrics

Functional requirements:

- Only one exercise expanded/active at a time.
- Other exercises should be accessible but not clutter the screen.
- Logging a set must be fast and obvious.
- Saved sets should become compact rows.
- Editing a saved set must not break new-set input.
- Deleting a set or session requires confirmation.
- No decorative 3D inside this screen.

Important UX correction from current app:

- Do not auto-start confusing new set behavior unless it is clearly intended.
- Do not keep the user stuck in edit mode.
- Do not show Excel-like grids for previous exercises.

States:

- No exercise in workout
- Exercise selected, no sets
- Draft set in progress
- Set saving
- Set saved
- Editing saved set
- Save failed
- Delete confirmation
- Complete session confirmation

---

## 4.6 History / Session History

Purpose:

Browse previous workouts.

Visual direction:

- Data repository / logs page
- Summary stat cards at top
- Search/filter
- Large readable workout log cards
- Expandable detail rows

Visible elements:

- Total sessions
- Cumulative tonnage
- Average duration
- Completion rate
- Filter exercise/search
- History cards with:
  - date
  - workout name
  - duration
  - tonnage/calories
  - expand action
- Load more logs

Functional requirements:

- History must not look like raw database output.
- Workout names must be scannable.
- Expand should show exercise/set details.
- CSV/export controls should not dominate normal browsing.

States:

- Empty history
- Filter no results
- Loading more
- Expanded workout
- Failed load

---

## 4.7 Progress / Evolution Analysis

Purpose:

Analyze progress for a selected exercise.

Visual direction:

- Analytics cockpit
- Left exercise selector
- Metric cards at top
- Large central chart
- Recent data table below

Visible elements:

- Exercise search/filter
- Exercise list
- Time range selector: 1W / 1M / 3M / MAX
- Total sets
- Average reps
- Best set
- Estimated 1RM
- Chart: load/intensity and reps/velocity
- Recent set logs table
- Export raw data

Functional requirements:

- One selected exercise at a time.
- Chart must have clear metric meaning.
- No duplicate/garbage legends.
- Data table is secondary, not the main experience.
- Low-data states must explain what is missing.

States:

- No exercise selected
- Not enough data
- Exercise selected
- Loading chart
- Filter no result
- Export failed/success

---

## 4.8 Volume / Volume Heatmap

Purpose:

Show weekly training distribution by muscle group.

Visual direction:

- Body reconstruction / heatmap
- Front and back body silhouettes
- Highlighted trained muscle groups
- Right-side volume intelligence panel

Visible elements:

- Week range selector: 1W / 1M / 3M
- Front body view
- Back body view
- Legend:
  - optimal volume
  - active maintenance
  - recovery/atrophy risk
- Target muscle
- Working sets
- Intensity label
- Distribution matrix
- Contributing exercises
- Weekly total volume
- Recovery status

Functional requirements:

- Start with 2D silhouettes or simple SVG, not 3D.
- Highlight muscles based on real workout data.
- Clicking/tapping a muscle filters the right panel.
- Show contributing exercises.
- Avoid fake precision.

States:

- No volume data
- Muscle selected
- No muscle selected
- Loading
- Not enough data

---

## 5. Naming / product language

The theme uses strong cyber/tactical language. Keep it consistent but do not make the app confusing.

Recommended mappings:

- User = Operator
- Workout session = Session
- Workout template/type = Protocol
- Exercise library = Database
- Progress = Evolution
- Volume = Volume Heatmap / Volume Intelligence
- Start workout = Start Session
- Finish workout = Complete Session
- Delete workout = Scrub Session
- Add exercise = Insert Exercise
- Add set = Log Set

Use sparingly where clarity matters.

Example:

- Button can say `START_SESSION`
- Helper text should say normal words: “Start a new workout.”

---

## 6. Accessibility and usability rules

The aesthetic must not destroy usability.

Rules:

- Minimum tap target: about 44px height.
- Use readable font sizes on mobile.
- Cyan-on-black is okay, but low-contrast gray labels must be checked.
- Do not rely only on color to show status.
- Inputs need visible labels.
- Error messages must be human-readable.
- Decorative background must never reduce readability.
- Respect reduced-motion if animations are added.

---

## 7. 3D / animation policy

No 3D in v1 core logging.

Allowed later:

- Dashboard hero scene
- Volume/body visualization upgrade
- Progress decorative effects

Rules if added:

- Isolated component only.
- Lazy-loaded.
- Static fallback required.
- Must not block workout logging.
- Must not own app state.

---

## 8. Implementation principle

Do not paste Stitch-generated UI directly into the app.

Use Stitch as:

- Visual reference
- Layout reference
- Component reference
- Color/spacing inspiration

Build the real UI with the existing app data, API behavior, and components.
