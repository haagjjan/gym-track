# Gym Progress Tracker — Requirements (MVP PRD)

## 0. Meta
- **Owner: Jan Haag**  
- **Last updated:** 2026.08.04
- **Status:** Draft
- **Target release:** MVP v0.1  

---

## 1. Goal
**Problem:**  Most of my current Tracking in the Gym is unstructured, in multiple different files and with no overview over my progress.
**Goal:**  Creation of a WebApp for logging, storring and viewing gym workouts and progression.
**Success looks like:** 
- A user can log a full gym workout session in max 5 min.
- A user can view past full gym workouts in max 3 clicks from the starting menu.
- A user can see his weekly volume for all his selected muscle group

not good success metrics
/*
- It is possible to input the data form a workout in the Gym into the DB.
- The input of data into the DB is accessible over the internet (UI -> API -> DB)
- The data of past and current workouts can be displayed over the internet (DB -> API -> UI)
*/

---

## 2. Users & Use Context
**Primary user:**  Hypertrophy focused gym lifter
**Secondary user :**  Strength focused gym lifter, Casual gym goer (under 3 trainings per week)
**Typical usage scenario:** (2–5 bullets)
- A user wants to view his progression for a specific exercise in the gym.
    --> Could decide to change the rep range or weight for the specified exercise.
- A user wants to see how many working sets for a specified muscle group were done for the past week.
    --> Could decide to change eg. the ammounts of chest exercise to change the focused muscle group.
- Quick logging during or after the gym workout.

---

## 3. MVP Scope
### 3.1 In scope (Must-have)
- Log workout data: date time, exercise name, set type, set number, weight per set, reps per set, RIR.
- Add exercises to the shared exercise library: name, equippment, primary muscle group, secundary muscle group.
- Classify sets as: working set, warmup set
- Access past workout data: past logs
- View visualised Data for a specified exercise: each set seperatly, as a bar chart (Weight, Reps, RIR), estimated 1 Rep max.
- View weekly volume per musclegroup: count of workingsets per muscle group, for selected muscle groups
- Classify an exercise with one or more primary and optional secondary muscle groups.
- Create, manage, duplicate, and start reusable workout templates containing ordered exercises only.
- Save a completed workout's exercise structure as a template or explicitly update its source template.

### 3.2 Out of scope (Non-goals for MVP)
- Web sharing
- Nutrition
- Coaching
- mobile application
- Template planning data such as sets, rep ranges, weights, RIR/RPE, or template-specific rest times
- Supersets, circuits, alternative suggestions, favorites, and recent/frequent exercise ranking
- Template folders, tags, sharing, public templates, version history, and archiving
- Stabilizer classifications, muscle-volume weighting, coaching recommendations, and automatic muscle-coverage warnings

### 3.3 Later (Nice-to-have / vNext)
- Cardio logging and cardio history: date time, before/after workout, duration, type, distance
- Introduction to different workout structures (full body, uper & lower, push pull leg, Bro split)
- Automatic notifications/messages
- Break times/recording of time between sets
- Time since last exercise of this muscle group

### 3.4 Assumptions & constraints
- Supported browsers: latest Chrome and Firefox versions
- The input of data into the database is accessible over the internet (UI → API → DB)
- The data of past and current workouts can be displayed over the internet (DB → API → UI)

---

## 4. Prioritization (MoSCoW)

### Must
- Log exercises from the shared exercise library
- Add globally unique exercises to the shared exercise library
- Log sets with reps, weight, RIR, (optional) a custom note
- Categorize sets as warmup set or working set
- View exercise progress per set (Weight, Reps) over min one months
- Weekly sets per muscle group and exercise

### Should
- Average weekly set count over a selected period
- Resting times
- Exercises can be categorised depending on the workout split (uper / lower, push / pull / legs)

### Could
- Suggestion for weight increases
- Minimal suggested volume per muscle
- User can create workouts (set of predefined standard sessions)

### Won’t (MVP)
- Web sharing
- Nutrition
- coaching
- Mobile Application
- Cardio logging and cardio history (planned vNext)

