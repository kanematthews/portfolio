# Trello Status Page — Design

## Goal

Add a new page to the portfolio site where visitors can see what the user is currently working on, mirrored live from the user's public Trello board(s) — starting with the "Sondrivir" Unity game dev board, with room to add more project boards later without code changes beyond a one-line config entry.

## Background / Source of Truth

- Portfolio is a static site (`index.html`, `styles.css`, `script.js`, no build step, no backend), deployed via GitHub Actions to GitHub Pages at `https://kanematthews.github.io/portfolio/`.
- The site has an existing dual-theme system (`data-theme="future"` / `"cli"`, toggled via `.theme-toggle` buttons in two parallel headers: `.termbar.cli-only` and `.fx-nav.future-only`) gated behind a boot sequence (`body.gate-active`, `#bootGate`, `#bootInput` accepting typed `cli`/`future` + Enter) that hides both headers until a theme is chosen. This page reuses that system as-is.
- Confirmed live against the user's real board: `https://trello.com/b/90XXxsX8/sondrivirdev.json` returns `200` with `Access-Control-Allow-Origin: *`, and accepts filtering query params (`?lists=open&cards=open&fields=name&list_fields=name,pos&card_fields=name,idList,pos`) that shrink the payload to ~4KB. **No API key or token is required** — this is Trello's public board JSON export, available to any board with Visibility set to Public in Trello's settings.

## Non-Goals

- No card descriptions, checklists, due dates, labels, attachments, or comments — title-only cards, per explicit decision.
- No private/unlisted boards — only boards the user has explicitly made Public in Trello.
- No true push/websocket updates — "live" means polling while the tab is open (see below), not server-pushed updates.
- No editing/posting back to Trello from the page — read-only mirror.

## Architecture

**New files:**
- `status.html` — new page. Structurally mirrors `index.html`: same boot gate markup/behavior, same two headers (`.termbar.cli-only`, `.fx-nav.future-only`), same background-effects layer stack (`.fx-stars`, `.fx-mesh`, `.fx-nebula`, `.fx-scrim`, `.fx-cursor-glow`, `.fx-planet`, `.fx-rocket`), loaded via `styles.css` + a new `status.css`.
- `status.js` — Trello fetch/poll/render logic. Kept separate from `script.js` so `index.html` doesn't load Trello-specific code it never uses.
- `status.css` — additive stylesheet for the tab bar and board-mirror column grid. Defines layout only (grid/flex, spacing, sizing); inherits color/typography/theme variables from `styles.css` so theme changes made there automatically apply here.

**Nav changes (existing files):**
- `index.html`: add a "Status" nav entry to both `.termbar.cli-only` and `.fx-nav.future-only`, linking to `status.html`.
- `status.html`: both headers get a corresponding "Home" (or equivalent) entry linking back to `index.html`.
- Theme choice is not persisted across pages — each page's boot gate runs independently, consistent with the site's current single-page behavior. No new persistence mechanism (localStorage, query params, etc.) is introduced.

## Data Layer

**Config, top of `status.js`:**
```js
const BOARDS = [
  { label: 'Game Dev', shortLink: '90XXxsX8' }
];
const POLL_MS = 60000;
```
Adding a project later is a one-line addition to `BOARDS`.

**Fetch URL (per board):**
```
https://trello.com/b/{shortLink}.json?lists=open&cards=open&fields=name&list_fields=name,pos&card_fields=name,idList,pos
```

**Flow:**
1. After the boot gate is dismissed, fetch the active tab's board.
2. Sort `lists` and `cards` by `pos` ascending client-side (API does not guarantee array order matches board position order).
3. Group cards by `idList` under their parent list.
4. Render columns: one per list, list name as header, cards as title-only rows/chips underneath in `pos` order. Empty lists render with just a header and no cards (not hidden).
5. Cache the last successfully rendered dataset per board in memory (a plain JS object keyed by `shortLink`), so a failed poll can keep showing the last-good data instead of blanking the page.
6. `setInterval(..., POLL_MS)` re-fetches only the *currently active* tab's board. Switching tabs triggers an immediate fetch if that board hasn't been loaded yet this page session; otherwise it shows the cached render immediately and rejoins the shared poll cycle.
7. A "last updated Xs ago" indicator under the tab bar updates on every successful fetch (computed client-side from a stored timestamp, re-rendered each second — no extra network calls).

## UI / Layout

- **Tab bar**: one tab per `BOARDS` entry, always rendered even with a single board (so adding a second board later requires no markup changes). Active tab determines which board's columns are visible.
- **Board mirror**: one column per open Trello list, cards as title-only chips stacked underneath, in list/card position order.
- **Theme adaptation**: columns/cards use the same visual language already established per-theme elsewhere on the site — glassy/glow panel treatment in `future` mode, monospace/terminal-box treatment in `cli` mode. No new visual language is invented.

## Loading & Error Handling

- **First load**: show a "Loading board…" placeholder in place of columns until the first fetch resolves.
- **Fetch failure** (network error, non-2xx, rate limit, or a board later set back to Private — all indistinguishable to the client, typically surfacing as 401/404): show an inline message, "Couldn't load board right now — retrying…". If a last-good render exists for that board, it remains visible underneath/alongside the message rather than being cleared. No manual retry button — the existing 60s poll cycle already retries automatically.
- **Reduced motion**: no new animation is introduced beyond what `styles.css` already gates behind `prefers-reduced-motion` (background effects, boot gate); no additional handling needed.

## Testing

- New `tests/status-page.smoke.js`, following the existing `tests/smoke-helpers.js` pattern (`file://` load, run boot gate via `openFutureMode`-style helper).
- Mock `window.fetch` (via Playwright route interception or an injected stub) to return a small fixed Trello-shaped JSON fixture and assert:
  - the single configured tab renders,
  - columns render in `pos` order with correct card-to-column grouping,
  - switching tabs (once a second board exists) swaps the visible board,
  - a failed fetch (mocked 500) shows the error message without throwing and without clearing prior good data.
- Existing smoke suite (`tests/*.smoke.js`) must stay green — the only change to `index.html` is the new nav link, which existing tests do not assert against by content.

## Open Items for Implementation

- The exact "Home" label text and nav link styling on `status.html`'s headers should match the existing nav entries' visual treatment exactly (copy the existing markup pattern, don't invent new classes).
- If/when a second board is added to `BOARDS`, no design change is needed — purely a config + content addition.
