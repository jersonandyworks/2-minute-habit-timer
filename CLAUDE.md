# CLAUDE.md

Guidance for Claude Code working in this repository.

## Branch layout — read first

The app lives on the checked-out branch `main`. `origin/master` holds the **original
single-screen version** (one hardcoded 2:00 timer, no habits, no persistence) — unrelated
history, kept for reference only. Read it with `git show origin/master:main.js`; don't
merge it.

## What this is

Electron desktop app (Windows-targeted) built on the *Atomic Habits* two-minute rule.
Create habits, run a short focus session on one, and log every finished session.
Visual design is variant A ("Soft Aqua") from `design.html`.

## Commands

```sh
npm install
npm start        # electron .
npm run pack     # electron-builder --dir (unpacked build)
npm run dist     # electron-builder -> NSIS installer, productName "TimerApp"
```

On Linux, `npm start` may hit the SUID sandbox error; run `npx electron . --no-sandbox`
locally. No tests, no linter, no bundler — HTML/CSS/JS load as-is.

## Architecture

`contextIsolation: true`, `nodeIntegration: false`. The renderer reaches the main process
only through `window.api`, defined in `preload.js` — **do not add `require()` to renderer
code**; add an IPC channel and expose it in the preload instead. Both HTML files also set
a CSP that blocks inline `<script>`, so all JS lives in its own file.

- **`main.js`** — window creation, the popup singleton, the reminder scheduler, IPC
  handlers. Main window 400x700; popup 460x340, `alwaysOnTop`.
- **`preload.js`** — the full renderer API surface. One `contextBridge` object.
- **`store.js`** — persistence. A single `habits.json` in `app.getPath("userData")`,
  read once into an in-memory array on `init()` and rewritten on every mutation.
- **`quotes.js`** — the ~170 general motivational quotes, carried over from the original
  version. Used when a habit has no work type.
- **`work-quotes.js`** — `WORK_TYPES` (the dropdown) and `WORK_QUOTES` (20 per type).
  Main-process module; the renderer gets the type list over the `work:types` channel
  rather than duplicating it. Quote objects are `{ text, by }`, and **`by` is filled in
  only where the attribution is widely documented** — the rest are deliberately
  unattributed rather than misattributed. Keep that rule when adding quotes.
- **`index.html` / `renderer.js`** — all three screens in one window as `.view` sections;
  `show(viewId)` toggles `.active`. `renderer.js` owns the countdown, the forms, the icon
  picker and the delete confirmation sheet. A view taller than the window puts its fields
  in a `.scrollarea` so the footer buttons stay pinned (see the create view).
- **`icons.js`** — the habit icon set as a global `ICONS` map of 24x24 stroked SVG
  innards, plus `ICON_KEYS` and `DEFAULT_ICON`. Loaded before `renderer.js`. **Icon keys
  are stored on the habit, so renaming one orphans existing habits** — add, don't rename.
- **`popup.html` / `popup.js`** — the finish/reminder window. Same file serves both,
  switched by the `kind` field.
- **`styles.css`** — the whole design system. Palette tokens live in `:root`.
- **`design.html`** — the three original design directions. Reference, not shipped UI.

### Data shape

```js
{ id, name, description,
  reminderStart: "15:00", reminderEnd: "17:00",   // when to nudge
  reminderDay: "daily"|"mon".."sun",              // applies to both windows
  sessionStart: "13:00", sessionEnd: "14:00",     // the daily slot for the habit
  duration: 120,                                  // focus countdown, in seconds
  createdAt, lastReminded: "YYYY-MM-DD", lastSessionEnded: "YYYY-MM-DD",
  logs: [{ at, duration }] }
```

`logs` is newest-first (`unshift`). `lastReminded` is what stops a reminder firing twice
in one day.

### IPC channels

| Channel | Kind | Effect |
| --- | --- | --- |
| `work:types` | invoke | the work-type dropdown options |
| `habits:list` / `habits:get` | invoke | read from the store |
| `habits:create` / `habits:delete` | invoke | mutate and persist |
| `session:complete` | invoke | log the session, open the popup with a random quote, return the updated habit |
| `habits:changed` | main → renderer | a reminder fired; the renderer refetches |
| `popup:data` | main → popup | `{ kind, title, message, note, quote: { text, by } }` |
| `popup:close` | popup → main | close the popup window |

### Three durations, don't mix them up

| Field | UI label | Meaning |
| --- | --- | --- |
| `reminderStart`/`reminderEnd` | Alarm reminder | when to nudge you to start |
| `sessionStart`/`sessionEnd` | Session duration | the daily slot the habit belongs to; **Start Now only works inside it** |
| `duration` | Focus timer | how long one countdown runs, in seconds |

Both windows are optional (empty strings) and share `reminderDay`.

### The Start Now gate

`sessionState()` in `renderer.js` decides whether the button is live, returning one of
`none` / `before` / `open` / `closed`. **A session can only start inside the window**: the
button is locked both before `sessionStart` ("Opens at 1:00 PM") and after `sessionEnd`
("Session window closed"). `none` — no window set, or the habit isn't scheduled today per
`reminderDay` — leaves it enabled, so untyped habits behave as they always did.

A window crossing midnight reports `before` when outside it rather than `closed`, since
the next thing to happen is the window opening again.

The lock is enforced in three places, and all three matter: the `disabled` attribute, the
`.locked` class for the light styling, and an early return in `startSession()` so nothing
can start the timer around the disabled button.

`updateStartButton()` is deliberately separate from `renderHabit()` — a 15s ticker in
`wire()` calls it so a window closing while the habit is on screen locks the button
without redrawing the history log under the user.

### Schedulers

One `setInterval` in `main.js` every 20s runs `checkSchedules()`, which asks two questions
per habit. Both fire at most once a day, guarded by a `YYYY-MM-DD` field on the habit:

- **`checkReminder`** — is the clock inside `[reminderStart, reminderEnd)`? Opening the app
  mid-window still catches it; after the window closes, the day is skipped
  (`lastReminded`).
- **`checkSessionEnd`** — has `sessionEnd` just passed, within `SESSION_END_GRACE`
  (15 minutes)? The grace exists so launching the app at night doesn't replay every window
  that closed that day (`lastSessionEnded`).

Both handle windows crossing midnight — the reminder via its `start <= end` branch, the
session end via modulo-1440 arithmetic.

`store.js` `migrate()` brings old saves forward field by field: a pre-window `reminderTime`
becomes a one-hour window, and habits saved before session windows existed get empty ones.
Don't drop it until those files are certainly gone.

## Conventions

- Tabs for indentation, double-quoted strings, semicolons.
- Palette: `#F2FCFE`, `#96E6F5`, `#57D9F1`, `#01C9EE`. All four are too light for text —
  `--ink` / `--ink-mid` / `--ink-dim` exist for that and are not part of the brand palette.
- Any habit name rendered into `innerHTML` goes through `escapeHtml()` in `renderer.js`.
- `habit.icon` is an `ICONS` key, or `""` for habits created before the picker existed —
  `iconFor()` falls back to cycling the set by list position for those.
- `habit.workType` is a `WORK_QUOTES` key, or `""`. `quoteFor()` in `main.js` routes on it
  and falls back to `quotes.js`, so an unknown key degrades quietly instead of throwing.
- The focus timer is stored in seconds; the picker offers 120/300/600/900.
- Window times are `"HH:MM"` strings, 24-hour, compared as minutes-since-midnight.
- Electron is pinned to `^44` — 36.x carries known high-severity advisories.
