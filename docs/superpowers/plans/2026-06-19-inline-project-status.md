# Inline Project Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the standalone `status.html` Trello-mirror page and replace it with a live mini Trello board embedded directly under the Unity Game Project entry on `index.html`, in both the CLI and Future themes.

**Architecture:** A single new file, `project-status.js`, owns the Trello fetch/cache/render logic (carried over from the deleted `status.js`) and targets any element matching `[data-trello-label]` — currently the two new `.project-status` divs added under the Unity Game Project entry in each theme. No tabs, no separate page, no visible error UI; failures fall back silently to the last cached render.

**Tech Stack:** Plain JS (`<script src>`, no bundler), Playwright for smoke tests (`tests/*.smoke.js`, run individually via `node tests/<file>.smoke.js`).

## Global Constraints

- No build step, no backend — plain `<script src>` tags only.
- Every theme-specific addition has both a `.cli-only` and `.future-only`/`fx-*` counterpart — never one without the other.
- All dynamic text (Trello card/list names) rendered via `textContent`, never `innerHTML`.
- This work happens directly on `main`, but is **not pushed to `origin/main`** without a fresh explicit confirmation from the user — no task in this plan pushes.
- No visible error UI on the public homepage under any failure condition.

---

## Task 1: Remove the standalone Trello status page

**Files:**
- Delete: `status.html`
- Delete: `status.css`
- Delete: `status.js`
- Delete: `tests/status-page-board-param.smoke.js`
- Delete: `tests/status-page-error.smoke.js`
- Delete: `tests/status-page-live.smoke.js`
- Delete: `tests/status-page-nav.smoke.js`
- Delete: `tests/status-page-render.smoke.js`
- Modify: `index.html:45`, `index.html:60`

**Interfaces:** None — this task only removes code, nothing later depends on it.

- [ ] **Step 1: Delete the status page files and its tests**

```bash
cd ~/Desktop/Portfolio
rm status.html status.css status.js
rm tests/status-page-board-param.smoke.js tests/status-page-error.smoke.js tests/status-page-live.smoke.js tests/status-page-nav.smoke.js tests/status-page-render.smoke.js
```

- [ ] **Step 2: Remove the "Status" nav link from the CLI header**

In `index.html`, the CLI header nav currently reads (around line 40-50):

```html
<nav class="termbar__nav">
    <a href="#about">~/about</a>
    <a href="#log">~/log</a>
    <a href="#projects">~/projects</a>
    <a href="#contact">~/contact</a>
    <a href="status.html">~/status</a>
    <button class="theme-toggle" type="button" aria-pressed="false">
```

Remove the `<a href="status.html">~/status</a>` line so it reads:

```html
<nav class="termbar__nav">
    <a href="#about">~/about</a>
    <a href="#log">~/log</a>
    <a href="#projects">~/projects</a>
    <a href="#contact">~/contact</a>
    <button class="theme-toggle" type="button" aria-pressed="false">
```

- [ ] **Step 3: Remove the "Status" nav link from the Future header**

In `index.html`, the Future header nav currently reads (around line 55-65):

```html
<nav class="fx-nav__links">
    <a href="#about">About</a>
    <a href="#log">Timeline</a>
    <a href="#projects">Projects</a>
    <a href="#contact">Channel</a>
    <a href="status.html">Status</a>
    <button class="theme-toggle" type="button" aria-pressed="false">
```

Remove the `<a href="status.html">Status</a>` line so it reads:

```html
<nav class="fx-nav__links">
    <a href="#about">About</a>
    <a href="#log">Timeline</a>
    <a href="#projects">Projects</a>
    <a href="#contact">Channel</a>
    <button class="theme-toggle" type="button" aria-pressed="false">
```

- [ ] **Step 4: Verify no remaining references to the deleted page**

Run: `grep -rn "status.html" index.html styles.css script.js`
Expected: no output (empty result, exit code 1 from grep finding nothing)

- [ ] **Step 5: Verify an unrelated existing smoke test still passes**

