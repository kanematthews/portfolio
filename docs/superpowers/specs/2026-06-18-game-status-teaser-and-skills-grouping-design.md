# Game Project Status Teaser & Skills Grouping — Design

**Status:** Approved by user. Ready for implementation planning.

## Goal

Two homepage improvements, both touching `index.html` in both the CLI (`.cli-only`) and Future (`.future-only`/`.fx-*`) theme variants:

1. A live Trello-derived "status" teaser under the Unity Game Project entry in the Projects section, showing what's currently being worked on, extensible to future projects with minimal config.
2. Regroup the existing flat skills list (About section) into three labeled categories, to read more "hireable" and scannable.

Both must preserve the existing CLI/Future visual language exactly (terminal-style for CLI, holo/sci-fi card style for Future) — no new third style.

## Part 1: Live Project Status Teaser

### Scope

Only the **Unity Game Project** entry gets a teaser right now. The mechanism must be extensible: adding a second live-tracked project later should require only (a) one entry in a shared board config, and (b) a `data-trello-label` attribute + empty teaser container on that project's markup in both themes — no other code changes.

### Data source

Same public Trello board JSON export already used by `status.html`/`status.js`:
`https://trello.com/b/{shortLink}.json?lists=open&cards=open&fields=name&list_fields=name,pos&card_fields=name,idList,pos`

### File changes

**New: `trello-boards.js`** (shared by `status.html` and `index.html`)
Extracted verbatim from the current `status.js`:
- `const BOARDS = [{ label: 'Game Dev', shortLink: '90XXxsX8' }];`
- `function trelloUrl(shortLink)`
- `async function fetchBoard(shortLink)` — returns `groupCardsByList(data.lists, data.cards)`
- `function groupCardsByList(lists, cards)`

**Modified: `status.js`**
- Remove `BOARDS`, `trelloUrl`, `fetchBoard`, `groupCardsByList` (now in `trello-boards.js`).
- `status.html` loads `trello-boards.js` before `status.js`.
- `initStatusPage()` reads `new URLSearchParams(location.search).get('board')`, slugifies each `BOARDS[i].label` (lowercase, spaces→hyphens) and sets `activeIndex` to the first match; falls back to `0` if no param or no match. This lets a homepage teaser deep-link to its specific board once more than one exists. With only one board today, this is a no-op in practice but costs nothing to add now and avoids a rework later.
- Behavior, rendering, and all currently-passing tests for `status.js`/`status.html` must be otherwise unchanged.