---

## 5. MVP Exit Criteria
> MVP is “done” when all items below are true.

- [ ] User can create an account
- [ ] User can add at least one globally unique exercise to the shared library and reuse it
- [ ] User can create a session and log multiple exercises with sets
- [ ] Each set stores reps + weight + RIR + type (warmup/working) + note (optional)
- [ ] User can view history of logged sets for an exercise over a time range
- [ ] User can view history of workouts
- [ ] User can see a chart for reps/weight trend over time
- [ ] User can see weekly set totals and weekly averages per muscle group + exercises 
- [ ] App works on latest Chrome + Firefox

## 5.1 V1 mobile gym-use requirements

- Responsive mobile web is the V1 phone experience; a native mobile app is not required.
- Product chrome uses the `Gym Progress Tracker` name, a conventional settings cog, and only displays real application state; fake online/optimal/readiness labels and the idle figure overlay are absent. White is neutral titles/names/text/values, cyan is action/selection/focus/live input, lavender is working sets and secondary information, muted light green is warmup context, bright green is confirmed success/completion/rest complete/genuine performance, and red is error/destructive. Volume retains its separate five-stage purple heat scale and every color-coded state also has a text, icon, value, or pattern cue.
- Every workout control first navigates to the launch/resume flow. Starting an empty workout or a template is an explicit choice.
- An empty workout name is valid. Names save on blur or Enter.
- The live workout must support one-handed vertical exercise selection, staged multi-exercise adding, separate exercise-list and set-entry modes, 44px reorder/navigation/remove targets, and one set editor at a time. The first exercise is initially selected and later valid choices remain selected for the page lifetime. On mobile, set creation/editing uses a keyboard-aware, safe-area-aware fixed bottom sheet without automatic field focus plus Escape/cancel handling; the running rest timer uses a compact bottom dock that hides while an editor is open without stopping its countdown. Content padding prevents either surface from covering controls. Desktop editors and the timer remain inline.
- Saved live-session sets always identify `Working` or `Warmup`, and editing can change type, weight, reps, RIR, and note. The active exercise shows the heaviest working set from its latest earlier completed workout. A new draft uses the latest current-session set, then that previous performance weight, then 20 kg. Full exercise names wrap. The workout header uses a muted `LIVE · hh:mm:ss` indicator with a subtle reduced-motion-safe status pulse, `Finish`/`Confirm finish`, and no duplicate large timer. Exercise Mode explains that tapping a row opens its sets and gives each row a trailing chevron; directional fade/slide mode transitions are disabled under reduced motion.
- Unfinished new-set input remains device-local per user/workout/exercise and never creates an incomplete database set.
- Workouts, templates, exercises, and the shared exercise picker use server-backed search plus muscle/equipment/type facets. Exercise search ranks exact names, approved aliases, prefix/substring matches, typo similarity, then muscle/equipment matches. Multiple muscles use AND semantics on one exercise; cards never duplicate. Picker results paginate beyond the first 100, selections are staged, retain click order, and are committed together to a workout or template. Picker search never autofocuses; on mobile only the result region scrolls.
- History, Template, and Exercise List filters/sorts persist independently for the authenticated user during the current browser-tab session. Search text does not persist, invalid stored values are ignored, and Clear removes the saved state for that surface.
- Workout History provides an in-app canonical CSV format guide with required/optional fields, accepted classifications, ordering/timestamp rules, a complete example row, and a downloadable sample.
- Exercise List can filter `All`, `Editable by me`, or `Read-only`; system and other-user exercises are read-only. The reviewed system catalog should cover ordinary strength programs. Creation presents ranked existing matches but always allows an explicit warned custom-name choice. Primary and secondary muscle selectors use bounded overlays for both create and edit while retaining counts and the primary-muscle requirement without moving form actions.
- Progress uses one best working set per user-local calendar day, including days with multiple sessions; exercise picker counts reflect those plotted days. The selected 1W/1M/3M/MAX window controls total sets and total tonnage, including working and warmup sets, while best set and estimated 1RM remain all-time.
- Volume uses five exact purple heat stages, proportional bar lengths within a stage, inspectable set ranges, and an account-synced 5–50 ceiling. On touch devices, vertical movement beginning on the 3D figure scrolls the page, horizontal movement rotates, taps select muscles, and pinch zoom is disabled; the visible mobile hint explains sideways rotation versus vertical scrolling.
- `docs/beta-process/private-beta-1/private-beta-1-report.md` supersedes usability audit v4, then v3, then v2 where they conflict; the older sources continue to define behavior not superseded by newer evidence.