Run: `node tests/about-reveal.smoke.js`
Expected: a line starting with `PASS:`

- [ ] **Step 6: Commit**

```bash
git add -A status.html status.css status.js tests/status-page-board-param.smoke.js tests/status-page-error.smoke.js tests/status-page-live.smoke.js tests/status-page-nav.smoke.js tests/status-page-render.smoke.js index.html
git commit -m "$(cat <<'EOF'
remove standalone Trello status page

Replaced by a live status teaser embedded directly under the Unity
Game Project entry on the homepage (see following commits).
EOF
)"
```

---

## Task 2: Add a CLI-mode boot helper for tests

**Files:**
- Modify: `tests/smoke-helpers.js`

**Interfaces:**
- Produces: `openCliMode(page, url = 'file:///C:/Users/cool_/Desktop/Portfolio/index.html')` — async function, dismisses the boot gate into CLI theme. Used by Task 3's `project-status-render.smoke.js`.

- [ ] **Step 1: Add the `openCliMode` helper**

`tests/smoke-helpers.js` currently reads:

```js
async function openFutureMode(page, url = 'file:///C:/Users/cool_/Desktop/Portfolio/index.html') {
  await page.goto(url);
  await page.waitForTimeout(1700);
  await page.fill('#bootInput', 'future');
  await page.press('#bootInput', 'Enter');
  await page.waitForTimeout(1200);
}

module.exports = { openFutureMode };
```

Change it to:

```js
async function openFutureMode(page, url = 'file:///C:/Users/cool_/Desktop/Portfolio/index.html') {
  await page.goto(url);
  await page.waitForTimeout(1700);
  await page.fill('#bootInput', 'future');
  await page.press('#bootInput', 'Enter');
  await page.waitForTimeout(1200);
}

async function openCliMode(page, url = 'file:///C:/Users/cool_/Desktop/Portfolio/index.html') {
  await page.goto(url);
  await page.waitForTimeout(1700);
  await page.fill('#bootInput', 'cli');
  await page.press('#bootInput', 'Enter');
  await page.waitForTimeout(1200);
}

module.exports = { openFutureMode, openCliMode };
```

- [ ] **Step 2: Verify the helper dismisses the gate into CLI theme**

Run:

```bash
node -e "
const { chromium } = require('playwright');
const { openCliMode } = require('./tests/smoke-helpers');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await openCliMode(page, 'file:///C:/Users/cool_/Desktop/Portfolio/index.html');
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  console.log(theme === 'cli' ? 'PASS: cli mode active' : 'FAIL: theme is ' + theme);
  await browser.close();
})();
"
```

Expected: `PASS: cli mode active`

- [ ] **Step 3: Commit**

```bash
git add tests/smoke-helpers.js
git commit -m "test: add openCliMode boot-gate helper for smoke tests"
```

---

## Task 3: Implement the live status render and wire it into the homepage

**Files:**
- Create: `project-status.js`
- Modify: `index.html:336-341` (CLI Unity Game Project entry)
- Modify: `index.html:381-390` (Future Unity Game Project `fx-card`)
- Modify: `index.html` (script tag before `</body>`)
- Modify: `styles.css:368` (after `.entry__status`)
- Modify: `styles.css:613` (after `.fx-card__status`)
- Test: `tests/project-status-render.smoke.js`

