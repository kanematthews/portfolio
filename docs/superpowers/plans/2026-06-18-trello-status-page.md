# Trello Status Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `status.html` page that mirrors the user's public Trello board(s) as a tabbed, column-based board view, reusing the site's existing dual-theme (`cli`/`future`) boot-gate system, with live polling while the page is open.

**Architecture:** Three new files (`status.html`, `status.css`, `status.js`) plus two small nav additions to `index.html`. `status.html` reuses `script.js` and `styles.css` unmodified for the boot gate, theme toggle, and background effects — no changes to either file. `status.js` is self-contained: it fetches Trello's public board JSON export directly (no API key/token), polls on an interval while the tab is open, and renders tab/column/card DOM.

**Tech Stack:** Vanilla JS (no build step, no frameworks), Playwright for smoke tests (existing pattern in `tests/*.smoke.js`).

## Global Constraints

- No Trello API key or token — use the public JSON export `https://trello.com/b/{shortLink}.json` with query params `?lists=open&cards=open&fields=name&list_fields=name,pos&card_fields=name,idList,pos` (confirmed working with `Access-Control-Allow-Origin: *`, no slug required).
- Cards show title only — no description, due date, labels, checklists, attachments, or comments.
- Poll interval: 60000ms while the tab is open, re-fetching only the currently active tab's board. Test-only override via `window.__STATUS_POLL_MS__` (read once at script load).
- Board config lives in a `BOARDS` array in `status.js`; today it has exactly one entry: `{ label: 'Game Dev', shortLink: '90XXxsX8' }` (the user's real public Sondrivir board). Adding a board later is a one-line addition to this array — no other code changes required.
- Tab bar always renders (even with one tab) so adding a second board needs zero markup changes.
- On fetch failure, keep showing the last successfully rendered board data if any exists, and show the message `Couldn't load board right now — retrying…`. No manual retry button — the existing poll cycle retries automatically.
- `script.js` and `styles.css` are not modified by this plan — `status.html` includes them as-is. All new code goes in `status.js`/`status.css`.
- Theme is not persisted *between* pages beyond the existing `localStorage` "remember last choice when Enter is pressed with no text" behavior already in `script.js` — this is pre-existing behavior, not something this plan changes.

---

### Task 1: `status.html` scaffold and site navigation

**Files:**
- Create: `status.html`
- Modify: `index.html:40-49` (`.termbar__nav`), `index.html:54-63` (`.fx-nav__links`)
- Test: `tests/status-page-nav.smoke.js`

**Interfaces:**
- Produces: `status.html` with container elements `#statusTabs`, `#statusUpdated`, `#statusError`, `#statusColumns` inside `.status-board` (empty shells — Task 2 fills them with CSS, Task 3 with JS behavior). These exact IDs are relied on by Tasks 2 and 3.

- [ ] **Step 1: Write the failing test**

Create `tests/status-page-nav.smoke.js`:

```js
const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await openFutureMode(page, 'file:///C:/Users/cool_/Desktop/Portfolio/status.html');

  const navVisible = await page.locator('.fx-nav').isVisible();
  if (!navVisible) {
    console.error('FAIL: expected .fx-nav header to be visible after choosing future mode on status.html');
    process.exit(1);
  }

  const homeHref = await page.locator('.fx-nav__links a', { hasText: 'Home' }).getAttribute('href');
  if (homeHref !== 'index.html') {
    console.error('FAIL: expected Home link on status.html to point to index.html, got', homeHref);
    process.exit(1);
  }

  await openFutureMode(page);
  const statusHref = await page.locator('.fx-nav__links a', { hasText: 'Status' }).getAttribute('href');
  if (statusHref !== 'status.html') {
    console.error('FAIL: expected Status link on index.html to point to status.html, got', statusHref);
    process.exit(1);
  }

  console.log('PASS: status.html boots into future mode with a working Home link, and index.html links to it');
  await browser.close();
})();
```

This test calls `openFutureMode(page, url)` with a second argument that does not exist yet on the current helper — that is Step 2.

- [ ] **Step 2: Add the optional `url` parameter to the shared test helper**

Modify `tests/smoke-helpers.js` (full file):

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

This is backward-compatible — every existing call site (`openFutureMode(page)`) keeps navigating to `index.html` by default.

- [ ] **Step 3: Run the test to verify it fails**

Run: `node tests/status-page-nav.smoke.js`
Expected: FAIL — Playwright navigation error (`status.html` does not exist, net::ERR_FILE_NOT_FOUND or similar), or the `Home`/`Status` link lookups time out.

- [ ] **Step 4: Create `status.html`**

```html
<!DOCTYPE html>
<html lang="en" data-theme="cli">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kane Matthews — Status</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=VT323&family=Orbitron:wght@600;700;800&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
</head>
<body class="gate-active">

<div id="bootGate" class="boot">
  <div class="boot__inner">
    <pre class="boot__log" id="bootLog" aria-live="polite"></pre>
    <p class="boot__prompt">
      <span class="boot__user">kane@portfolio</span> <span class="boot__path">~</span> <span class="boot__sigil">%</span>
      <input id="bootInput" class="boot__input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Type cli or future to choose an interface, then press enter" disabled />
    </p>
    <p class="boot__hint" id="bootHint">type <b>cli</b> or <b>future</b>, then press enter</p>
  </div>
</div>

<div class="fx-warp future-only" aria-hidden="true"></div>

<div class="crt cli-only" aria-hidden="true"></div>
<canvas id="rainGlobal" class="rain cli-only" aria-hidden="true"></canvas>
<div class="codetape cli-only" aria-hidden="true"><div class="codetape__track" id="codetapeTrack"></div></div>

<canvas id="starsGlobal" class="fx-stars future-only" aria-hidden="true"></canvas>
<div class="fx-mesh future-only" aria-hidden="true"><span></span><span></span><span></span></div>
<div class="fx-nebula future-only" aria-hidden="true"></div>
<div class="fx-scrim future-only" aria-hidden="true"></div>
<div class="fx-cursor-glow future-only" aria-hidden="true"></div>

<header class="termbar cli-only">
  <div class="termbar__dots"><span class="dot dot--red"></span><span class="dot dot--amber"></span><span class="dot dot--green"></span></div>
  <p class="termbar__title">kane@portfolio: ~/status</p>
  <nav class="termbar__nav">
    <a href="index.html">~</a>
    <a href="index.html#about">~/about</a>
    <a href="index.html#log">~/log</a>
    <a href="index.html#projects">~/projects</a>
    <a href="index.html#contact">~/contact</a>
    <button class="theme-toggle" type="button" aria-pressed="false">
      <span class="theme-toggle__thumb" aria-hidden="true"></span>
      <span class="theme-toggle__label">FUTURE MODE</span>
    </button>
  </nav>
</header>

<header class="fx-nav future-only">
  <p class="fx-nav__mark">K · M</p>
  <nav class="fx-nav__links">
    <a href="index.html">Home</a>
    <a href="index.html#about">About</a>
    <a href="index.html#log">Timeline</a>
    <a href="index.html#projects">Projects</a>
    <a href="index.html#contact">Channel</a>
    <button class="theme-toggle" type="button" aria-pressed="false">
      <span class="theme-toggle__thumb" aria-hidden="true"></span>
      <span class="theme-toggle__label">CLI MODE</span>
    </button>
  </nav>
</header>

<main>

  <section id="status-board" class="block">

    <div class="cli-only">
      <div class="block__inner">
        <p class="prompt"><span class="prompt__user">kane@portfolio</span> <span class="prompt__path">~</span> <span class="prompt__sigil">%</span> <span class="scramble" data-text="status --watch">status --watch</span></p>
      </div>
    </div>

    <div class="future-only fx-section">
      <p class="fx-kicker">05 / Status</p>
      <h2 class="fx-h2">Live Board</h2>
    </div>

    <div class="status-board">
      <div class="status-board__tabs" id="statusTabs"></div>
      <p class="status-board__updated" id="statusUpdated"></p>
      <p class="status-board__error" id="statusError" hidden></p>
      <div class="status-board__columns" id="statusColumns"></div>
    </div>

  </section>

</main>

<footer class="termfooter cli-only">[ session ended — exit code 0 ] · rev A · 2026</footer>
<footer class="fx-footer future-only">Transmission complete · Kane Matthews · 2026</footer>

<script src="script.js"></script>
</body>
</html>
```

- [ ] **Step 5: Add the "Status" nav link to `index.html`**

In `index.html`, modify the `.termbar__nav` block (around line 40-49) — add one line before the `theme-toggle` button:

```html
  <nav class="termbar__nav">
    <a href="#about">~/about</a>
    <a href="#log">~/log</a>
    <a href="#projects">~/projects</a>
    <a href="#contact">~/contact</a>
    <a href="status.html">~/status</a>
    <button class="theme-toggle" type="button" aria-pressed="false">
```

And the `.fx-nav__links` block (around line 54-63) — add one line before its `theme-toggle` button:

```html
  <nav class="fx-nav__links">
    <a href="#about">About</a>
    <a href="#log">Timeline</a>
    <a href="#projects">Projects</a>
    <a href="#contact">Channel</a>
    <a href="status.html">Status</a>
    <button class="theme-toggle" type="button" aria-pressed="false">
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node tests/status-page-nav.smoke.js`
Expected: `PASS: status.html boots into future mode with a working Home link, and index.html links to it`

- [ ] **Step 7: Run the existing smoke suite to confirm no regression**

Run each existing test in `tests/*.smoke.js` except the new one (e.g. `node tests/assets.smoke.js`, `node tests/nav-toggle-microinteractions.smoke.js`, etc.)
Expected: all still print `PASS:` lines — the only change to `index.html` was two additive `<a>` tags, which none of the existing tests assert against.

- [ ] **Step 8: Commit**

```bash
git add status.html index.html tests/status-page-nav.smoke.js tests/smoke-helpers.js
git commit -m "feat: scaffold status.html page with shared boot gate and site nav links"
```

---

### Task 2: Tab bar and board-column rendering (pure logic, no network yet)

**Files:**
- Create: `status.css`
- Create: `status.js`
- Modify: `status.html` (add `<link>` and `<script>` tags)
- Test: `tests/status-page-render.smoke.js`

**Interfaces:**
- Consumes: `#statusTabs`, `#statusUpdated`, `#statusError`, `#statusColumns` from Task 1's `status.html`.
- Produces (for Task 3): `groupCardsByList(lists, cards) -> [{id, name, cards: [{id, name, idList, pos}, ...]}, ...]` (lists sorted by `pos` ascending, cards within each list sorted by `pos` ascending); `renderTabs(container, boards, activeIndex, onSelect)` where `boards` is `[{label}, ...]` and `onSelect(index)` is called on tab click; `renderColumns(container, lists)` which renders the shape returned by `groupCardsByList`.

- [ ] **Step 1: Write the failing test**

Create `tests/status-page-render.smoke.js`:

```js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///C:/Users/cool_/Desktop/Portfolio/status.html');

  const grouped = await page.evaluate(() => {
    const lists = [{ id: 'l2', name: 'Doing', pos: 2 }, { id: 'l1', name: 'To Do', pos: 1 }];
    const cards = [
      { id: 'c2', name: 'Card B', idList: 'l1', pos: 2 },
      { id: 'c1', name: 'Card A', idList: 'l1', pos: 1 },
      { id: 'c3', name: 'Card C', idList: 'l2', pos: 1 }
    ];
    return groupCardsByList(lists, cards);
  });

  if (grouped.length !== 2 || grouped[0].name !== 'To Do' || grouped[1].name !== 'Doing') {
    console.error('FAIL: expected lists sorted by pos (To Do, Doing), got', JSON.stringify(grouped.map(l => l.name)));
    process.exit(1);
  }
  if (grouped[0].cards.length !== 2 || grouped[0].cards[0].name !== 'Card A' || grouped[0].cards[1].name !== 'Card B') {
    console.error('FAIL: expected To Do cards sorted by pos (Card A, Card B), got', JSON.stringify(grouped[0].cards.map(c => c.name)));
    process.exit(1);
  }
  if (grouped[1].cards.length !== 1 || grouped[1].cards[0].name !== 'Card C') {
    console.error('FAIL: expected Doing to contain Card C, got', JSON.stringify(grouped[1].cards.map(c => c.name)));
    process.exit(1);
  }

  await page.evaluate((lists) => {
    renderColumns(document.getElementById('statusColumns'), lists);
  }, grouped);

  const columnTitles = await page.locator('.status-column__title').allTextContents();
  if (columnTitles.join(',') !== 'To Do,Doing') {
    console.error('FAIL: expected rendered columns To Do,Doing, got', columnTitles.join(','));
    process.exit(1);
  }
  const cardTexts = await page.locator('.status-column:first-child .status-card').allTextContents();
  if (cardTexts.join(',') !== 'Card A,Card B') {
    console.error('FAIL: expected first column cards Card A,Card B, got', cardTexts.join(','));
    process.exit(1);
  }

  const tabClicks = await page.evaluate(() => {
    const calls = [];
    const container = document.getElementById('statusTabs');
    renderTabs(container, [{ label: 'Game Dev' }, { label: 'Other' }], 1, (i) => calls.push(i));
    document.querySelectorAll('.status-tab')[0].click();
    return { calls, html: container.innerHTML };
  });
  if (!tabClicks.html.includes('Game Dev') || !tabClicks.html.includes('Other')) {
    console.error('FAIL: expected both tab labels to render, got', tabClicks.html);
    process.exit(1);
  }
  if (tabClicks.calls.length !== 1 || tabClicks.calls[0] !== 0) {
    console.error('FAIL: expected clicking the first tab to call onSelect(0), got', JSON.stringify(tabClicks.calls));
    process.exit(1);
  }
  const activeClassOnSecondTab = await page.evaluate(() => document.querySelectorAll('.status-tab')[1].classList.contains('is-active'));
  if (!activeClassOnSecondTab) {
    console.error('FAIL: expected the tab at activeIndex 1 to have the is-active class');
    process.exit(1);
  }

  console.log('PASS: groupCardsByList sorts correctly, renderColumns renders columns/cards, renderTabs renders tabs and wires clicks');
  await browser.close();
})();
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/status-page-render.smoke.js`
Expected: FAIL — `page.evaluate` throws `ReferenceError: groupCardsByList is not defined` (status.js does not exist yet).

- [ ] **Step 3: Create `status.css`**

```css
.status-board{ max-width: 1100px; margin: 0 auto; }
.status-board__tabs{ display: flex; gap: 10px; margin: 0 0 16px; flex-wrap: wrap; }
.status-tab{
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 8px 14px;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.status-board__updated{ font-size: 11px; margin: 0 0 14px; }
.status-board__error{ font-size: 12px; margin: 0 0 14px; }
.status-board__columns{
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(220px, 1fr);
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
}
.status-column{ padding: 14px; border-radius: 10px; }
.status-column__title{ font-size: 13px; margin: 0 0 10px; }
.status-card{ font-size: 13px; margin: 0 0 8px; padding: 8px 10px; border-radius: 6px; }
.status-loading{ font-size: 13px; }

:root[data-theme="cli"] .status-tab{ color: var(--green-dim); border: 1px solid var(--green-faint); }
:root[data-theme="cli"] .status-tab.is-active{ color: var(--green); border-color: var(--green); box-shadow: var(--glow); }
:root[data-theme="cli"] .status-board__updated{ color: var(--green-faint); }
:root[data-theme="cli"] .status-board__error{ color: var(--red); }
:root[data-theme="cli"] .status-column{ border: 1px solid var(--green-faint); background: rgba(10,15,12,0.6); }
:root[data-theme="cli"] .status-column__title{ color: var(--amber); }
:root[data-theme="cli"] .status-card{ color: var(--white); border: 1px solid var(--green-faint); }
:root[data-theme="cli"] .status-loading{ color: var(--green-dim); }

:root[data-theme="future"] .status-tab{ color: var(--f-dim); border: 1px solid rgba(94,234,255,0.3); }
:root[data-theme="future"] .status-tab.is-active{ color: var(--f-cyan); border-color: var(--f-cyan); box-shadow: 0 0 10px rgba(94,234,255,0.5); }
:root[data-theme="future"] .status-board__updated{ color: var(--f-dim); }
:root[data-theme="future"] .status-board__error{ color: var(--f-magenta); }
:root[data-theme="future"] .status-column{ border: 1px solid rgba(255,255,255,0.12); background: linear-gradient(160deg, rgba(20,18,35,0.9), rgba(10,8,20,0.95)); }
:root[data-theme="future"] .status-column__title{ color: var(--f-white); font-family: var(--f-font-display); }
:root[data-theme="future"] .status-card{ color: var(--f-dim); border: 1px solid rgba(255,255,255,0.1); }
:root[data-theme="future"] .status-loading{ color: var(--f-dim); }
```

- [ ] **Step 4: Create `status.js`**

```js
const BOARDS = [
  { label: 'Game Dev', shortLink: '90XXxsX8' }
];

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

function renderTabs(container, boards, activeIndex, onSelect) {
  container.innerHTML = '';
  boards.forEach((board, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'status-tab' + (i === activeIndex ? ' is-active' : '');
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
```

- [ ] **Step 5: Wire `status.css` and `status.js` into `status.html`**

In `status.html`'s `<head>`, after the `styles.css` link:

```html
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="status.css">
```

In `status.html`'s `<body>`, after the `script.js` tag:

```html
<script src="script.js"></script>
<script src="status.js"></script>
</body>
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `node tests/status-page-render.smoke.js`
Expected: `PASS: groupCardsByList sorts correctly, renderColumns renders columns/cards, renderTabs renders tabs and wires clicks`

- [ ] **Step 7: Run Task 1's test to confirm no regression**

Run: `node tests/status-page-nav.smoke.js`
Expected: still `PASS` — adding `status.css`/`status.js` does not change nav markup.

- [ ] **Step 8: Commit**

```bash
git add status.html status.css status.js tests/status-page-render.smoke.js
git commit -m "feat: add tab bar and column rendering for the status page"
```

---

### Task 3: Trello fetch, polling, and error handling

**Files:**
- Modify: `status.js` (full rewrite shown below — adds fetch/poll/error logic on top of Task 2's functions, which keep their exact signatures)
- Test: `tests/status-page-live.smoke.js`
- Test: `tests/status-page-error.smoke.js`

**Interfaces:**
- Consumes: `groupCardsByList`, `renderTabs`, `renderColumns` from Task 2 (unchanged signatures), `BOARDS` from Task 2 (unchanged shape).
- Produces: a fully working page — no further tasks depend on new exports from this one.

- [ ] **Step 1: Write the failing tests**

Create `tests/status-page-live.smoke.js`:

```js
const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

const FIXTURE_1 = {
  lists: [{ id: 'l1', name: 'To Do', pos: 1 }],
  cards: [{ id: 'c1', name: 'Build the thing', idList: 'l1', pos: 1 }]
};
const FIXTURE_2 = {
  lists: [{ id: 'l1', name: 'To Do', pos: 1 }],
  cards: [
    { id: 'c1', name: 'Build the thing', idList: 'l1', pos: 1 },
    { id: 'c2', name: 'Ship it', idList: 'l1', pos: 2 }
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
  await page.addInitScript(() => { window.__STATUS_POLL_MS__ = 200; });

  await openFutureMode(page, 'file:///C:/Users/cool_/Desktop/Portfolio/status.html');

  await page.waitForSelector('.status-card');
  const firstCards = await page.locator('.status-card').allTextContents();
  if (firstCards.join(',') !== 'Build the thing') {
    console.error('FAIL: expected initial fetch to render "Build the thing", got', firstCards.join(','));
    process.exit(1);
  }

  await page.waitForTimeout(400);
  const secondCards = await page.locator('.status-card').allTextContents();
  if (secondCards.join(',') !== 'Build the thing,Ship it') {
    console.error('FAIL: expected poll to re-render with "Ship it" added, got', secondCards.join(','));
    process.exit(1);
  }
  if (callCount < 2) {
    console.error('FAIL: expected at least 2 fetches (initial + poll), got', callCount);
    process.exit(1);
  }

  const updatedText = await page.locator('#statusUpdated').textContent();
  if (!/updated/i.test(updatedText)) {
    console.error('FAIL: expected last-updated text to mention "updated", got', updatedText);
    process.exit(1);
  }

  console.log('PASS: status page fetches Trello data, polls for updates, and shows last-updated text');
  await browser.close();
})();
```

Create `tests/status-page-error.smoke.js`:

```js
const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.route('https://trello.com/b/90XXxsX8.json**', route => {
    route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
  });

  await openFutureMode(page, 'file:///C:/Users/cool_/Desktop/Portfolio/status.html');
  await page.waitForSelector('#statusError:not([hidden])');

  const errorText = await page.locator('#statusError').textContent();
  if (!/couldn't load board/i.test(errorText)) {
    console.error('FAIL: expected error message about failing to load the board, got', errorText);
    process.exit(1);
  }

  console.log('PASS: status page shows an error message when the Trello fetch fails');
  await browser.close();
})();
```

- [ ] **Step 2: Run both tests to verify they fail**

Run: `node tests/status-page-live.smoke.js`
Expected: FAIL — times out waiting for `.status-card` (nothing fetches yet, `BOARDS` is rendered as an empty tab bar with no active-board fetch wired).

Run: `node tests/status-page-error.smoke.js`
Expected: FAIL — times out waiting for `#statusError:not([hidden])` (no fetch is attempted, so no error is ever shown).