---

## 6. Definitions (Glossary)
> Add tight definitions now so your DB + queries don’t drift later.

- **Session:**  Group of movements performed witout leaving the gym or during one day.
- **Exercise:**  A distinct movement, repeatet for n sets.
- **Set:** Group of repetitions of a movement performed witout a break
- **Warmup set:**  optionally, the first set of a movement, normally with about 40-60% the weight of normal working sets.
- **Working set:**  A set, where the last few repetitions are of comftably hard effort.
- **Volume:** Amount of working sets
- **Weekly sets:** Count of all working sets (usually for a specified muscle group) compelated between Monday and Sunday of the same week.
- **Rep:** One complete reppetition of one exercise

---

## 7. User Flows (MVP)
> Short “happy paths”. These will drive your `query-list.md`.

### UF-01 - Create Account
- Goal: User creates an account to use and store data to
- Actor: User
- Trigger: User clicks "Create Account"
- Preconditions: User is not logged in

    **Main success path**
1) User is not logged in
2) User clicks "CREATE NEW ACCOUNT"
3) User enters required fields (email, username, password)
4) User clicks save
5) System validates inputs (email, username, password)
6) User is redirected to logged in page

    **Result / Postconditions**
- Unique account is created
- User is logged into account

    **Variants / Exceptions**
- Missing field -> show "MISSING FIELD"
- Email not valid -> show "EMAIL NOT VALID"
- Email already in use -> show "LOG IN" / "EMAIL NOT VALID"
- Username already in use -> show "USERNAME ALREAD IN USE" show "some viable options"
- Password not long enough -> show "PASSWORD MIN LENGTH 4"

    **Notes / Decisions**
- Username should be unique
- Email should be verified

### UF-02 - Log In
- **Goal:** User can log into his already existing account
- **Actor:** User with acount
- **Trigger:** User clicks on "LOG IN"
- **Preconditions:** User has an existing acount, and is not logged in

    **Main success path**
1) User cklicks on "LOG IN"
2) User enters fields (username, password)
3) User clicks "VERIFY"
4) System validates inputs (username, password)
5) User is redirected to logged in account

    **Result / Postconditions**
- User is logged into his unique account

    **Variants / Exceptions**
- Password or Username is wrong -> show "WRONG USERNAME/PASSWORD"

    **Notes / Decisions**
- Evt add "FORGOT PASSWORD"
- Confirm no other client is logged in

### UF-10 - Create Session
- Goal: User can create a new session
- Actor: User with logged into account
- Trigger: User clicks "START SESSION"
- Preconditions: User is logged into account

    **Main success path**
1) User is on Window "HOME"
2) User clicks on "START SESSION"
3) System creates a session
4) User is redirected to "GYM SESSION" window

    **Result / Postconditions**
- A new session is created and opened
- User can add fields to session

    **Variants / Exceptions**
- An open session is already running -> show "CLOSE RUNNING SESSION or SWITCH TO OLD SESSION"

    **Notes / Decisions**
- Confirm no session is being filled in at the same time


### UF-11 — Add Exercise to Session (Select from Library)

- **Goal:** User can add an exercise to the currently open session  
- **Actor:** Logged-in user  
- **Trigger:** User clicks **CHOOSE EXERCISES**
- **Preconditions:**
  - User is logged in
  - A session is currently open