**Interfaces:**
- Consumes: `openCliMode`, `openFutureMode` from `tests/smoke-helpers.js` (Task 2).
- Produces (in `project-status.js`, used by Task 4):
  - `BOARDS` — array of `{ label, shortLink }`.
  - `boardCache` — plain object, keyed by `shortLink`, holds the last successfully grouped `lists` array for that board.
  - `groupCardsByList(lists, cards)` — returns grouped/sorted lists.
  - `trelloUrl(shortLink)` — returns the fetch URL string.
  - `async fetchBoard(shortLink)` — returns grouped lists or throws.
  - `renderColumns(container, lists)` — renders `.status-column`/`.status-column__title`/`.status-card` into `container`.
  - `ensureColumnsContainer(el)` — returns (creating if absent) the `.project-status__columns` child of `el`.
  - `collectStatusElements()` — returns `[{ el, board }]` for every `[data-trello-label]` element with a matching `BOARDS` entry.
  - `async renderProjectStatusElement(el, board)` — fetches and renders one element (happy path only in this task; Task 4 adds error handling).
  - `renderAllProjectStatuses(items)` — runs `renderProjectStatusElement` over every item, returns the combined promise.
  - `startPolling(items)` — `setInterval`s `renderAllProjectStatuses(items)` at `POLL_MS`.
  - `initProjectStatus()` — wires the above together on `DOMContentLoaded` after the boot gate is dismissed.

- [ ] **Step 1: Write the failing render test**

Create `tests/project-status-render.smoke.js`:

```js
const { chromium } = require('playwright');
const { openFutureMode, openCliMode } = require('./smoke-helpers');

const FIXTURE = {
  lists: [{ id: 'l2', name: 'Doing', pos: 2 }, { id: 'l1', name: 'To Do', pos: 1 }],
  cards: [
    { id: 'c2', name: 'Card B', idList: 'l1', pos: 2 },
    { id: 'c1', name: 'Card A', idList: 'l1', pos: 1 },
    { id: 'c3', name: 'Card C', idList: 'l2', pos: 1 }
  ]
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.route('https://trello.com/b/90XXxsX8.json**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE) });
  });

  await openCliMode(page);
  await page.waitForSelector('.cli-only .project-status .status-card');
  const cliColumns = await page.locator('.cli-only .project-status .status-column__title').allTextContents();
  if (cliColumns.join(',') !== 'To Do,Doing') {
    console.error('FAIL: expected CLI columns To Do,Doing, got', cliColumns.join(','));
    process.exit(1);
  }
  const cliCards = await page.locator('.cli-only .project-status .status-column:first-child .status-card').allTextContents();
  if (cliCards.join(',') !== 'Card A,Card B') {
    console.error('FAIL: expected CLI first column cards Card A,Card B, got', cliCards.join(','));
    process.exit(1);
  }

  await openFutureMode(page);
  await page.waitForSelector('.future-only .project-status .status-card');
  const fxColumns = await page.locator('.future-only .project-status .status-column__title').allTextContents();
  if (fxColumns.join(',') !== 'To Do,Doing') {
    console.error('FAIL: expected Future columns To Do,Doing, got', fxColumns.join(','));
    process.exit(1);
  }
  const fxCards = await page.locator('.future-only .project-status .status-column:first-child .status-card').allTextContents();
  if (fxCards.join(',') !== 'Card A,Card B') {
    console.error('FAIL: expected Future first column cards Card A,Card B, got', fxCards.join(','));
    process.exit(1);
  }

  console.log('PASS: project-status renders correct columns/cards under the Unity Game Project entry in both CLI and Future mode');
  await browser.close();
})();
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/project-status-render.smoke.js`
Expected: a timeout error from `page.waitForSelector('.cli-only .project-status .status-card')` (the element doesn't exist yet)

- [ ] **Step 3: Create `project-status.js`**

```js
const BOARDS = [
  { label: 'Game Dev', shortLink: '90XXxsX8' }
];
const POLL_MS = window.__STATUS_POLL_MS__ || 60000;

const boardCache = {};

function groupCardsByList(lists, cards) {
  const sortedLists = [...lists].sort((a, b) => a.pos - b.pos);
  return sortedLists.map(list => ({
    id: list.id,
    name: list.name,
    cards: cards
      .filter(c => c.idList === list.id)
      .sort((a, b) => a.pos - b.pos)
  }));
}

function trelloUrl(shortLink) {
  return `https://trello.com/b/${shortLink}.json?lists=open&cards=open&fields=name&list_fields=name,pos&card_fields=name,idList,pos`;
}