- [ ] **Step 3: Rewrite `status.js`**

Replace the full contents of `status.js` with:

```js
const BOARDS = [
  { label: 'Game Dev', shortLink: '90XXxsX8' }
];
const POLL_MS = window.__STATUS_POLL_MS__ || 60000;

let activeIndex = 0;
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

function trelloUrl(shortLink) {
  return `https://trello.com/b/${shortLink}.json?lists=open&cards=open&fields=name&list_fields=name,pos&card_fields=name,idList,pos`;
}

async function fetchBoard(shortLink) {
  const res = await fetch(trelloUrl(shortLink));
  if (!res.ok) throw new Error('Trello fetch failed: ' + res.status);
  const data = await res.json();
  return groupCardsByList(data.lists, data.cards);
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
  renderTabs(tabsEl, BOARDS, activeIndex, selectBoard);
  renderActiveBoard();
  startPolling();
}

document.addEventListener('DOMContentLoaded', () => {
  whenGateDismissed(initStatusPage);
});
```

- [ ] **Step 4: Run all three new tests to verify they pass**

Run: `node tests/status-page-live.smoke.js`
Expected: `PASS: status page fetches Trello data, polls for updates, and shows last-updated text`

Run: `node tests/status-page-error.smoke.js`
Expected: `PASS: status page shows an error message when the Trello fetch fails`

Run: `node tests/status-page-render.smoke.js`
Expected: still `PASS` — `groupCardsByList`, `renderTabs`, and `renderColumns` keep the exact signatures Task 2 defined.

- [ ] **Step 5: Run the full smoke suite to confirm no regression**

Run every file in `tests/*.smoke.js` (all ten pre-existing files plus the four added in this plan).
Expected: every file prints a `PASS:` line, zero `FAIL:` lines.

- [ ] **Step 6: Manually verify against the real board**

Run `node -e "require('playwright').chromium.launch().then(async b => { const p = await b.newPage(); await p.goto('file:///C:/Users/cool_/Desktop/Portfolio/status.html'); await p.waitForTimeout(1700); await p.fill('#bootInput','future'); await p.press('#bootInput','Enter'); await p.waitForTimeout(3000); await p.screenshot({path:'tmp-status-live.png', fullPage:true}); await b.close(); })"` (or use the Playwright MCP tools) and visually confirm the real Sondrivir board's lists and cards render correctly in both themes. Delete the temporary screenshot afterward (`rm -f tmp-status-live.png`) — do not commit it.

- [ ] **Step 7: Commit**

```bash
git add status.js tests/status-page-live.smoke.js tests/status-page-error.smoke.js
git commit -m "feat: fetch and poll live Trello board data on the status page"
```

---

## Known Scope Boundary

With `BOARDS` currently holding a single entry, the multi-board *tab switch* (re-fetching a different board's data on click) is verified at the unit level in Task 2's test (`renderTabs`'s `onSelect` callback and `is-active` class toggling, using two fake boards) but not end-to-end against two real Trello boards, since only one exists today. When a second board is added to `BOARDS`, the existing `tests/status-page-live.smoke.js` pattern (route-mock two different `shortLink` URLs, click the second tab, assert the second board's cards render) should be extended — no design change is needed, per the spec's "Open Items for Implementation."