**New: `project-status.js`** (loaded by `index.html` only)
- On `DOMContentLoaded`, after the boot gate is dismissed (reuse the same `whenGateDismissed` pattern already in `status.js` — duplicated here since there's no module system, exactly as `status.js` and `script.js` already duplicate small helpers independently).
- `document.querySelectorAll('[data-trello-label]')` — for each element, look up the matching `BOARDS` entry by `label`.
- For each matched element: fetch the board via `fetchBoard(shortLink)` (from `trello-boards.js`), pick the "current card":
  1. Find the first list whose `name` case-insensitively contains `doing`, `in progress`, or `working on`.
  2. If found and it has cards, take its first card (lowest `pos`).
  3. Otherwise, take the first card of the first non-empty list (lowest list `pos`, then lowest card `pos`).
  4. If no cards exist anywhere on the board, render nothing for that element.
- Render into the element: a label-style line ("Now working on:") + the card name (`textContent`, never `innerHTML`, consistent with `status.js`'s existing XSS-safe pattern) + a "View full board →" link to `status.html?board=<slugified label>`.
- On fetch failure: leave the element's content empty (no error UI on the public homepage) — matches the user's "hide silently" decision.
- Poll on the same interval as `status.js`: `window.__STATUS_POLL_MS__ || 60000`, re-running the fetch+render step, so the homepage teaser stays live while the tab is open, mirroring `status.html`'s behavior.

**Modified: `index.html`**
- Projects section, inside the `.cli-only` Unity Game Project `<article class="entry">` (currently ending at the `.entry__status` line), add immediately after it:
  ```html
  <div class="project-status" data-trello-label="Game Dev"></div>
  ```
- Inside the `.fx-card` Unity Game Project block (`.fx-card__body`, currently ending at `.fx-card__status`), add immediately after it:
  ```html
  <div class="project-status" data-trello-label="Game Dev"></div>
  ```
- Before `</body>`, after the existing `<script src="script.js"></script>`, add:
  ```html
  <script src="trello-boards.js"></script>
  <script src="project-status.js"></script>
  ```

**Modified: `styles.css`**
Add theme-specific rules for `.project-status` so it reads as a natural extension of the existing entry/card styles, not a bolted-on widget:
- CLI theme: monospace, small, colored with `--amber` (matching `.entry__status`) for the "Now working on:" label and `--white` for the card name; the "View full board" link styled like other CLI nav links (`--green-dim` → `--amber` on hover).
- Future theme: `var(--f-font-body)`, sized/colored like `.fx-card__status` (`--f-cyan`) for the label/card line; the link styled like other future-theme links (`--f-cyan` → `--f-magenta` on hover, matching the existing hover-glow language used elsewhere in Future mode).
- Element is empty (zero visual footprint) until JS populates it, so no layout jump matters when hidden on error — confirmed by giving it no fixed min-height.

### Testing

New smoke tests (Playwright, following the existing `tests/*.smoke.js` convention):
- `project-status-render.smoke.js`: mocks the Trello fetch, confirms the teaser renders the correct current card (from a "Doing" list) under the Game Project entry in both CLI and Future mode, and that the "View full board" link points to `status.html?board=game-dev`.
- `project-status-fallback.smoke.js`: mocks a board with no Doing/In Progress list, confirms it falls back to the first card of the first non-empty list.
- `project-status-error.smoke.js`: mocks a failed fetch, confirms the teaser element stays empty with no visible error text.

Existing `status.js`/`status.html` smoke tests must still pass unmodified except where the `trello-boards.js` extraction changes which file defines a function — test files reference behavior, not file boundaries, so no test changes are expected.

## Part 2: Skills Grouping

### Current state

- CLI (`index.html` ~line 172): single row `STACK=["C#", "PowerShell", "Python", "JavaScript", "XML", "AI tooling & automation"]`.
- Future (`index.html` ~lines 203-209): six `.fx-skill` progress bars in a flat `.fx-skills` column, each with a `data-level` percentage.

### New grouping

Three categories, same six skills, no additions or removals:
- **Languages** — C#, Python, JavaScript
- **Automation & Scripting** — PowerShell, AI tooling & automation
- **Data & Metadata** — XML / ONIX

### File changes

**Modified: `index.html` (CLI About block)**
Replace the single `STACK` config row with three rows, same `.config__row` structure:
```html
<div class="config__row"><span class="config__key">LANGUAGES</span><span class="config__eq">=</span><span class="config__val">["C#", "Python", "JavaScript"]</span></div>
<div class="config__row"><span class="config__key">AUTOMATION</span><span class="config__eq">=</span><span class="config__val">["PowerShell", "AI tooling &amp; automation"]</span></div>
<div class="config__row"><span class="config__key">DATA</span><span class="config__eq">=</span><span class="config__val">["XML / ONIX"]</span></div>
```
(Same `data-level`-free styling already used by other `.config__row` lines — no new CSS needed here.)

**Modified: `index.html` (Future About block)**
Wrap the six `.fx-skill` bars in three labeled groups:
```html
<div class="fx-skills">
  <div class="fx-skills__group">
    <p class="fx-skills__group-label">Languages</p>
    <div class="fx-skill" data-level="90"><span class="fx-skill__label">C#</span><span class="fx-skill__bar"><span class="fx-skill__fill"></span></span></div>
    <div class="fx-skill" data-level="65"><span class="fx-skill__label">Python</span><span class="fx-skill__bar"><span class="fx-skill__fill"></span></span></div>
    <div class="fx-skill" data-level="60"><span class="fx-skill__label">JavaScript</span><span class="fx-skill__bar"><span class="fx-skill__fill"></span></span></div>
  </div>
  <div class="fx-skills__group">
    <p class="fx-skills__group-label">Automation &amp; Scripting</p>
    <div class="fx-skill" data-level="85"><span class="fx-skill__label">PowerShell</span><span class="fx-skill__bar"><span class="fx-skill__fill"></span></span></div>
    <div class="fx-skill" data-level="85"><span class="fx-skill__label">AI tooling &amp; automation</span><span class="fx-skill__bar"><span class="fx-skill__fill"></span></span></div>
  </div>
  <div class="fx-skills__group">
    <p class="fx-skills__group-label">Data &amp; Metadata</p>
    <div class="fx-skill" data-level="80"><span class="fx-skill__label">XML / ONIX</span><span class="fx-skill__bar"><span class="fx-skill__fill"></span></span></div>
  </div>
</div>
```
All `data-level` values and the `is-filled`/animation JS remain identical — this is a pure markup reorganization, not a data change. Confirmed: `script.js`'s `fillSkills(group)` (script.js:379-384) runs `group.querySelectorAll('.fx-skill')` against each `.fx-skills` container, which matches `.fx-skill` elements at any nesting depth — wrapping them in `.fx-skills__group` divs requires no JS change.

**Modified: `styles.css`**
- `.fx-skills__group{ margin-bottom: 20px; }` (last group's margin removed via `:last-child`).
- `.fx-skills__group-label{ font-family: var(--f-font-body); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--f-magenta); margin: 0 0 10px; }` — small category heading consistent with the existing `.fx-card__tag` treatment elsewhere in Future mode.
- No CSS changes needed for the CLI side (existing `.config__row` rules already handle multiple rows).

### Testing

- No existing smoke test covers `.fx-skill`/`data-level` fill behavior (confirmed — none of the 14 current test files reference it), so no existing test needs updating for the fill mechanism itself.
- New smoke test `skills-grouping.smoke.js`: confirms three category labels render in Future mode in the correct order, confirms all six `.fx-skill` bars still reach `is-filled` with the correct `--fill` value inside their groups, and confirms the CLI About block has three `LANGUAGES`/`AUTOMATION`/`DATA` rows instead of one `STACK` row.

## Global Constraints

- No build step, no backend — plain `<script src>` tags only, consistent with the rest of the site.
- Every theme-specific addition must have both a `.cli-only` and a `.future-only`/`fx-*` counterpart — never one without the other.
- All dynamic text (Trello card/list names) rendered via `textContent`, never `innerHTML`, matching the existing XSS-safe pattern in `status.js`.
- Existing skill data (six skills, six `data-level` values) must not change — this is a layout/grouping change only.
- All 14 existing smoke tests must continue to pass; new features get their own new smoke tests following the existing `tests/*.smoke.js` convention (Playwright, `PASS:`/`FAIL:` console output, `process.exit(1)` on failure).
- This work happens directly on `main` (established pattern this session, per explicit user instruction) but is **not pushed to `origin/main` without a fresh explicit confirmation**, consistent with how the previous Trello status page feature was handled.
