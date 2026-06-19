# Inline Project Status (replaces standalone status page) — Design

**Status:** Approved by user. Ready for implementation planning.

**Supersedes:** `docs/superpowers/specs/2026-06-18-trello-status-page-design.md` (standalone `status.html` page) and Part 1 of `docs/superpowers/specs/2026-06-18-game-status-teaser-and-skills-grouping-design.md` (homepage teaser that linked out to that page). Part 2 of the 2026-06-18 teaser/grouping spec (Skills Grouping) is unaffected and still pending implementation separately.

## Goal

Drop the standalone `status.html` page entirely. Instead, render a live mini Trello board directly underneath the Unity Game Project entry on `index.html`, in both the CLI (`.cli-only`) and Future (`.future-only`/`.fx-*`) theme variants. No separate page, no top-level "Status" nav link — the live board lives where the project itself is listed.

## Background / Source of Truth

- Portfolio is a static site (`index.html`, `styles.css`, `script.js`, no build step, no backend), deployed via GitHub Actions to GitHub Pages.
- `status.html`/`status.css`/`status.js` currently exist (built in a prior session) and fetch the user's public Trello board JSON export (`https://trello.com/b/{shortLink}.json?...`, confirmed working with no API key needed) to render a tabbed, multi-column board mirror on its own page.
- This design relocates that board-mirror rendering into a `<div>` embedded in the Projects section of `index.html`, then deletes the standalone page.

## Non-Goals

- No tabs / multi-board switcher — each embedded element is tied to exactly one board via `data-trello-label`. Tabs only made sense for a page meant to browse multiple boards independently of project context.
- No visible error UI — this is a public homepage; fetch failures must fail silently (see Error Handling).
- No card descriptions, checklists, due dates, labels, attachments, or comments — title-only cards, unchanged from the original status page behavior.
- No private/unlisted boards.

## Removed

- `status.html`, `status.css`, `status.js`
- "Status" nav link in `.termbar.cli-only` (`index.html` line 45, `<a href="status.html">~/status</a>`)
- "Status" nav link in `.fx-nav.future-only` (`index.html` line 60, `<a href="status.html">Status</a>`)
- All 5 existing tests: `tests/status-page-board-param.smoke.js`, `tests/status-page-error.smoke.js`, `tests/status-page-live.smoke.js`, `tests/status-page-nav.smoke.js`, `tests/status-page-render.smoke.js`

## Architecture

