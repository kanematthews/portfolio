# Game Project Status Teaser & Skills Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live Trello-derived "status" teaser under the Unity Game Project entry on the homepage (both CLI and Future themes), extensible to future projects via shared config, and regroup the existing flat skills list into three labeled categories in both themes.

**Architecture:** Extract the Trello board config/fetch logic already in `status.js` into a new shared `trello-boards.js` file loaded by both `status.html` and `index.html`. A new `project-status.js` (loaded only by `index.html`) finds elements marked `[data-trello-label]`, fetches the matching board, and renders the current in-progress card with a link back to `status.html`. Skills regrouping is a pure markup/CSS change with no JS changes (confirmed: `script.js`'s `fillSkills` already searches at any nesting depth).

**Tech Stack:** Plain JS (no modules/build step), Playwright smoke tests (`tests/*.smoke.js`), existing CSS custom properties from `styles.css`.

## Global Constraints

- No build step, no backend — plain `<script src>` tags only.
- Every theme-specific addition must have both a `.cli-only` and a `.future-only`/`fx-*` counterpart — never one without the other.
- All dynamic text (Trello card/list names) rendered via `textContent`, never `innerHTML` with interpolated content — matches the existing XSS-safe pattern in `status.js`.
- Existing skill data (six skills, six `data-level` values) must not change — layout/grouping only.
- All 14 existing smoke tests must continue to pass unmodified. New features get new smoke tests following the existing convention: `node tests/<name>.smoke.js`, prints `PASS: ...` and exits 0, or `console.error('FAIL: ...')` + `process.exit(1)`.
- This work happens directly on `main` (established pattern this session). Do **not** push to `origin/main` without a fresh explicit user confirmation.
- Spec: `docs/superpowers/specs/2026-06-18-game-status-teaser-and-skills-grouping-design.md`.

---

### Task 1: Extract shared Trello board config into `trello-boards.js`; add query-param board preselection to `status.js`

**Files:**
- Create: `trello-boards.js`
- Modify: `status.js` (full file, currently 146 lines — see below for exact removals/additions)
- Modify: `status.html:10-11` (add new script tag) and `status.html:98-99` (script load order)
- Test: `tests/status-page-board-param.smoke.js` (create)

**Interfaces:**
- Produces (from `trello-boards.js`, global scope, consumed by `status.js` and later by `project-status.js` in Task 2): `const BOARDS = [{ label: 'Game Dev', shortLink: '90XXxsX8' }];`, `function slugify(label)` → lowercase, spaces replaced with `-`, `function trelloUrl(shortLink)`, `async function fetchBoard(shortLink)` → `Promise<Array<{id, name, cards}>>`, `function groupCardsByList(lists, cards)`.
- Produces (from `status.js`, consumed by its own test): `function boardIndexFromQuery(boards, search)` → returns a zero-based index into `boards`.

- [ ] **Step 1: Write the failing test for `boardIndexFromQuery`**

Create `tests/status-page-board-param.smoke.js`:

```js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///C:/Users/cool_/Desktop/Portfolio/status.html');

  const results = await page.evaluate(() => {
    const boards = [{ label: 'Game Dev' }, { label: 'Other Project' }];
    return {
      none: boardIndexFromQuery(boards, ''),
      match: boardIndexFromQuery(boards, '?board=other-project'),
      noMatch: boardIndexFromQuery(boards, '?board=nonexistent')
    };
  });

  if (results.none !== 0) {
    console.error('FAIL: expected no query param to resolve to index 0, got', results.none);
    process.exit(1);
  }
  if (results.match !== 1) {
    console.error('FAIL: expected ?board=other-project to resolve to index 1, got', results.match);
    process.exit(1);
  }
  if (results.noMatch !== 0) {
    console.error('FAIL: expected an unmatched board slug to fall back to index 0, got', results.noMatch);
    process.exit(1);
  }

  console.log('PASS: boardIndexFromQuery resolves the active board from the URL, with fallback to 0');
  await browser.close();
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/status-page-board-param.smoke.js`
Expected: FAIL — `ReferenceError: boardIndexFromQuery is not defined` (or similar), since the function does not exist yet.

- [ ] **Step 3: Create `trello-boards.js` with the extracted shared logic**

Create `trello-boards.js`:

```js
const BOARDS = [
  { label: 'Game Dev', shortLink: '90XXxsX8' }
];

function slugify(label) {
  return label.toLowerCase().replace(/\s+/g, '-');
}

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
```

- [ ] **Step 4: Rewrite `status.js`, removing the extracted pieces and adding `boardIndexFromQuery`**

Replace the full contents of `status.js` with:

```js
const POLL_MS = window.__STATUS_POLL_MS__ || 60000;

let activeIndex = 0;
const boardCache = {};

function boardIndexFromQuery(boards, search) {
  const param = new URLSearchParams(search).get('board');
  if (!param) return 0;
  const idx = boards.findIndex(b => slugify(b.label) === param);
  return idx === -1 ? 0 : idx;
}

function renderTabs(container, boards, activeIdx, onSelect) {
  container.innerHTML = '';
  boards.forEach((board, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'status-tab' + (i === activeIdx ? ' is-active' : '');
    btn.textContent = board.label;
    btn.addEventListener('click', () => onSelect(i));
    container.appendChild(btn);
  });
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

function showError(message) {
  const el = document.getElementById('statusError');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

function hideError() {
  const el = document.getElementById('statusError');
  if (!el) return;
  el.hidden = true;
}

function renderLastUpdatedText() {
  const el = document.getElementById('statusUpdated');
  if (!el || !el.dataset.ts) return;
  const secs = Math.max(0, Math.round((Date.now() - Number(el.dataset.ts)) / 1000));
  el.textContent = `Last updated ${secs}s ago`;
}

function markUpdatedNow() {
  const el = document.getElementById('statusUpdated');
  if (!el) return;
  el.dataset.ts = String(Date.now());
  renderLastUpdatedText();
}

async function renderActiveBoard() {
  const board = BOARDS[activeIndex];
  const columnsEl = document.getElementById('statusColumns');
  if (!boardCache[board.shortLink] && columnsEl) {
    columnsEl.innerHTML = '<p class="status-loading">Loading board…</p>';
  }
  try {
    const lists = await fetchBoard(board.shortLink);
    boardCache[board.shortLink] = lists;
    if (columnsEl) renderColumns(columnsEl, lists);
    markUpdatedNow();
    hideError();
  } catch (err) {
    if (boardCache[board.shortLink] && columnsEl) {
      renderColumns(columnsEl, boardCache[board.shortLink]);
    } else if (columnsEl) {
      columnsEl.innerHTML = '';
    }
    showError("Couldn't load board right now — retrying…");
  }
}

function selectBoard(index) {
  if (index === activeIndex) return;
  activeIndex = index;
  const tabsEl = document.getElementById('statusTabs');
  if (tabsEl) renderTabs(tabsEl, BOARDS, activeIndex, selectBoard);
  renderActiveBoard();
}

function startPolling() {
  setInterval(() => { renderActiveBoard(); }, POLL_MS);
  setInterval(renderLastUpdatedText, 1000);
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

function initStatusPage() {
  const tabsEl = document.getElementById('statusTabs');
  if (!tabsEl) return;
  activeIndex = boardIndexFromQuery(BOARDS, window.location.search);
  renderTabs(tabsEl, BOARDS, activeIndex, selectBoard);
  renderActiveBoard();
  startPolling();
}

document.addEventListener('DOMContentLoaded', () => {
  whenGateDismissed(initStatusPage);
});
```

- [ ] **Step 5: Load `trello-boards.js` before `status.js` in `status.html`**

In `status.html`, find the script tags near the end of the file (lines 98-99):
```html
<script src="script.js"></script>
<script src="status.js"></script>
```
Replace with:
```html
<script src="script.js"></script>
<script src="trello-boards.js"></script>
<script src="status.js"></script>
```

- [ ] **Step 6: Run the new test to verify it passes**

Run: `node tests/status-page-board-param.smoke.js`
Expected: `PASS: boardIndexFromQuery resolves the active board from the URL, with fallback to 0`

- [ ] **Step 7: Run the full existing smoke suite to confirm no regressions**

Run each of (these must all still print `PASS:` and exit 0 — unchanged from before this task):
```bash
node tests/status-page-nav.smoke.js
node tests/status-page-render.smoke.js
node tests/status-page-live.smoke.js
node tests/status-page-error.smoke.js
```
Expected: all four `PASS:` lines, no `FAIL:`.

- [ ] **Step 8: Commit**

```bash
git add trello-boards.js status.js status.html tests/status-page-board-param.smoke.js
git commit -m "refactor: extract trello-boards.js shared config, add board query param to status.js"
```

---

### Task 2: Build the homepage project status teaser (`project-status.js`)

**Files:**
- Create: `project-status.js`
- Modify: `tests/smoke-helpers.js` (add `openCliMode`)
- Modify: `index.html:337-341` (Unity Game Project `.entry` in CLI block) — add a teaser container
- Modify: `index.html:385-389` (Unity Game Project `.fx-card` in Future block) — add a teaser container
- Modify: `index.html:445` (script tags before `</body>`)
- Modify: `styles.css` (append new `.project-status` rules)
- Test: `tests/project-status-render.smoke.js` (create)
- Test: `tests/project-status-fallback.smoke.js` (create)
- Test: `tests/project-status-error.smoke.js` (create)

**Interfaces:**
- Consumes (from `trello-boards.js`, Task 1, global scope): `BOARDS`, `slugify(label)`, `fetchBoard(shortLink)`.
- Produces: nothing consumed by later tasks (Task 3 is independent).

- [ ] **Step 1: Add `openCliMode` to the shared test helper**

In `tests/smoke-helpers.js`, replace the full file contents with:

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

- [ ] **Step 2: Write the failing render test**

Create `tests/project-status-render.smoke.js`:

```js
const { chromium } = require('playwright');
const { openFutureMode, openCliMode } = require('./smoke-helpers');

const FIXTURE_1 = {
  lists: [
    { id: 'l1', name: 'To Do', pos: 1 },
    { id: 'l2', name: 'Doing', pos: 2 }
  ],
  cards: [
    { id: 'c1', name: 'Write backlog item', idList: 'l1', pos: 1 },
    { id: 'c2', name: 'NPC dialogue system', idList: 'l2', pos: 1 },
    { id: 'c3', name: 'Inventory polish', idList: 'l2', pos: 2 }
  ]
};
const FIXTURE_2 = {
  lists: [
    { id: 'l1', name: 'To Do', pos: 1 },
    { id: 'l2', name: 'Doing', pos: 2 }
  ],
  cards: [
    { id: 'c1', name: 'Write backlog item', idList: 'l1', pos: 1 },
    { id: 'c4', name: 'Save system rewrite', idList: 'l2', pos: 0 },
    { id: 'c2', name: 'NPC dialogue system', idList: 'l2', pos: 1 }
  ]
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  let callCount = 0;
  await page.route('https://trello.com/b/90XXxsX8.json**', route => {
    callCount++;
    const body = callCount === 1 ? FIXTURE_1 : FIXTURE_2;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.addInitScript(() => { window.__STATUS_POLL_MS__ = 1500; });

  await openCliMode(page);
  await page.waitForSelector('.entry .project-status__card');
  const cliCard = await page.locator('.entry .project-status__card').textContent();
  if (cliCard !== 'NPC dialogue system') {
    console.error('FAIL: expected CLI teaser to show "NPC dialogue system", got', cliCard);
    process.exit(1);
  }
  const cliLink = await page.locator('.entry .project-status__link').getAttribute('href');
  if (cliLink !== 'status.html?board=game-dev') {
    console.error('FAIL: expected CLI teaser link to be status.html?board=game-dev, got', cliLink);
    process.exit(1);
  }

  callCount = 0;
  await openFutureMode(page);
  await page.waitForSelector('.fx-card__body .project-status__card');
  const fxCard = await page.locator('.fx-card__body .project-status__card').textContent();
  if (fxCard !== 'NPC dialogue system') {
    console.error('FAIL: expected Future teaser to show "NPC dialogue system", got', fxCard);
    process.exit(1);
  }

  await page.waitForTimeout(1800);
  const fxCardAfterPoll = await page.locator('.fx-card__body .project-status__card').textContent();
  if (fxCardAfterPoll !== 'Save system rewrite') {
    console.error('FAIL: expected teaser to update to "Save system rewrite" after polling, got', fxCardAfterPoll);
    process.exit(1);
  }

  console.log('PASS: project status teaser renders the current Doing card and link in both themes, and updates on poll');
  await browser.close();
})();
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node tests/project-status-render.smoke.js`
Expected: FAIL — `Timeout ... waiting for selector ".entry .project-status__card"` (the element/script don't exist yet).

- [ ] **Step 4: Create `project-status.js`**

Create `project-status.js`:

```js
const PROJECT_STATUS_POLL_MS = window.__STATUS_POLL_MS__ || 60000;

function pickCurrentCard(lists) {
  const doingList = lists.find(l => /doing|in progress|working on/i.test(l.name));
  if (doingList && doingList.cards.length) return doingList.cards[0];
  const firstNonEmpty = lists.find(l => l.cards.length);
  return firstNonEmpty ? firstNonEmpty.cards[0] : null;
}

function renderProjectStatus(el, lists, label) {
  el.innerHTML = '';
  const card = pickCurrentCard(lists);
  if (!card) return;
  const line = document.createElement('p');
  line.className = 'project-status__line';
  const tag = document.createElement('span');
  tag.className = 'project-status__tag';
  tag.textContent = 'Now working on: ';
  const name = document.createElement('span');
  name.className = 'project-status__card';
  name.textContent = card.name;
  line.appendChild(tag);
  line.appendChild(name);
  const link = document.createElement('a');
  link.className = 'project-status__link';
  link.href = `status.html?board=${slugify(label)}`;
  link.textContent = 'View full board →';
  el.appendChild(line);
  el.appendChild(link);
}

async function refreshProjectStatusEl(el) {
  const label = el.dataset.trelloLabel;
  const board = BOARDS.find(b => b.label === label);
  if (!board) return;
  try {
    const lists = await fetchBoard(board.shortLink);
    renderProjectStatus(el, lists, label);
  } catch (err) {
    el.innerHTML = '';
  }
}

function startProjectStatusPolling(els) {
  setInterval(() => { els.forEach(refreshProjectStatusEl); }, PROJECT_STATUS_POLL_MS);
}

function whenProjectStatusGateDismissed(cb) {
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
  const els = Array.from(document.querySelectorAll('[data-trello-label]'));
  if (!els.length) return;
  els.forEach(refreshProjectStatusEl);
  startProjectStatusPolling(els);
}

document.addEventListener('DOMContentLoaded', () => {
  whenProjectStatusGateDismissed(initProjectStatus);
});
```

- [ ] **Step 5: Add the teaser containers in `index.html`**

In `index.html`, in the `.cli-only` Unity Game Project entry, find:
```html
          <article class="entry">
            <p class="entry__row"><span class="entry__perm">drwxr-xr-x</span><span class="entry__name scramble" data-text="unity-game-project/">unity-game-project/</span></p>
            <p class="entry__desc">Large-scale solo Unity/C# project — interconnected NPC dialogue, inventory &amp; equipment, character progression, UI, and data persistence systems.</p>
            <ul class="entry__tags"><li>Unity</li><li>C#</li><li>Architecture</li></ul>
            <p class="entry__status"># status: ongoing — 2023–present</p>
          </article>
```
Replace with:
```html
          <article class="entry">
            <p class="entry__row"><span class="entry__perm">drwxr-xr-x</span><span class="entry__name scramble" data-text="unity-game-project/">unity-game-project/</span></p>
            <p class="entry__desc">Large-scale solo Unity/C# project — interconnected NPC dialogue, inventory &amp; equipment, character progression, UI, and data persistence systems.</p>
            <ul class="entry__tags"><li>Unity</li><li>C#</li><li>Architecture</li></ul>
            <p class="entry__status"># status: ongoing — 2023–present</p>
            <div class="project-status" data-trello-label="Game Dev"></div>
          </article>
```

In the `.fx-card` Unity Game Project block, find:
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
Replace with:
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

Then, near the end of `index.html`, find:
```html
<script src="script.js"></script>
</body>
```
Replace with:
```html
<script src="script.js"></script>
<script src="trello-boards.js"></script>
<script src="project-status.js"></script>
</body>
```

- [ ] **Step 6: Add `.project-status` styles to `styles.css`**

Append to the end of `styles.css`:

```css
.entry .project-status{ margin-top: 10px; }
.entry .project-status__line{ margin: 0 0 4px; font-size: 12px; }
.entry .project-status__tag{ color: var(--amber); }
.entry .project-status__card{ color: var(--white); }
.entry .project-status__link{ font-size: 12px; color: var(--green-dim); text-decoration: none; transition: color 0.15s ease; }
.entry .project-status__link:hover{ color: var(--amber); }

.fx-card__body .project-status{ margin-top: 10px; }
.fx-card__body .project-status__line{ margin: 0 0 4px; font-family: var(--f-font-body); font-size: 11px; }
.fx-card__body .project-status__tag{ color: var(--f-dim); }
.fx-card__body .project-status__card{ color: var(--f-cyan); }
.fx-card__body .project-status__link{ font-family: var(--f-font-body); font-size: 11px; color: var(--f-cyan); text-decoration: none; transition: color 0.15s ease; }
.fx-card__body .project-status__link:hover{ color: var(--f-magenta); }
```

- [ ] **Step 7: Run the render test to verify it passes**

Run: `node tests/project-status-render.smoke.js`
Expected: `PASS: project status teaser renders the current Doing card and link in both themes, and updates on poll`

- [ ] **Step 8: Write the failing fallback test**

Create `tests/project-status-fallback.smoke.js`:

```js
const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

const FIXTURE_NO_DOING_LIST = {
  lists: [
    { id: 'l1', name: 'Backlog', pos: 1 },
    { id: 'l2', name: 'Done', pos: 2 }
  ],
  cards: [
    { id: 'c1', name: 'Plan next milestone', idList: 'l1', pos: 1 },
    { id: 'c2', name: 'Ship character creator', idList: 'l2', pos: 1 }
  ]
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.route('https://trello.com/b/90XXxsX8.json**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE_NO_DOING_LIST) });
  });

  await openFutureMode(page);
  await page.waitForSelector('.fx-card__body .project-status__card');
  const card = await page.locator('.fx-card__body .project-status__card').textContent();
  if (card !== 'Plan next milestone') {
    console.error('FAIL: expected fallback to first card of first non-empty list ("Plan next milestone"), got', card);
    process.exit(1);
  }

  console.log('PASS: project status teaser falls back to the first card of the first list when no Doing/In Progress list exists');
  await browser.close();
})();
```

- [ ] **Step 9: Run the fallback test to verify it passes**

`pickCurrentCard` (Step 4) already implements both branches — the Doing/In Progress match and the fallback to the first card of the first non-empty list — so no new implementation code is needed here; this step is a coverage test locking in the fallback branch's behavior.

Run: `node tests/project-status-fallback.smoke.js`
Expected: `PASS: project status teaser falls back to the first card of the first list when no Doing/In Progress list exists`

- [ ] **Step 10: Write the failing error test**

Create `tests/project-status-error.smoke.js`:

```js
const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.route('https://trello.com/b/90XXxsX8.json**', route => {
    route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
  });

  await openFutureMode(page);
  await page.waitForTimeout(1500);
  const html = await page.locator('.fx-card__body .project-status').innerHTML();
  if (html.trim() !== '') {
    console.error('FAIL: expected the teaser to stay empty when the Trello fetch fails, got', html);
    process.exit(1);
  }

  console.log('PASS: project status teaser stays silently empty when the Trello fetch fails');
  await browser.close();
})();
```

- [ ] **Step 11: Run the error test to verify it passes**

Run: `node tests/project-status-error.smoke.js`
Expected: `PASS: project status teaser stays silently empty when the Trello fetch fails`

- [ ] **Step 12: Run the full smoke suite to confirm no regressions**

Run every file in `tests/*.smoke.js` individually (all 18 by now: the 14 pre-existing, `status-page-board-param.smoke.js` from Task 1, and the 3 new ones from this task). Expected: every file prints `PASS:` and exits 0.

- [ ] **Step 13: Commit**

```bash
git add project-status.js tests/smoke-helpers.js index.html styles.css tests/project-status-render.smoke.js tests/project-status-fallback.smoke.js tests/project-status-error.smoke.js
git commit -m "feat: add live project status teaser under Game Project entry in both themes"
```

---

### Task 3: Regroup the Skills section into three categories (both themes)

**Files:**
- Modify: `index.html:172` (CLI About `STACK` config row)
- Modify: `index.html:203-209` (Future About `.fx-skills` bars)
- Modify: `styles.css` (append `.fx-skills__group` rules)
- Test: `tests/skills-grouping.smoke.js` (create)

**Interfaces:** None — this task is independent of Tasks 1 and 2 and touches no shared functions.

- [ ] **Step 1: Write the failing test**

Create `tests/skills-grouping.smoke.js`:

```js
const { chromium } = require('playwright');
const { openFutureMode, openCliMode } = require('./smoke-helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await openFutureMode(page);
  const groupLabels = await page.locator('.fx-skills__group-label').allTextContents();
  if (groupLabels.join(',') !== 'Languages,Automation & Scripting,Data & Metadata') {
    console.error('FAIL: expected three skill group labels in order, got', groupLabels.join(','));
    process.exit(1);
  }

  await page.locator('#about').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const filledCount = await page.locator('.fx-skill.is-filled').count();
  if (filledCount !== 6) {
    console.error('FAIL: expected all 6 skill bars to gain is-filled after scrolling into view, got', filledCount);
    process.exit(1);
  }
  const csharpFill = await page.locator('.fx-skill', { hasText: 'C#' }).evaluate(el => el.style.getPropertyValue('--fill'));
  if (csharpFill !== '90%') {
    console.error('FAIL: expected C# bar --fill to be 90%, got', csharpFill);
    process.exit(1);
  }

  await openCliMode(page);
  const configKeys = await page.locator('#about .config__row .config__key').allTextContents();
  if (!configKeys.includes('LANGUAGES') || !configKeys.includes('AUTOMATION') || !configKeys.includes('DATA')) {
    console.error('FAIL: expected LANGUAGES, AUTOMATION, and DATA config rows in CLI About block, got', configKeys.join(','));
    process.exit(1);
  }
  if (configKeys.includes('STACK')) {
    console.error('FAIL: expected the old single STACK row to be replaced, but it is still present');
    process.exit(1);
  }

  console.log('PASS: skills are grouped into three categories in both themes, and bar-fill animation still works');
  await browser.close();
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/skills-grouping.smoke.js`
Expected: FAIL — group labels assertion fails (`.fx-skills__group-label` matches nothing, so `groupLabels.join(',')` is `''`).

- [ ] **Step 3: Regroup the CLI `STACK` row**

In `index.html`, find:
```html
          <div class="config__row"><span class="config__key">STACK</span><span class="config__eq">=</span><span class="config__val">["C#", "PowerShell", "Python", "JavaScript", "XML", "AI tooling &amp; automation"]</span></div>
```
Replace with:
```html
          <div class="config__row"><span class="config__key">LANGUAGES</span><span class="config__eq">=</span><span class="config__val">["C#", "Python", "JavaScript"]</span></div>
          <div class="config__row"><span class="config__key">AUTOMATION</span><span class="config__eq">=</span><span class="config__val">["PowerShell", "AI tooling &amp; automation"]</span></div>
          <div class="config__row"><span class="config__key">DATA</span><span class="config__eq">=</span><span class="config__val">["XML / ONIX"]</span></div>
```

- [ ] **Step 4: Regroup the Future `.fx-skills` bars**

In `index.html`, find:
```html
        <div class="fx-skills">
          <div class="fx-skill" data-level="90"><span class="fx-skill__label">C#</span><span class="fx-skill__bar"><span class="fx-skill__fill"></span></span></div>
          <div class="fx-skill" data-level="85"><span class="fx-skill__label">PowerShell</span><span class="fx-skill__bar"><span class="fx-skill__fill"></span></span></div>
          <div class="fx-skill" data-level="65"><span class="fx-skill__label">Python</span><span class="fx-skill__bar"><span class="fx-skill__fill"></span></span></div>
          <div class="fx-skill" data-level="60"><span class="fx-skill__label">JavaScript</span><span class="fx-skill__bar"><span class="fx-skill__fill"></span></span></div>
          <div class="fx-skill" data-level="80"><span class="fx-skill__label">XML / ONIX</span><span class="fx-skill__bar"><span class="fx-skill__fill"></span></span></div>
          <div class="fx-skill" data-level="85"><span class="fx-skill__label">AI tooling &amp; automation</span><span class="fx-skill__bar"><span class="fx-skill__fill"></span></span></div>
        </div>
```
Replace with:
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

- [ ] **Step 5: Add `.fx-skills__group` styles to `styles.css`**

Append to the end of `styles.css`:

```css
.fx-skills__group{ margin-bottom: 20px; }
.fx-skills__group:last-child{ margin-bottom: 0; }
.fx-skills__group-label{ font-family: var(--f-font-body); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--f-magenta); margin: 0 0 10px; }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node tests/skills-grouping.smoke.js`
Expected: `PASS: skills are grouped into three categories in both themes, and bar-fill animation still works`

- [ ] **Step 7: Run the full smoke suite to confirm no regressions**

Run every file in `tests/*.smoke.js` individually (all 19 by now). Expected: every file prints `PASS:` and exits 0.

- [ ] **Step 8: Commit**

```bash
git add index.html styles.css tests/skills-grouping.smoke.js
git commit -m "feat: regroup skills list into Languages/Automation/Data categories in both themes"
```