**Main success path**
1. User is on **GYM SESSION**
2. User clicks **CHOOSE EXERCISES**.
3. System opens the shared **EXERCISE PICKER** with search, multi-muscle AND filtering, equipment, type, and sorting.
4. User toggles one or more exercises; selected rows receive a cyan outline but are not yet added.
5. User clicks **ADD SELECTED EXERCISES (N)**.
6. System appends the exercise blocks in selection order with empty set lists.
7. User is returned to **GYM SESSION** with the new exercises visible.

**Result / Postconditions**
- The selected exercises are attached to the session in click order.
- User can add sets to each exercise in this session.

**Variants / Exceptions**
- No search results → show **NO MATCHES** + option **CREATE NEW EXERCISE**
- API/network error → show **FAILED TO LOAD EXERCISES** + retry
- User cancels → return to session without changes

**Notes / Decisions**
- The shared picker searches exercise name, muscle, and equipment and supports the same facets/sorts as Exercise List.
- Selection is staged until the commit action; cancel leaves the destination unchanged.

### UF-12 — Add Exercise to Shared Library

- **Goal:** User can add a globally unique exercise to the shared library and reuse it
- **Actor:** Logged-in user  
- **Trigger:** User clicks **CREATE NEW EXERCISE**  
- **Preconditions:**
  - User is logged in

**Main success path**
1. User opens exercise picker OR exercise library page
2. User clicks **CREATE NEW EXERCISE**
3. User enters required fields:
   - name  
   - equipment  
   - primary muscle group  
   - secondary muscle group(s) (optional)
4. User clicks **SAVE**
5. System validates input (required fields, global name uniqueness)
6. System stores the exercise in the shared library
7. System confirms success and (optional) prompts: **ADD TO CURRENT SESSION?**

**Result / Postconditions**
- Exercise exists in the shared library and is reusable by all users

**Variants / Exceptions**
- Missing required field → highlight field + **MISSING FIELD**
- Name already exists → **EXERCISE NAME ALREADY EXISTS**
- Invalid muscle group → **INVALID MUSCLE GROUP**
- API/network error → **FAILED TO SAVE EXERCISE** + retry

**Notes / Decisions**
- Exercise names are globally unique, case-insensitively
- User-added exercises should keep audit metadata such as `created_by_user_id`
- Muscle groups should be a fixed enum list in MVP

### UF-13 — Log a Set (for an Exercise inside a Session)

- **Goal:** User can log sets quickly during training  
- **Actor:** Logged-in user  
- **Trigger:** User clicks **ADD SET**  
- **Preconditions:**
  - User is logged in
  - A session is open
  - The exercise is added to the session

**Main success path**
1. User is on **GYM SESSION**
2. User finds an exercise block
3. User clicks **ADD SET**
4. On mobile, system opens a viewport-fixed, safe-area-aware bottom sheet; on desktop it opens the inline editor. The first input receives focus.
5. The editor contains:
   - set type (warmup/working)
   - weight
   - reps
   - RIR
   - note (optional)
6. User enters values.
7. System saves the set through explicit **SAVE SET**.
8. UI shows the saved set with set number and an explicit `Working` or `Warmup` label.

**Result / Postconditions**
- Set is stored and linked to the session + exercise
- Set appears in session UI, history, and progress view

**Variants / Exceptions**
- Invalid values → **INVALID VALUE**
- Missing required fields → **MISSING FIELD**
- API/network error → **SAVE FAILED** + keep unsaved row + retry

**Notes / Decisions**
- Suggested ranges:
  - reps: positive integer
  - weight: positive metric value stored internally as kg
  - RIR: integer 0–10
- Recommended: auto-save each set to prevent data loss

### UF-14 — Edit or Delete a Set

- **Goal:** User can correct mistakes  
- **Actor:** Logged-in user  
- **Trigger:** User clicks **EDIT** or trash icon  
- **Preconditions:**
  - User is logged in
  - Set exists (already saved)