async function fetchBoard(shortLink) {
  const res = await fetch(trelloUrl(shortLink));
  if (!res.ok) throw new Error('Trello fetch failed: ' + res.status);
  const data = await res.json();
  return groupCardsByList(data.lists, data.cards);
}

function renderColumns(container, lists) {
  container.innerHTML = '';
  lists.forEach(list => {
    const col = document.createElement('div');
    col.className = 'status-column';
    const header = document.createElement('h3');
    header.className = 'status-column__title';
    header.textContent = list.name;
    col.appendChild(header);
    list.cards.forEach(card => {
      const chip = document.createElement('p');
      chip.className = 'status-card';
      chip.textContent = card.name;
      col.appendChild(chip);
    });
    container.appendChild(col);
  });
}

function ensureColumnsContainer(el) {
  let container = el.querySelector('.project-status__columns');
  if (!container) {
    container = document.createElement('div');
    container.className = 'project-status__columns';
    el.appendChild(container);
  }
  return container;
}

async function renderProjectStatusElement(el, board) {
  const columnsContainer = ensureColumnsContainer(el);
  const lists = await fetchBoard(board.shortLink);
  boardCache[board.shortLink] = lists;
  renderColumns(columnsContainer, lists);
}

function collectStatusElements() {
  return Array.from(document.querySelectorAll('[data-trello-label]'))
    .map(el => {
      const board = BOARDS.find(b => b.label === el.dataset.trelloLabel);
      return board ? { el, board } : null;
    })
    .filter(Boolean);
}

function renderAllProjectStatuses(items) {
  return Promise.all(items.map(({ el, board }) => renderProjectStatusElement(el, board)));
}

function startPolling(items) {
  setInterval(() => { renderAllProjectStatuses(items); }, POLL_MS);
}