**New file: `project-status.js`** (loaded by `index.html` only; replaces `status.js`/`trello-boards.js` — no split needed since there's only one consumer now)

Carried over unchanged from `status.js`:
```js
const BOARDS = [{ label: 'Game Dev', shortLink: '90XXxsX8' }];
const POLL_MS = window.__STATUS_POLL_MS__ || 60000;

function trelloUrl(shortLink) { ... }       // same as status.js today
async function fetchBoard(shortLink) { ... } // same as status.js today
function groupCardsByList(lists, cards) { ... } // same as status.js today
function whenGateDismissed(cb) { ... }       // same boot-gate-wait pattern as status.js today
```

New rendering logic, targeted at embedded elements instead of a page-level container:
- On `DOMContentLoaded`, after `whenGateDismissed`, run `document.querySelectorAll('[data-trello-label]')`.
- For each element: look up the matching `BOARDS` entry by `label`. If no match, skip (defensive; shouldn't happen with correct markup).
- For each matched element, fetch its board and render a compact multi-column grid inside that element: one column per open Trello list (list name as header), cards as title-only chips underneath in `pos` order — same grouping/sort logic `status.js` already has (`groupCardsByList`), just rendered into the entry's div instead of a page container.
- Cache the last successfully rendered dataset per `shortLink` in memory (plain JS object), so a failed poll keeps showing the last-good board.
- `setInterval(..., POLL_MS)` re-fetches and re-renders every matched element.

**Markup changes (`index.html`):**
- Remove the two "Status" nav `<a>` tags listed above.
- Inside the `.cli-only` Unity Game Project `<article class="entry">`, immediately after the existing `<p class="entry__status">` line:
  ```html
  <div class="project-status" data-trello-label="Game Dev"></div>
  ```
- Inside the matching `.fx-card__body` for Unity Game Project, immediately after the existing `<p class="fx-card__status">` line:
  ```html
  <div class="project-status" data-trello-label="Game Dev"></div>
  ```
- Before `</body>`, after `<script src="script.js"></script>`, add:
  ```html
  <script src="project-status.js"></script>
  ```
  (No more `status.js`/`trello-boards.js` script tags.)

**Style changes (`styles.css`):**
Port the column/card rules straight out of the deleted `status.css`, renamed to live under `.project-status` and theme-scoped exactly as today:
```css
.project-status{ margin-top: 12px; }
.project-status__columns{
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(180px, 1fr);
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.status-column{ padding: 12px; border-radius: 10px; }
.status-column__title{ font-size: 12px; margin: 0 0 8px; }
.status-card{ font-size: 12px; margin: 0 0 6px; padding: 6px 8px; border-radius: 6px; }
```
(Sizes trimmed slightly from the original page-level version since this now sits inside a smaller card/entry rather than filling a full page section — exact values are an implementation-time judgment call, not load-bearing for this spec.)

```css
:root[data-theme="cli"] .status-column{ border: 1px solid var(--green-faint); background: rgba(10,15,12,0.6); }
:root[data-theme="cli"] .status-column__title{ color: var(--amber); }
:root[data-theme="cli"] .status-card{ color: var(--white); border: 1px solid var(--green-faint); }

:root[data-theme="future"] .status-column{ border: 1px solid rgba(255,255,255,0.12); background: linear-gradient(160deg, rgba(20,18,35,0.9), rgba(10,8,20,0.95)); }
:root[data-theme="future"] .status-column__title{ color: var(--f-white); font-family: var(--f-font-display); }
:root[data-theme="future"] .status-card{ color: var(--f-dim); border: 1px solid rgba(255,255,255,0.1); }
```
No `.status-tab`/`.status-board__updated`/`.status-board__error`/`.status-loading` rules carried over — those supported page-only UI (tabs, "last updated" ticker, visible error text) that this design explicitly drops.

## Error Handling

- If a fetch fails and a cached render already exists for that board: keep showing the cached render, no error text, retry silently on the next poll.
- If a fetch fails and no cached render exists yet (e.g. first load fails): render nothing — the `.project-status` div stays empty. No loading spinner, no error message, ever, on the public homepage.
- This differs from the old `status.html` behavior (which showed a visible "Couldn't load board right now" message) — explicit decision: a personal-site visitor seeing an error string under a project entry reads worse than the teaser just not being there.

## Extensibility

Adding a second live-tracked project later requires only:
1. One entry in `BOARDS` (`{ label: '...', shortLink: '...' }`).
2. One `<div class="project-status" data-trello-label="...">` in each theme's markup for that project.

No other code changes — `project-status.js`'s `querySelectorAll('[data-trello-label]')` loop already handles any number of matched elements.

## Testing

New Playwright smoke tests (following the existing `tests/*.smoke.js` convention — `file://` load, `PASS:`/`FAIL:` console output, `process.exit(1)` on failure):
- `tests/project-status-render.smoke.js`: mocks the Trello fetch with a fixed fixture, confirms the `.project-status` div under the Unity Game Project entry renders the correct columns/cards in `pos` order, in **both** CLI and Future mode (run boot gate via the existing `openFutureMode`/CLI-mode test helpers).
- `tests/project-status-fallback.smoke.js`: mocks a failed fetch (e.g. 500) with no prior successful fetch — confirms the `.project-status` div stays empty, no thrown error, no visible error text anywhere on the page.
- `tests/project-status-cache.smoke.js`: mocks a successful fetch followed by a failed fetch on the next poll tick — confirms the previously-rendered board stays visible after the failure (cache-on-error behavior).

Deleted: `tests/status-page-board-param.smoke.js`, `tests/status-page-error.smoke.js`, `tests/status-page-live.smoke.js`, `tests/status-page-nav.smoke.js`, `tests/status-page-render.smoke.js` (subject no longer exists).

Existing non-status smoke tests must stay green — the only change to `index.html` outside the Projects section is removing the two "Status" nav `<a>` tags, which no other test asserts against.

## Global Constraints

- No build step, no backend — plain `<script src>` tags only.
- Every theme-specific addition has both a `.cli-only` and `.future-only`/`fx-*` counterpart.
- All dynamic text (Trello card/list names) rendered via `textContent`, never `innerHTML` — same XSS-safe pattern as the original `status.js`.
- This work happens directly on `main` (established pattern this session, per explicit user instruction) but is **not pushed to `origin/main`** without a fresh explicit confirmation.