**Main success path (Edit)**
1. User opens **SESSION DETAIL** or active session
2. User clicks **EDIT** on a set row
3. On mobile, system opens the same bottom sheet used for new-set entry; on desktop it opens the inline editor.
4. User updates weight/reps/RIR/type/note.
5. User clicks **SAVE**.
6. System validates and updates set.

**Main success path (Delete)**
1. User clicks trash icon
2. System asks: **DELETE SET?**
3. User confirms
4. System marks the set as deleted
5. UI updates list (and optionally reorders display numbering)

**Result / Postconditions**
- Set is updated or removed

**Variants / Exceptions**
- API/network error → **UPDATE FAILED** / **DELETE FAILED** + retry
- User cancels delete → no change

**Notes / Decisions**
- Recommended: set numbers are display-only (don’t store “set #” as primary truth)
- Persistence uses soft delete; the UI can hide deleted sets from active views

### UF-15 — End / Close Session

- **Goal:** User finishes workout and ensures it’s saved  
- **Actor:** Logged-in user  
- **Trigger:** User clicks **FINISH**
- **Preconditions:**
  - User is logged in
  - A session is open

**Main success path**
1. User clicks **FINISH**.
2. The control arms as **CONFIRM FINISH** to protect against accidental taps.
3. User confirms.
4. System checks if session contains data (optional rule).
5. System marks session as closed and stores the end timestamp.
6. System redirects to **SESSION SUMMARY** or **HOME**.

**Result / Postconditions**
- Session is completed and visible in history

**Variants / Exceptions**
- Session empty → prompt **DISCARD OR KEEP?**
- Unsaved edits exist → prompt **SAVE / DISCARD / CANCEL**
- API/network error → **FAILED TO CLOSE SESSION** + retry

**Notes / Decisions**
- Recommended for MVP: allow editing past sessions (common corrections)

### UF-16 — Add Cardio Entry (Deferred / vNext)

**Status:** Deferred from MVP. This flow is retained as a vNext candidate and should not drive the first schema/API pass.

- **Goal:** User can log cardio linked to workout or standalone  
- **Actor:** Logged-in user  
- **Trigger:** User clicks **ADD CARDIO**  
- **Preconditions:**
  - User is logged in
  - Either session open OR user is on cardio/log page

**Main success path**
1. User clicks **ADD CARDIO**
2. User enters:
   - date/time (optional)
   - before/after workout (or standalone)
   - duration
   - type (run/bike/row/etc.)
   - distance (optional)
3. User clicks **SAVE**
4. System validates and stores entry
5. System shows entry in session summary (if linked) or cardio history

**Result / Postconditions**
- Cardio entry is stored and visible

**Variants / Exceptions**
- Missing field → **MISSING FIELD**
- Invalid value → **INVALID VALUE**
- API/network error → **FAILED TO SAVE CARDIO** + retry

**Notes / Decisions**
- Recommended: support both “linked to session” and “standalone”

### UF-31 — View Session Detail (Past Workout)

- **Goal:** User can view a full past workout including sets  
- **Actor:** Logged-in user  
- **Trigger:** User clicks a session in history  
- **Preconditions:**
  - User is logged in
  - Session exists

**Main success path**
1. User selects a session from **HISTORY**
2. System opens **SESSION DETAIL**
3. System displays:
   - session date/time
   - exercises
   - sets per exercise (type/weight/reps/RIR/note)
4. User optionally edits sets (if allowed)

**Result / Postconditions**
- User can view full workout quickly from Home (Home → History → Session)

**Variants / Exceptions**
- Session not found → **SESSION NOT AVAILABLE**
- API/network error → **FAILED TO LOAD SESSION** + retry

**Notes / Decisions**
- This is core to your “max 3 clicks” success metric

### UF-40 — View Exercise Progress (Table View)

- **Goal:** User views logged sets for an exercise over a time range  
- **Actor:** Logged-in user  
- **Trigger:** User opens **PROGRESS**
- **Preconditions:**
  - User is logged in

**Main success path**
1. User clicks **PROGRESS**
2. System shows exercises the user has actually logged, sorted by last done newest first
3. User optionally filters the list by muscle group
4. When filtering by muscle group, system starts with collapsed muscle-group sections
5. User expands a muscle group
6. System lists primary-muscle exercises first, then secondary-muscle exercises
7. User selects an exercise
8. User selects a 1W, 1M, 3M, or MAX time window.
9. System loads sets within range
10. System displays one strongest working set per local calendar day and the matching recent plotted-set log.
11. `TOTAL_SETS` and `TOTAL_TONNAGE` include working and warmup sets in the selected window; `BEST_SET` and `EST_1RM` remain all-time.

**Result / Postconditions**
- User sees the selected-window progress summary and the sets represented by the active plot mode.

**Variants / Exceptions**
- No data → **NO SETS IN THIS RANGE**
- API/network error → **FAILED TO LOAD PROGRESS** + retry

**Notes / Decisions**
- Recommended: toggle “include warmups” (default off)
- Progress should be visually and navigationally distinct from Weekly Volume.


### UF-41 — View Exercise Progress (Chart View)

- **Goal:** User sees visual trend for exercise progress  
- **Actor:** Logged-in user  
- **Trigger:** User clicks **CHART**  
- **Preconditions:**
  - User is in exercise progress view

**Main success path**
1. User clicks **CHART**
2. System renders graphs from one strongest working set per user-local calendar day:
   - X axis is date
   - Y axis shows weight and reps
   - Weight is a solid line
   - Reps are a dotted, non-continuous line
   - When weight changes, the reps line jumps or restarts and changes color
3. User scrolls left to inspect older entries
4. System prevents scrolling earlier than the first logged entry for the exercise
5. User switches time windows: 1 week, 1 month, 3 months, or all entries.

**Result / Postconditions**
- User sees a clear visual trend for the exercise

**Variants / Exceptions**
- Too few data points → **NOT ENOUGH DATA FOR CHART**
- API/network error → **FAILED TO LOAD CHART DATA** + retry

**Notes / Decisions**
- The EST 1RM information surface stays within the chart panel/viewport; prose may wrap and the formula remains a single line where space allows.
- Keep only the sets represented by the active plot mode in the recent log near the chart.


### UF-50 — View Weekly Volume per Muscle Group

- **Goal:** User sees weekly working-set volume per muscle group  
- **Actor:** Logged-in user  
- **Trigger:** User clicks **WEEKLY VOLUME**  
- **Preconditions:**
  - User is logged in

**Main success path**
1. User clicks **WEEKLY VOLUME**
2. System shows an anatomical body figure with separated muscles
3. System colors muscles trained in the selected window.
4. Color intensity uses the exact five-stage purple heat scale plus a neutral zero state.
5. User clicks a muscle
6. System shows the selected muscle's weekly volume stats beside the body figure
7. Stats include weekly working sets, related exercises, and recent contributing sessions
8. Clicking the selected muscle again clears the selection

**Result / Postconditions**
- User can see weekly working-set totals per selected muscle groups

**Variants / Exceptions**
- No sessions in week → show zeros + **NO WORKOUTS THIS WEEK**
- Exercise missing muscle assignment → show **UNASSIGNED** bucket (or block saving)
- API/network error → **FAILED TO LOAD WEEKLY VOLUME** + retry

**Notes / Decisions**
- Recommended: “weekly” = ISO week (Mon–Sun)
- Recommended: count only **working sets**, exclude warmups
- Weekly Volume should be visually and navigationally distinct from Progress.
- The interactive 3D body map is the default. A device-local setting can select the lighter 2D front/back map.
- Front/back view controls and muscle focus use the same smooth camera transition, except when reduced motion is requested.
- On coarse-pointer/mobile devices, vertical movement that begins on the 3D canvas scrolls the page, horizontal movement rotates the figure, taps select muscles, and pinch zoom is disabled. Desktop keeps mouse orbit and zoom.


### UF-60 — Log Out

- **Goal:** User can end access from the browser  
- **Actor:** Logged-in user  
- **Trigger:** User clicks **LOG OUT**  
- **Preconditions:**
  - User is logged in

**Main success path**
1. User clicks **LOG OUT**
2. System clears auth token/session
3. System redirects to landing/login page

**Result / Postconditions**
- User is logged out and cannot access protected pages

**Variants / Exceptions**
- Unsaved changes exist → prompt **SAVE / DISCARD / CANCEL**

**Notes / Decisions**
- Logout should be available in top navigation


## 8. Functional Requirements (traceable)

### Browser support
- **FR-01:** The web application shall support the latest Chrome version.
- **FR-02:** The web application shall support the latest Firefox version.

### Accounts / Auth
- **FR-05:** The user shall be able to create an account using email, username, and password
  when registration is enabled. Stage 1 single-owner production disables account creation
  while retaining the existing owner login.
- **FR-06:** The user shall be able to log in using username and password.
- **FR-07:** The user shall be able to log out.

### Workout sessions
- **FR-08:** The user shall be able to create a new workout session.
- **FR-08.1:** The user shall be able to edit a workout session.
- **FR-09:** The user shall be able to close/end a workout session.
- **FR-10:** The user shall be able to view a list of past workout sessions (history).
- **FR-10.1:** History shall retain validated filters/sort for the current user and browser-tab session, keep search transient, and expose the canonical CSV format/sample guide.
- **FR-11:** The user shall be able to view the full details of a past workout session.
- **FR-11.1:** Workout detail shall expose the best working set from the latest earlier owned, non-deleted, completed workout for each exercise when one exists.

### Exercises
- **FR-12:** The user shall be able to stage one or more exercises from the shared faceted library and append them to a session or template in selection order.
- **FR-13:** The user shall be able to add globally unique exercises to the shared exercise library with: name, equipment, primary muscle group, and optional secondary muscle group(s).
- **FR-13.1:** Exercise List shall filter All, Editable by me, or Read-only using the authenticated creator relationship; system and other-user exercises are read-only.
- **FR-13.2:** Exercise discovery shall paginate the reviewed system catalog and rank exact-name, approved-alias, prefix/substring, typo-similarity, then muscle/equipment matches without silently replacing a custom exercise.

### Sets (per exercise in a session)
- **FR-14:** The user shall be able to log sets with reps, weight, and RIR.
- **FR-15:** The user shall be able to categorize sets as warmup or working set.
- **FR-16:** The user shall be able to edit a previously logged set.
- **FR-17:** The user shall be able to delete a previously logged set.
- **FR-18:** The user shall be able to optionally add a text note to a set.

### Cardio (deferred / vNext)
- **FR-19:** In vNext, the user should be able to log cardio with date/time, before/after workout (or standalone), duration, type, and optional distance.
- **FR-19.1:** In vNext, the user should be able to view cardio history (minimal list view).

### Progress per exercise
- **FR-20:** The user shall be able to view progress for a specified exercise over a selected time range.
- **FR-21:** The Progress recent-set log shall show the strongest working sets represented by the active plot mode; complete raw set history remains available through workout logs.
- **FR-22:** The user shall be able to view a chart for exercise progress (weight/reps; optional RIR/estimated 1RM) using one strongest working set per local calendar day.
- **FR-23:** The progress view shall start from exercises the user has logged, sorted by last done by default.
- **FR-24:** The progress exercise list shall be filterable by muscle group, with primary-muscle exercises listed before secondary-muscle exercises.
- **FR-25:** The progress chart shall support 1 week, 1 month, 3 months, and all-entry windows. Total sets and total tonnage follow that window and include warmups; best set and estimated 1RM remain all-time.

### Weekly volume
- **FR-30:** The user shall be able to view weekly working-set counts per muscle group.
- **FR-31:** The user shall be able to view weekly working-set counts per exercise (optional: within muscle group view).
- **FR-32:** The user shall be able to filter/select which muscle groups are displayed.
- **FR-33:** The weekly volume view shall show an anatomical body visualization with separated muscles.
- **FR-34:** The weekly volume body visualization shall use five exact purple heat stages (`#E9D5FF`, `#D8B4FE`, `#C084FC`, `#9333EA`, `#581C87`) as working-set volume increases; zero remains neutral and labels/values accompany color.
- **FR-35:** The user shall be able to select a muscle and view its weekly volume details beside the body visualization.


## 9. Acceptance Criteria (sample set)

### AC-01 Log a session
- Given I’m on the session page  
- When I add an exercise and at least one set with reps/weight/RIR  
- Then the session is saved and visible in history  

### AC-02 Warmup vs working set
- Given I add a set  
- When I mark it as warmup  
- Then it is stored as warmup and displayed as warmup in history/progress  

### AC-03 Exercise progress view
- Given I have logged sets for an exercise  
- When I select a time range  
- Then I see all sets in that range with reps/weight/RIR/type  

### AC-04 Progress chart
- Given I have multiple logged sets for an exercise across dates  
- When I open the chart view  
- Then only one strongest working set is plotted per local day, the recent log matches the plotted sets, and total sets/tonnage match the selected window

### AC-05 Weekly sets summary
- Given I have logged sessions in a time period  
- When I open weekly sets  
- Then trained muscles are colored on the body map and weekly totals per muscle group match the logged working sets according to the “weekly” definition

### AC-06 Add exercise to shared library
- Given I am logged in  
- When I add a globally unique exercise with name + primary muscle group
- Then it appears in the shared exercise library and can be added to a session

### AC-07 Edit a set
- Given I have saved a set
- When I edit weight/reps/RIR/type and save
- Then the updated values appear in session detail and exercise progress

### AC-08 End session
- Given I have an active session
- When I click **FINISH** and then **CONFIRM FINISH**
- Then the session is marked closed and appears in history with the correct date

### AC-09 Cardio logging (deferred / vNext)
Deferred from MVP.

- Given I am logged in  
- When I save a cardio entry with required fields  
- Then it appears in cardio history (and in session summary if linked)  

### AC-10 Privacy baseline
- Given user A and user B exist  
- When user A requests user B’s workout data  
- Then the system denies access  


## 10. Non-Functional Requirements (baseline)

- **NFR-01 (Compatibility):** Latest Chrome + Firefox supported.
- **NFR-02 (Performance):** Home, session, history, and progress pages load in **< 2 seconds** on a typical connection (excluding first load after deploy).
- **NFR-03 (Privacy):** User workout data is only accessible to that user (auth required for all non-public endpoints).
- **NFR-04 (Reliability):** After a successful save, data is not lost after refresh/crash.
- **NFR-05 (Usability):** Logging a typical session (5 exercises × ~3 sets) should be possible in **≤ 5 minutes** on responsive mobile web or a laptop.


## 11. Open Questions

- Does the MVP include accounts/auth, or is it single-user/local first? (MVP Exit Criteria suggests yes: accounts exist)
- Can muscle groups be assigned automatically?
- Whether a future Progress view should offer an optional all-set mode; V1 defaults to one strongest working set per local day.

## 12. Founding Beta Requirements

- Public intake is email-only with required 18+ attestation and Privacy acknowledgement; all outcomes are indistinguishable publicly.
- Only `ADMIN` may approve. A seven-day, single-use invite reserves one of 50 seats and verifies the fixed email on signup. Initial approvals are limited to 10 in a rolling 24 hours.
- Every account can export server data and request password-confirmed deletion with a locked seven-day grace, emailed cancellation and permanent live-data erasure.
- Account-linked analytics and functional device storage are opt-in; browser data is per-user and legacy unscoped data is never imported silently.
- First-run help is dismissible, resumable and repeatable; practice data is never persisted. Guidance never interrupts an active workout.
- In-app campaigns are owner-to-user only, plain text, optional-response, dismissible, one at a time and suppressed during active editing. Users may opt out of non-essential prompts.
- The service identifies the cohort honestly and permanently as Founding Beta. There are no fake counters, advertising trackers, user-to-user messaging, marketing email or access benefits for voluntary support.