function whenGateDismissed(cb) {
  if (!document.body.classList.contains('gate-active')) { cb(); return; }
  const obs = new MutationObserver(() => {
    if (!document.body.classList.contains('gate-active')) {
      obs.disconnect();
      cb();
    }
  });
  obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

function initProjectStatus() {
  const items = collectStatusElements();
  if (items.length === 0) return;
  renderAllProjectStatuses(items);
  startPolling(items);
}

document.addEventListener('DOMContentLoaded', () => {
  whenGateDismissed(initProjectStatus);
});
```

- [ ] **Step 4: Add the embedded status div to the CLI Unity Game Project entry**

In `index.html`, the CLI entry currently reads (around line 336-341):

```html
          <article class="entry">
            <p class="entry__row"><span class="entry__perm">drwxr-xr-x</span><span class="entry__name scramble" data-text="unity-game-project/">unity-game-project/</span></p>
            <p class="entry__desc">Large-scale solo Unity/C# project — interconnected NPC dialogue, inventory &amp; equipment, character progression, UI, and data persistence systems.</p>
            <ul class="entry__tags"><li>Unity</li><li>C#</li><li>Architecture</li></ul>
            <p class="entry__status"># status: ongoing — 2023–present</p>
          </article>
```

Change it to:

```html
          <article class="entry">
            <p class="entry__row"><span class="entry__perm">drwxr-xr-x</span><span class="entry__name scramble" data-text="unity-game-project/">unity-game-project/</span></p>
            <p class="entry__desc">Large-scale solo Unity/C# project — interconnected NPC dialogue, inventory &amp; equipment, character progression, UI, and data persistence systems.</p>
            <ul class="entry__tags"><li>Unity</li><li>C#</li><li>Architecture</li></ul>
            <p class="entry__status"># status: ongoing — 2023–present</p>
            <div class="project-status" data-trello-label="Game Dev"></div>
          </article>
```

- [ ] **Step 5: Add the embedded status div to the Future Unity Game Project card**

In `index.html`, the matching `fx-card` currently reads (around line 381-390):

```html
        <article class="fx-card">
          <span class="fx-card__glow" aria-hidden="true"></span>
          <div class="fx-card__body">
            <p class="fx-card__tag">Personal project</p>
            <h3 class="fx-card__title">Unity Game Project</h3>
            <p class="fx-card__desc">Solo Unity/C# project — NPC dialogue, inventory, character progression, UI, and data persistence.</p>
            <ul class="fx-card__pills"><li>Unity</li><li>C#</li><li>Architecture</li></ul>
            <p class="fx-card__status">Ongoing — 2023–present</p>
          </div>
        </article>
```

Change it to:

```html
        <article class="fx-card">
          <span class="fx-card__glow" aria-hidden="true"></span>
          <div class="fx-card__body">
            <p class="fx-card__tag">Personal project</p>
            <h3 class="fx-card__title">Unity Game Project</h3>
            <p class="fx-card__desc">Solo Unity/C# project — NPC dialogue, inventory, character progression, UI, and data persistence.</p>
            <ul class="fx-card__pills"><li>Unity</li><li>C#</li><li>Architecture</li></ul>
            <p class="fx-card__status">Ongoing — 2023–present</p>
            <div class="project-status" data-trello-label="Game Dev"></div>
          </div>
        </article>
```

- [ ] **Step 6: Load `project-status.js`**

In `index.html`, just before `</body>`:

```html
<script src="script.js"></script>
</body>
```

Change to:

```html
<script src="script.js"></script>
<script src="project-status.js"></script>
</body>
```

- [ ] **Step 7: Add CSS for the embedded status block**

In `styles.css`, immediately after `.entry__status{ margin: 0; font-size: 12px; color: var(--amber); opacity: 0.85; }` (around line 368), add:

```css

/* ---------- project status (live trello mini-board) ---------- */
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

:root[data-theme="cli"] .status-column{ border: 1px solid var(--green-faint); background: rgba(10,15,12,0.6); }
:root[data-theme="cli"] .status-column__title{ color: var(--amber); }
:root[data-theme="cli"] .status-card{ color: var(--white); border: 1px solid var(--green-faint); }
```

In `styles.css`, immediately after `.fx-card__status{ font-family: var(--f-font-body); font-size: 11px; color: var(--f-cyan); margin: 0; }` (around line 613), add:

```css

:root[data-theme="future"] .status-column{ border: 1px solid rgba(255,255,255,0.12); background: linear-gradient(160deg, rgba(20,18,35,0.9), rgba(10,8,20,0.95)); }
:root[data-theme="future"] .status-column__title{ color: var(--f-white); font-family: var(--f-font-display); }
:root[data-theme="future"] .status-card{ color: var(--f-dim); border: 1px solid rgba(255,255,255,0.1); }
```

- [ ] **Step 8: Run the render test to verify it passes**

Run: `node tests/project-status-render.smoke.js`
Expected: `PASS: project-status renders correct columns/cards under the Unity Game Project entry in both CLI and Future mode`

- [ ] **Step 9: Commit**

```bash
git add project-status.js index.html styles.css tests/project-status-render.smoke.js
git commit -m "feat: embed live Trello status under the Unity Game Project entry"
```

---

## Task 4: Add resilient caching and silent failure handling

**Files:**
- Modify: `project-status.js` (`renderProjectStatusElement`)
- Test: `tests/project-status-fallback.smoke.js`
- Test: `tests/project-status-cache.smoke.js`

**Interfaces:**
- Consumes: `boardCache`, `ensureColumnsContainer`, `fetchBoard`, `renderColumns` (Task 3).
- Produces: `renderProjectStatusElement` becomes failure-tolerant — same signature, no behavior change on the happy path already covered by Task 3's test.

- [ ] **Step 1: Write the failing fallback test**

Create `tests/project-status-fallback.smoke.js`:

```js
const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.route('https://trello.com/b/90XXxsX8.json**', route => {
    route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
  });

  await openFutureMode(page);
  await page.waitForTimeout(500);

  const cardCount = await page.locator('.project-status .status-card').count();
  if (cardCount !== 0) {
    console.error('FAIL: expected no status cards to render when the first fetch fails, got', cardCount);
    process.exit(1);
  }
  const texts = await page.locator('.project-status').allTextContents();
  if (texts.some(t => t.trim().length > 0)) {
    console.error('FAIL: expected .project-status elements to stay empty on fetch failure, got', JSON.stringify(texts));
    process.exit(1);
  }
  if (pageErrors.length > 0) {
    console.error('FAIL: expected no uncaught page errors, got', JSON.stringify(pageErrors));
    process.exit(1);
  }

  console.log('PASS: project-status stays empty with no thrown errors when the first Trello fetch fails');
  await browser.close();
})();
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/project-status-fallback.smoke.js`
Expected: `FAIL: expected no uncaught page errors, got [...]` (the unhandled rejection from `fetchBoard` throwing inside `renderProjectStatusElement`)

- [ ] **Step 3: Add try/catch and cache fallback**

In `project-status.js`, change:

```js
async function renderProjectStatusElement(el, board) {
  const columnsContainer = ensureColumnsContainer(el);
  const lists = await fetchBoard(board.shortLink);
  boardCache[board.shortLink] = lists;
  renderColumns(columnsContainer, lists);
}
```

to:

```js
async function renderProjectStatusElement(el, board) {
  const columnsContainer = ensureColumnsContainer(el);
  try {
    const lists = await fetchBoard(board.shortLink);
    boardCache[board.shortLink] = lists;
    renderColumns(columnsContainer, lists);
  } catch (err) {
    if (boardCache[board.shortLink]) {
      renderColumns(columnsContainer, boardCache[board.shortLink]);
    }
  }
}
```

- [ ] **Step 4: Run the fallback test to verify it passes**

Run: `node tests/project-status-fallback.smoke.js`
Expected: `PASS: project-status stays empty with no thrown errors when the first Trello fetch fails`

- [ ] **Step 5: Run the Task 3 render test to confirm no regression**

Run: `node tests/project-status-render.smoke.js`
Expected: `PASS: project-status renders correct columns/cards under the Unity Game Project entry in both CLI and Future mode`

- [ ] **Step 6: Write the cache test**

Create `tests/project-status-cache.smoke.js`:

```js
const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

const FIXTURE = {
  lists: [{ id: 'l1', name: 'To Do', pos: 1 }],
  cards: [{ id: 'c1', name: 'Build the thing', idList: 'l1', pos: 1 }]
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  let callCount = 0;
  await page.route('https://trello.com/b/90XXxsX8.json**', route => {
    callCount++;
    if (callCount === 1) {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE) });
    } else {
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    }
  });
  await page.addInitScript(() => { window.__STATUS_POLL_MS__ = 1500; });

  await openFutureMode(page);
  await page.waitForSelector('.future-only .project-status .status-card');
  const firstCards = await page.locator('.future-only .project-status .status-card').allTextContents();
  if (firstCards.join(',') !== 'Build the thing') {
    console.error('FAIL: expected initial fetch to render "Build the thing", got', firstCards.join(','));
    process.exit(1);
  }

  await page.waitForTimeout(1800);
  if (callCount < 2) {
    console.error('FAIL: expected at least 2 fetches (initial + failed poll), got', callCount);
    process.exit(1);
  }
  const cardsAfterFailedPoll = await page.locator('.future-only .project-status .status-card').allTextContents();
  if (cardsAfterFailedPoll.join(',') !== 'Build the thing') {
    console.error('FAIL: expected cached board to remain visible after a failed poll, got', cardsAfterFailedPoll.join(','));
    process.exit(1);
  }

  console.log('PASS: project-status keeps showing the last successfully fetched board after a poll fails');
  await browser.close();
})();
```

- [ ] **Step 7: Run it to verify it passes**

Run: `node tests/project-status-cache.smoke.js`
Expected: `PASS: project-status keeps showing the last successfully fetched board after a poll fails`

- [ ] **Step 8: Commit**

```bash
git add project-status.js tests/project-status-fallback.smoke.js tests/project-status-cache.smoke.js
git commit -m "feat: keep last good board visible on fetch failure, no visible errors"
```
