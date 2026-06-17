# Future Mode Space Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Future theme of `index.html`/`styles.css`/`script.js` with a multi-depth parallax space backdrop, signature per-section reveal transitions, expanded micro-interactions, and a handful of generated sci-fi art assets, per `docs/superpowers/specs/2026-06-17-future-mode-space-overhaul-design.md`.

**Architecture:** All new behavior is additive to the existing `cli-only`/`future-only` split, gated by `currentTheme() === 'future'` and the existing `reduceMotion` flag. New CSS lives in a clearly-marked block appended to `styles.css`. New JS init functions follow the existing pattern in `script.js` and are called from `initMainSite()`. Generated PNGs live in `assets/` and are composited with `mix-blend-mode: screen` against the page's near-black background (confirmed during planning: Pollinations.ai output is a flat PNG with a true-black background, no alpha channel — `screen` blend makes black pixels disappear against the dark page).

**Tech Stack:** Vanilla HTML/CSS/JS (no framework, no build step). `generate-image.js` (existing, uses Pollinations.ai, no API key) for asset generation. `playwright` (existing devDependency) for smoke-test scripts.

## Global Constraints

- Future theme only — never touch CLI-theme (`cli-only`) selectors or behavior.
- No new npm dependencies, no build step. GitHub Pages deploy workflow must keep working unmodified.
- Every new animation/effect must be added to the existing `@media (prefers-reduced-motion: reduce)` block in `styles.css` (currently ends around line 687).
- Heavy/decorative effects (drifting silhouettes, nebula layer) must be reduced or hidden in the existing `@media (max-width: 760px)` block (currently ends around line 662).
- Tone: bold sci-fi, still professional — no literal cartoon aliens; silhouettes/glows/emblems only.
- Generated images: true-black background, composited via `mix-blend-mode: screen`, requested at the smallest size that looks sharp for its CSS usage.
- Palette to match in all generated-image prompts: cyan `#5EEAFF`, magenta `#FF5FE0`, violet `#8A6CFF`, on near-black.

---

## Task 1: Generate the four art assets

**Files:**
- Create: `assets/nebula-backdrop.png`
- Create: `assets/planet-silhouette.png`
- Create: `assets/rocket-silhouette.png`
- Create: `assets/alien-motif.png`
- Test: `tests/assets.smoke.js`

**Interfaces:**
- Produces: four PNG files in `assets/`, each with a true-black background, sized for their eventual CSS usage. Later tasks reference these by exact filename.

- [ ] **Step 1: Generate `nebula-backdrop.png`**

Run:
```bash
node generate-image.js "wide deep space nebula clouds in cyan, magenta and violet wisps on a pure black background, soft diffuse glow, no stars, empty calm center, dark sci-fi digital art, horizontal wide composition" nebula-backdrop.png --size=1600x900
```

- [ ] **Step 2: Generate `planet-silhouette.png`**

Run:
```bash
node generate-image.js "small distant ringed planet, glowing rim light in cyan and magenta, pure black background, minimalist sci-fi illustration, no text" planet-silhouette.png --size=300x300
```

- [ ] **Step 3: Generate `rocket-silhouette.png`**

Run:
```bash
node generate-image.js "minimalist sci-fi rocket silhouette in profile, glowing cyan engine exhaust, pure black background, no text" rocket-silhouette.png --size=400x400
```

- [ ] **Step 4: Generate `alien-motif.png`**

Run:
```bash
node generate-image.js "abstract alien glyph emblem, glowing thin violet and cyan linework, pure black background, symmetrical, minimalist, no text, no creature face" alien-motif.png --size=200x200
```

- [ ] **Step 5: Write the smoke test**

Create `tests/assets.smoke.js`:
```js
const fs = require('fs');
const path = require('path');

const required = [
  'nebula-backdrop.png',
  'planet-silhouette.png',
  'rocket-silhouette.png',
  'alien-motif.png'
];

let failed = false;
for (const name of required) {
  const p = path.join(__dirname, '..', 'assets', name);
  if (!fs.existsSync(p)) {
    console.error('FAIL: missing', p);
    failed = true;
    continue;
  }
  const size = fs.statSync(p).size;
  if (size < 2000) {
    console.error('FAIL: suspiciously small', p, size, 'bytes');
    failed = true;
  } else {
    console.log('PASS:', name, size, 'bytes');
  }
}
process.exit(failed ? 1 : 0);
```

- [ ] **Step 6: Run the smoke test**

Run: `node tests/assets.smoke.js`
Expected: four `PASS:` lines, exit code 0.

- [ ] **Step 7: Visually inspect each image**

Open each of the four files in `assets/` (e.g. via the Read tool or an image viewer) and confirm: true-black background, no readable text baked into the image, no literal cartoon alien face, matches the cyan/magenta/violet palette. Regenerate with an adjusted prompt (repeat the relevant step above with the same filename to overwrite) if any image fails this check.

- [ ] **Step 8: Commit**

```bash
git add assets/nebula-backdrop.png assets/planet-silhouette.png assets/rocket-silhouette.png assets/alien-motif.png tests/assets.smoke.js
git commit -m "Add generated space-themed art assets for Future mode overhaul"
```

---

## Task 2: Smoke-test harness + nebula parallax layer

**Files:**
- Create: `tests/smoke-helpers.js`
- Create: `tests/nebula-parallax.smoke.js`
- Modify: `index.html` (add nebula layer element near existing `.fx-mesh`, around line 30)
- Modify: `styles.css` (append new `FUTURE THEME — ENHANCED` block)
- Modify: `script.js` (add `initParallax`, call from `initMainSite`)

**Interfaces:**
- Produces: `openFutureMode(page)` exported from `tests/smoke-helpers.js` — async function taking a Playwright `page`, navigates to `index.html`, clears the boot gate into Future mode, and resolves once the gate has finished closing. Reused by every later smoke test in this plan.
- Produces: `.fx-nebula` element in the DOM (future-only), and `initParallax()` in `script.js`, called unconditionally from `initMainSite()` (it no-ops outside Future mode/with reduced motion internally, matching the existing `initStars`/`initParticles` pattern).

- [ ] **Step 1: Write the smoke-test helper**

Create `tests/smoke-helpers.js`:
```js
async function openFutureMode(page) {
  await page.goto('file:///C:/Users/cool_/Desktop/Portfolio/index.html');
  await page.waitForTimeout(1700);
  await page.fill('#bootInput', 'future');
  await page.press('#bootInput', 'Enter');
  await page.waitForTimeout(1200);
}

module.exports = { openFutureMode };
```

- [ ] **Step 2: Write the failing smoke test**

Create `tests/nebula-parallax.smoke.js`:
```js
const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await openFutureMode(page);

  const nebulaCount = await page.locator('.fx-nebula').count();
  if (nebulaCount !== 1) {
    console.error('FAIL: expected exactly 1 .fx-nebula element, found', nebulaCount);
    process.exit(1);
  }

  const nebulaBefore = await page.locator('.fx-nebula').evaluate(el => getComputedStyle(el).transform);
  const particlesBefore = await page.locator('.fx-particles').evaluate(el => getComputedStyle(el).transform);
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(300);
  const nebulaAfter = await page.locator('.fx-nebula').evaluate(el => getComputedStyle(el).transform);
  const particlesAfter = await page.locator('.fx-particles').evaluate(el => getComputedStyle(el).transform);

  if (nebulaBefore === nebulaAfter) {
    console.error('FAIL: .fx-nebula transform did not change after scrolling (before === after === "' + nebulaBefore + '")');
    process.exit(1);
  }
  if (particlesBefore === particlesAfter) {
    console.error('FAIL: .fx-particles transform did not change after scrolling (before === after === "' + particlesBefore + '")');
    process.exit(1);
  }
  if (nebulaAfter === particlesAfter) {
    console.error('FAIL: expected .fx-nebula and .fx-particles to shift at different rates, both ended at "' + nebulaAfter + '"');
    process.exit(1);
  }

  console.log('PASS: nebula and particle layers present and shift at different rates on scroll');
  await browser.close();
})();
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node tests/nebula-parallax.smoke.js`
Expected: `FAIL: expected exactly 1 .fx-nebula element, found 0` (element doesn't exist yet).

- [ ] **Step 4: Add the nebula element to `index.html`**

In `index.html`, immediately after the existing line (around line 30):
```html
<div class="fx-mesh future-only" aria-hidden="true"><span></span><span></span><span></span></div>
```
add:
```html
<div class="fx-nebula future-only" aria-hidden="true"></div>
```

- [ ] **Step 5: Append the enhanced future-theme CSS block to `styles.css`**

Add at the end of `styles.css` (after the existing reduced-motion block, i.e. after the current final `}` around line 687):
```css

/* ======================================================
   FUTURE THEME — ENHANCED: space overhaul
   ====================================================== */

.fx-nebula{
  position: fixed;
  inset: -10% -10%;
  z-index: -3;
  background: url('assets/nebula-backdrop.png') center center / cover no-repeat;
  mix-blend-mode: screen;
  opacity: 0.55;
  pointer-events: none;
  will-change: transform;
  transition: transform 0.1s linear;
}

@media (max-width: 760px){
  .fx-nebula{ opacity: 0.3; }
}

@media (prefers-reduced-motion: reduce){
  .fx-nebula{ transition: none !important; }
}
```

- [ ] **Step 6: Add `initParallax` to `script.js`**

In `script.js`, add this function near the other canvas-init functions (after `initParticles`, before the "scroll reveals" section comment):
```js
function initParallax() {
  const nebula = document.querySelector('.fx-nebula');
  const particles = document.querySelector('.fx-particles');
  if (!nebula && !particles) return;

  let ticking = false;
  function apply() {
    if (currentTheme() === 'future' && !reduceMotion) {
      const y = window.scrollY;
      if (nebula) nebula.style.transform = `translateY(${(y * 0.12).toFixed(1)}px)`;
      if (particles) particles.style.transform = `translateY(${(y * 0.05).toFixed(1)}px)`;
    }
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(apply);
    }
  }, { passive: true });
}
```

Then in `initMainSite()`, add `initParallax();` on its own line, alongside the other `init...()` calls (e.g. directly after the `initCursorGlow();` line).

- [ ] **Step 7: Run test to verify it passes**

Run: `node tests/nebula-parallax.smoke.js`
Expected: `PASS: nebula parallax layer present and responds to scroll`

- [ ] **Step 8: Manual visual check**

Open `index.html` directly in a browser, type `future` at the boot gate, scroll the page, and confirm the nebula glow is visible behind the content and drifts subtly as you scroll, without obscuring text readability.

- [ ] **Step 9: Commit**

```bash
git add index.html styles.css script.js tests/smoke-helpers.js tests/nebula-parallax.smoke.js
git commit -m "Add nebula parallax background layer to Future mode"
```

---

## Task 3: Drifting planet & rocket silhouettes

**Files:**
- Modify: `index.html` (add planet/rocket elements near existing `.fx-ufo`, around line 121)
- Modify: `styles.css` (append to the enhanced block)
- Test: `tests/drift-silhouettes.smoke.js`

**Interfaces:**
- Consumes: `openFutureMode` from `tests/smoke-helpers.js` (Task 2).
- Produces: `.fx-planet` and `.fx-rocket` elements (future-only), purely CSS-animated (no new JS).

- [ ] **Step 1: Write the failing smoke test**

Create `tests/drift-silhouettes.smoke.js`:
```js
const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await openFutureMode(page);

  const planetCount = await page.locator('.fx-planet').count();
  const rocketCount = await page.locator('.fx-rocket').count();
  if (planetCount !== 1 || rocketCount !== 1) {
    console.error('FAIL: expected 1 .fx-planet and 1 .fx-rocket, found', planetCount, rocketCount);
    process.exit(1);
  }

  const planetAnim = await page.locator('.fx-planet').evaluate(el => getComputedStyle(el).animationName);
  const rocketAnim = await page.locator('.fx-rocket').evaluate(el => getComputedStyle(el).animationName);
  if (planetAnim === 'none' || rocketAnim === 'none') {
    console.error('FAIL: expected animations on .fx-planet/.fx-rocket, got', planetAnim, rocketAnim);
    process.exit(1);
  }

  console.log('PASS: drifting planet and rocket silhouettes present and animated');
  await browser.close();
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/drift-silhouettes.smoke.js`
Expected: `FAIL: expected 1 .fx-planet and 1 .fx-rocket, found 0 0`

- [ ] **Step 3: Add the elements to `index.html`**

In `index.html`, immediately after the existing `<svg class="fx-ufo" ...> ... </svg>` block (the closing `</svg>` is around line 129), add:
```html
<div class="fx-planet future-only" aria-hidden="true"></div>
<div class="fx-rocket future-only" aria-hidden="true"></div>
```

- [ ] **Step 4: Append CSS for the silhouettes**

Add to the end of `styles.css`:
```css

.fx-planet, .fx-rocket{
  position: absolute;
  z-index: 0;
  pointer-events: none;
  mix-blend-mode: screen;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.fx-planet{
  top: 60%;
  left: -8%;
  width: 90px;
  height: 90px;
  opacity: 0.5;
  background-image: url('assets/planet-silhouette.png');
  animation: fx-planet-drift 46s linear infinite;
}

.fx-rocket{
  top: 8%;
  left: -6%;
  width: 70px;
  height: 70px;
  opacity: 0.6;
  background-image: url('assets/rocket-silhouette.png');
  animation: fx-rocket-drift 33s linear infinite;
  animation-delay: 9s;
}

@keyframes fx-planet-drift{
  0%{ transform: translate(0, 0) rotate(0deg); }
  100%{ transform: translate(125vw, -8vh) rotate(8deg); }
}

@keyframes fx-rocket-drift{
  0%{ transform: translate(0, 0) rotate(-20deg); }
  100%{ transform: translate(120vw, 18vh) rotate(-20deg); }
}

@media (max-width: 760px){
  .fx-planet, .fx-rocket{ display: none; }
}

@media (prefers-reduced-motion: reduce){
  .fx-planet, .fx-rocket{ animation: none !important; display: none; }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests/drift-silhouettes.smoke.js`
Expected: `PASS: drifting planet and rocket silhouettes present and animated`

- [ ] **Step 6: Manual visual check**

In a browser, watch the hero section in Future mode for ~45 seconds and confirm the rocket and planet each silently drift across the screen once, at low opacity, without ever blocking text.

- [ ] **Step 7: Commit**

```bash
git add index.html styles.css tests/drift-silhouettes.smoke.js
git commit -m "Add drifting planet and rocket silhouettes to Future mode background"
```

---

## Task 4: Hero entrance warp-launch sequence

**Files:**
- Modify: `index.html` (add warp overlay element, near `#bootGate`, around line 23)
- Modify: `styles.css` (append warp-burst styles)
- Modify: `script.js` (modify `enterSite`)
- Test: `tests/warp-entrance.smoke.js`

**Interfaces:**
- Consumes: `openFutureMode` pattern is partially superseded here — this test drives the gate manually since it needs to observe the moment of transition.
- Produces: `.fx-warp` element (future-only) that gains class `is-warping` for ~700ms when `enterSite('future')` runs; no other task depends on this directly.

- [ ] **Step 1: Write the failing smoke test**

Create `tests/warp-entrance.smoke.js`:
```js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('file:///C:/Users/cool_/Desktop/Portfolio/index.html');
  await page.waitForTimeout(1700);
  await page.fill('#bootInput', 'future');
  await page.press('#bootInput', 'Enter');

  await page.waitForTimeout(150);
  const duringClass = await page.locator('.fx-warp').getAttribute('class');
  if (!duringClass || !duringClass.includes('is-warping')) {
    console.error('FAIL: expected .fx-warp to have is-warping shortly after entering future mode, got class="' + duringClass + '"');
    process.exit(1);
  }

  await page.waitForTimeout(1200);
  const afterClass = await page.locator('.fx-warp').getAttribute('class');
  if (afterClass.includes('is-warping')) {
    console.error('FAIL: expected is-warping to be removed after the burst, still present');
    process.exit(1);
  }

  console.log('PASS: warp-launch burst plays once on entering Future mode and then clears');
  await browser.close();
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/warp-entrance.smoke.js`
Expected: fails with a Playwright locator error (`.fx-warp` doesn't exist yet) — confirm it fails, exact message isn't important.

- [ ] **Step 3: Add the warp overlay element to `index.html`**

In `index.html`, immediately after the closing `</div>` of `#bootGate` (around line 23), add:
```html
<div class="fx-warp future-only" aria-hidden="true"></div>
```

- [ ] **Step 4: Append warp-burst CSS**

Add to the end of `styles.css`:
```css

.fx-warp{
  position: fixed;
  inset: 0;
  z-index: 998;
  pointer-events: none;
  opacity: 0;
  background: repeating-conic-gradient(from 0deg, rgba(94,234,255,0.0) 0deg 2deg, rgba(94,234,255,0.5) 2.2deg 2.4deg);
  transform: scale(0.3);
  transition: none;
}
.fx-warp.is-warping{
  opacity: 1;
  animation: fx-warp-burst 0.7s ease-out forwards;
}
@keyframes fx-warp-burst{
  0%{ opacity: 0.9; transform: scale(0.3); }
  70%{ opacity: 0.6; transform: scale(2.2); }
  100%{ opacity: 0; transform: scale(3.2); }
}

@media (prefers-reduced-motion: reduce){
  .fx-warp{ display: none !important; }
}
```

- [ ] **Step 5: Modify `enterSite` in `script.js`**

Find the existing `enterSite` function:
```js
function enterSite(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('theme', theme); } catch (e) { /* ignore */ }

  const gate = document.getElementById('bootGate');
  document.body.classList.remove('gate-active');
  if (gate) gate.classList.add('is-leaving');

  setTimeout(() => {
    if (gate) gate.style.display = 'none';
    initMainSite();
  }, reduceMotion ? 0 : 550);
}
```
Replace it with:
```js
function enterSite(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('theme', theme); } catch (e) { /* ignore */ }

  const gate = document.getElementById('bootGate');
  document.body.classList.remove('gate-active');
  if (gate) gate.classList.add('is-leaving');

  if (theme === 'future' && !reduceMotion) {
    const warp = document.querySelector('.fx-warp');
    if (warp) {
      warp.classList.add('is-warping');
      setTimeout(() => warp.classList.remove('is-warping'), 700);
    }
  }

  setTimeout(() => {
    if (gate) gate.style.display = 'none';
    initMainSite();
  }, reduceMotion ? 0 : 550);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node tests/warp-entrance.smoke.js`
Expected: `PASS: warp-launch burst plays once on entering Future mode and then clears`

- [ ] **Step 7: Manual visual check**

In a browser, load the page fresh, type `future`, press Enter, and confirm a quick radiating-light burst plays as the boot gate closes, before the orbit hero settles in. Then reload and type `cli` to confirm CLI mode is unaffected.

- [ ] **Step 8: Commit**

```bash
git add index.html styles.css script.js tests/warp-entrance.smoke.js
git commit -m "Add warp-launch burst to Future mode hero entrance"
```

---

## Task 5: About section — hologram materialize reveal

**Files:**
- Modify: `index.html` (add a class hook to the About future section, around line 178)
- Modify: `styles.css` (append hologram-reveal styles)
- Modify: `script.js` (extend `initReveals`)
- Test: `tests/about-reveal.smoke.js`

**Interfaces:**
- Consumes: `openFutureMode` from `tests/smoke-helpers.js`.
- Produces: `.fx-section--holo` reveal variant, handled by a new branch in `initReveals()`; no other task depends on this.

- [ ] **Step 1: Write the failing smoke test**

Create `tests/about-reveal.smoke.js`:
```js
const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await openFutureMode(page);

  const hasClass = await page.locator('#about .fx-section').evaluate(el => el.classList.contains('fx-section--holo'));
  if (!hasClass) {
    console.error('FAIL: expected #about .fx-section to have fx-section--holo class');
    process.exit(1);
  }

  await page.locator('#about').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const isIn = await page.locator('#about .fx-section').evaluate(el => el.classList.contains('is-in'));
  if (!isIn) {
    console.error('FAIL: expected #about .fx-section to gain is-in after scrolling into view');
    process.exit(1);
  }

  console.log('PASS: about section uses hologram reveal variant and triggers on scroll');
  await browser.close();
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/about-reveal.smoke.js`
Expected: `FAIL: expected #about .fx-section to have fx-section--holo class`

- [ ] **Step 3: Add the class hook in `index.html`**

In `index.html`, find (around line 178):
```html
    <div class="future-only fx-section">
      <p class="fx-kicker">01 / Profile</p>
```
Change the opening tag to:
```html
    <div class="future-only fx-section fx-section--holo reveal">
      <p class="fx-kicker">01 / Profile</p>
```

- [ ] **Step 4: Append hologram-reveal CSS**

Add to the end of `styles.css`:
```css

.fx-section--holo{
  position: relative;
  overflow: hidden;
}
.fx-section--holo::before{
  content: "";
  position: absolute;
  left: 0; right: 0; top: -10%;
  height: 40%;
  background: linear-gradient(180deg, rgba(94,234,255,0) 0%, rgba(94,234,255,0.22) 50%, rgba(94,234,255,0) 100%);
  opacity: 0;
  pointer-events: none;
  z-index: 2;
}
.fx-section--holo.is-in::before{
  animation: fx-holo-section-scan 1.1s ease-out;
}
@keyframes fx-holo-section-scan{
  0%{ top: -10%; opacity: 1; }
  100%{ top: 110%; opacity: 0; }
}
.fx-section--holo{
  opacity: 0;
  filter: none;
}
.fx-section--holo.is-in{
  opacity: 1;
  animation: fx-holo-flicker-in 0.5s ease-out;
}
@keyframes fx-holo-flicker-in{
  0%{ opacity: 0; }
  30%{ opacity: 0.4; }
  45%{ opacity: 0.1; }
  60%{ opacity: 0.8; }
  100%{ opacity: 1; }
}

@media (prefers-reduced-motion: reduce){
  .fx-section--holo, .fx-section--holo::before{ animation: none !important; opacity: 1 !important; }
}
```

- [ ] **Step 5: Extend `initReveals` in `script.js`**

The existing `.reveal` class is generic and shared by other elements (`.fx-about`, `.fx-stats`, etc. elsewhere in the page) — adding `reveal` to the `#about .fx-section` element itself (done in Step 3) means it will already be picked up by the existing `IntersectionObserver` in `initReveals()` (which adds `is-in` to any `.reveal` it observes). No JS change is required for the class toggle itself — confirm by re-reading `initReveals()`:
```js
function initReveals() {
  const revealEls = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(el => el.classList.add('is-in'));
  } else {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    revealEls.forEach(el => obs.observe(el));
  }
  // ... skill bars unchanged below
}
```
No edit needed here — this step is a verification-only step, not a code change.

- [ ] **Step 6: Run test to verify it passes**

Run: `node tests/about-reveal.smoke.js`
Expected: `PASS: about section uses hologram reveal variant and triggers on scroll`

- [ ] **Step 7: Manual visual check**

In a browser, Future mode, scroll down to the About section and confirm it flickers/scans into view rather than just sliding up.

- [ ] **Step 8: Commit**

```bash
git add index.html styles.css tests/about-reveal.smoke.js
git commit -m "Add hologram-materialize reveal to Future mode About section"
```

---

## Task 6: Timeline — orbital trail lock-on pings

**Files:**
- Modify: `index.html` (no structural change needed — verify existing `.fx-milestone__node` markup, around line 273)
- Modify: `styles.css` (append per-node ping-on-fill animation)
- Modify: `script.js` (add `initTimelinePings`)
- Test: `tests/timeline-pings.smoke.js`

**Interfaces:**
- Consumes: `openFutureMode` from `tests/smoke-helpers.js`.
- Produces: `is-locked` class added to each `.fx-milestone__node` in sequence as the timeline fills; no other task depends on this.

- [ ] **Step 1: Write the failing smoke test**

Create `tests/timeline-pings.smoke.js`:
```js
const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await openFutureMode(page);

  await page.locator('#log').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2200);

  const lockedCount = await page.locator('.fx-milestone__node.is-locked').count();
  if (lockedCount !== 3) {
    console.error('FAIL: expected 3 .fx-milestone__node.is-locked after timeline fills, found', lockedCount);
    process.exit(1);
  }

  console.log('PASS: all timeline nodes receive is-locked ping after scrolling into view');
  await browser.close();
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/timeline-pings.smoke.js`
Expected: `FAIL: expected 3 .fx-milestone__node.is-locked after timeline fills, found 0`

- [ ] **Step 3: Append ping CSS**

Add to the end of `styles.css`:
```css

.fx-milestone__node.is-locked{ animation: fx-node-lock 0.6s ease-out; }
.fx-milestone__node.is-locked::after{
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1px solid var(--f-cyan);
  animation: fx-ping 0.9s ease-out;
}
@keyframes fx-node-lock{
  0%{ box-shadow: 0 0 0 rgba(94,234,255,0.7); }
  50%{ box-shadow: 0 0 22px rgba(94,234,255,0.9); }
  100%{ box-shadow: 0 0 12px rgba(94,234,255,0.7); }
}

@media (prefers-reduced-motion: reduce){
  .fx-milestone__node.is-locked, .fx-milestone__node.is-locked::after{ animation: none !important; }
}
```
Note: this reuses the existing `@keyframes fx-ping` already defined for `.fx-contact__ping::after` — no duplicate keyframes needed.

- [ ] **Step 4: Add `initTimelinePings` to `script.js`**

Add this function after `initStats()`:
```js
function initTimelinePings() {
  const timeline = document.querySelector('.fx-timeline');
  const nodes = document.querySelectorAll('.fx-milestone__node');
  if (!timeline || !nodes.length) return;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    nodes.forEach(n => n.classList.add('is-locked'));
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        nodes.forEach((node, i) => {
          setTimeout(() => node.classList.add('is-locked'), i * 350);
        });
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  obs.observe(timeline);
}
```

Then in `initMainSite()`, add `initTimelinePings();` alongside the other init calls (after `initStats();`).

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests/timeline-pings.smoke.js`
Expected: `PASS: all timeline nodes receive is-locked ping after scrolling into view`

- [ ] **Step 6: Manual visual check**

In a browser, Future mode, scroll to the Timeline section and confirm each node "locks on" with a brief ring-ping shortly after the glowing line reaches it, staggered top to bottom.

- [ ] **Step 7: Commit**

```bash
git add styles.css script.js tests/timeline-pings.smoke.js
git commit -m "Add orbital lock-on ping to Future mode timeline nodes"
```

---

## Task 7: Projects — staggered warp-in cards

**Files:**
- Modify: `index.html` (no structural change — `.fx-card` elements already exist, around line 350)
- Modify: `styles.css` (replace `.fx-grid .reveal` generic transition with a per-card staggered streak-in)
- Test: `tests/projects-warp.smoke.js`

**Interfaces:**
- Consumes: existing `.fx-grid.reveal` / `is-in` toggling already produced by `initReveals()` — no JS change needed this task.
- Produces: `.fx-card` elements gain individual `transition-delay` via CSS `nth-child`, and a streak/blur entrance instead of the shared fade-up.

- [ ] **Step 1: Write the failing smoke test**

Create `tests/projects-warp.smoke.js`:
```js
const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await openFutureMode(page);

  const firstDelay = await page.locator('.fx-grid .fx-card').nth(0).evaluate(el => getComputedStyle(el).transitionDelay);
  const secondDelay = await page.locator('.fx-grid .fx-card').nth(1).evaluate(el => getComputedStyle(el).transitionDelay);

  if (firstDelay === secondDelay) {
    console.error('FAIL: expected staggered transition-delay between cards, both were', firstDelay);
    process.exit(1);
  }

  console.log('PASS: project cards have staggered entrance delays (' + firstDelay + ' vs ' + secondDelay + ')');
  await browser.close();
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/projects-warp.smoke.js`
Expected: `FAIL: expected staggered transition-delay between cards, both were 0s`

- [ ] **Step 3: Append staggered warp-in CSS**

Add to the end of `styles.css`:
```css

.fx-grid.reveal .fx-card{
  opacity: 0;
  transform: translateY(24px) scale(0.94);
  filter: blur(4px);
  transition: opacity 0.5s ease, transform 0.5s ease, filter 0.5s ease;
}
.fx-grid.reveal.is-in .fx-card{
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}
.fx-grid .fx-card:nth-child(1){ transition-delay: 0s; }
.fx-grid .fx-card:nth-child(2){ transition-delay: 0.12s; }
.fx-grid .fx-card:nth-child(3){ transition-delay: 0.24s; }
.fx-grid .fx-card:nth-child(4){ transition-delay: 0.36s; }

@media (prefers-reduced-motion: reduce){
  .fx-grid.reveal .fx-card{
    transition: none !important;
    transition-delay: 0s !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/projects-warp.smoke.js`
Expected: `PASS: project cards have staggered entrance delays (0s vs 0.12s)`

- [ ] **Step 5: Manual visual check**

In a browser, Future mode, scroll to Projects and confirm the four cards streak/blur into place one after another rather than all appearing simultaneously.

- [ ] **Step 6: Commit**

```bash
git add styles.css tests/projects-warp.smoke.js
git commit -m "Add staggered warp-in entrance to Future mode project cards"
```

---

## Task 8: Contact — radar lock-on payoff

**Files:**
- Modify: `index.html` (no structural change — `.fx-contact__radar` and `.fx-contact__grid` already exist, around lines 419-426)
- Modify: `styles.css` (append targeting-flash styles)
- Modify: `script.js` (add `initContactLockOn`)
- Test: `tests/contact-lockon.smoke.js`

**Interfaces:**
- Consumes: `openFutureMode` from `tests/smoke-helpers.js`.
- Produces: `is-locked` class added to `.fx-contact` once its radar enters view; no other task depends on this.

- [ ] **Step 1: Write the failing smoke test**

Create `tests/contact-lockon.smoke.js`:
```js
const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await openFutureMode(page);

  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);

  const isLocked = await page.locator('.fx-contact').evaluate(el => el.classList.contains('is-locked'));
  if (!isLocked) {
    console.error('FAIL: expected .fx-contact to have is-locked class after scrolling into view');
    process.exit(1);
  }

  console.log('PASS: contact section receives lock-on payoff after scrolling into view');
  await browser.close();
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/contact-lockon.smoke.js`
Expected: `FAIL: expected .fx-contact to have is-locked class after scrolling into view`

- [ ] **Step 3: Append targeting-flash CSS**

Add to the end of `styles.css`:
```css

.fx-contact.is-locked .fx-contact__radar::after{
  animation: fx-radar-sweep 0.5s linear 1, fx-radar-sweep 4s linear infinite 0.5s;
}
.fx-contact.is-locked .fx-contact__btn{
  animation: fx-contact-flash 0.5s ease-out backwards;
}
.fx-contact.is-locked .fx-contact__btn:nth-child(1){ animation-delay: 0.1s; }
.fx-contact.is-locked .fx-contact__btn:nth-child(2){ animation-delay: 0.25s; }
.fx-contact.is-locked .fx-contact__btn:nth-child(3){ animation-delay: 0.4s; }
@keyframes fx-contact-flash{
  0%{ box-shadow: 0 0 0 rgba(94,234,255,0); border-color: rgba(255,255,255,0.12); }
  40%{ box-shadow: 0 0 24px rgba(94,234,255,0.6); border-color: var(--f-cyan); }
  100%{ box-shadow: 0 0 0 rgba(94,234,255,0); border-color: rgba(255,255,255,0.12); }
}

@media (prefers-reduced-motion: reduce){
  .fx-contact.is-locked .fx-contact__btn{ animation: none !important; }
}
```

- [ ] **Step 4: Add `initContactLockOn` to `script.js`**

Add this function after `initTimelinePings()`:
```js
function initContactLockOn() {
  const contact = document.querySelector('.fx-contact');
  if (!contact) return;

  if (reduceMotion || !('IntersectionObserver' in window)) {
    contact.classList.add('is-locked');
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        contact.classList.add('is-locked');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  obs.observe(contact);
}
```

Then in `initMainSite()`, add `initContactLockOn();` alongside the other init calls (after `initTimelinePings();`).

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests/contact-lockon.smoke.js`
Expected: `PASS: contact section receives lock-on payoff after scrolling into view`

- [ ] **Step 6: Manual visual check**

In a browser, Future mode, scroll to Contact and confirm the radar does a quick fast sweep and each contact button flashes into place shortly after, staggered.

- [ ] **Step 7: Commit**

```bash
git add styles.css script.js tests/contact-lockon.smoke.js
git commit -m "Add radar lock-on payoff to Future mode contact section"
```

---

## Task 9: Micro-interactions — nav underline-glow + theme toggle pulse

**Files:**
- Modify: `styles.css` (append nav-link and toggle-click styles)
- Modify: `script.js` (extend `initThemeToggle`)
- Test: `tests/nav-toggle-microinteractions.smoke.js`

**Interfaces:**
- Consumes: `openFutureMode` from `tests/smoke-helpers.js`.
- Produces: `.fx-nav__links a` gains a CSS-only underline-glow on `:hover`; `.theme-toggle` gains `is-pulsing` class briefly on click (added by extending the existing click handler in `initThemeToggle`).

- [ ] **Step 1: Write the failing smoke test**

Create `tests/nav-toggle-microinteractions.smoke.js`:
```js
const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await openFutureMode(page);

  await page.locator('.fx-nav .theme-toggle').click();
  await page.waitForTimeout(50);
  const pulsing = await page.locator('.fx-nav .theme-toggle').evaluate(el => el.classList.contains('is-pulsing'));
  if (!pulsing) {
    console.error('FAIL: expected .theme-toggle to gain is-pulsing immediately after click');
    process.exit(1);
  }

  await page.waitForTimeout(700);
  const stillPulsing = await page.locator('.fx-nav .theme-toggle').evaluate(el => el.classList.contains('is-pulsing'));
  if (stillPulsing) {
    console.error('FAIL: expected is-pulsing to be removed after the pulse finishes');
    process.exit(1);
  }

  console.log('PASS: theme toggle pulses on click and clears afterward');
  await browser.close();
})();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/nav-toggle-microinteractions.smoke.js`
Expected: `FAIL: expected .theme-toggle to gain is-pulsing immediately after click`

- [ ] **Step 3: Append nav-link and toggle-pulse CSS**

Add to the end of `styles.css`:
```css

.fx-nav__links a{ position: relative; }
.fx-nav__links a::after{
  content: "";
  position: absolute;
  left: 0; bottom: -4px;
  width: 100%;
  height: 1px;
  background: var(--f-cyan);
  box-shadow: 0 0 8px var(--f-cyan);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.25s ease;
}
.fx-nav__links a:hover::after{ transform: scaleX(1); }

.theme-toggle.is-pulsing{ animation: fx-toggle-pulse 0.5s ease-out; }
@keyframes fx-toggle-pulse{
  0%{ box-shadow: 0 0 0 rgba(94,234,255,0.6); }
  60%{ box-shadow: 0 0 18px rgba(94,234,255,0.8); }
  100%{ box-shadow: 0 0 0 rgba(94,234,255,0); }
}

@media (prefers-reduced-motion: reduce){
  .fx-nav__links a::after{ transition: none !important; }
  .theme-toggle.is-pulsing{ animation: none !important; }
}
```

- [ ] **Step 4: Extend `initThemeToggle` in `script.js`**

Find the existing function:
```js
function initThemeToggle() {
  const buttons = document.querySelectorAll('.theme-toggle');
  if (!buttons.length) return;
  syncToggleLabels(currentTheme());
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const next = currentTheme() === 'future' ? 'cli' : 'future';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) { /* ignore */ }
      syncToggleLabels(next);
    });
  });
}
```
Replace it with:
```js
function initThemeToggle() {
  const buttons = document.querySelectorAll('.theme-toggle');
  if (!buttons.length) return;
  syncToggleLabels(currentTheme());
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const next = currentTheme() === 'future' ? 'cli' : 'future';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) { /* ignore */ }
      syncToggleLabels(next);

      if (!reduceMotion) {
        btn.classList.add('is-pulsing');
        setTimeout(() => btn.classList.remove('is-pulsing'), 500);
      }
    });
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests/nav-toggle-microinteractions.smoke.js`
Expected: `PASS: theme toggle pulses on click and clears afterward`

- [ ] **Step 6: Manual visual check**

In a browser, Future mode, hover each nav link and confirm a glowing underline draws in; click the theme toggle and confirm a brief pulse ring plays.

- [ ] **Step 7: Commit**

```bash
git add styles.css script.js tests/nav-toggle-microinteractions.smoke.js
git commit -m "Add nav underline-glow hover and theme-toggle click pulse"
```

---

## Task 10: Micro-interactions — timeline node hover, contact button lift, scroll-cue pulse

**Files:**
- Modify: `styles.css` (append hover/lift/pulse styles — CSS-only, no JS/HTML changes)
- Test: `tests/remaining-microinteractions.smoke.js`

**Interfaces:**
- Consumes: none beyond existing DOM structure.
- Produces: pure CSS hover/animation additions; nothing later depends on this.

- [ ] **Step 1: Write the failing smoke test**

Create `tests/remaining-microinteractions.smoke.js`:
```js
const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await openFutureMode(page);

  const scrollCueAnim = await page.locator('.fx-scrollcue').evaluate(el => getComputedStyle(el).animationName);
  if (!scrollCueAnim.includes('fx-cue-pulse')) {
    console.error('FAIL: expected .fx-scrollcue animation-name to include fx-cue-pulse, got', scrollCueAnim);
    process.exit(1);
  }

  console.log('PASS: scroll cue has its new pulse animation applied');
  await browser.close();
})();
```

(This test checks the scroll-cue pulse via computed style, since hover-only states aren't easily asserted headlessly; the timeline-node and contact-button hover/lift effects are verified manually in Step 3 below.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/remaining-microinteractions.smoke.js`
Expected: `FAIL: expected .fx-scrollcue animation-name to include fx-cue-pulse, got fx-bob`

- [ ] **Step 3: Append the remaining micro-interaction CSS**

Add to the end of `styles.css`:
```css

.fx-milestone__node{ transition: box-shadow 0.2s ease; cursor: default; }
.fx-milestone__node:hover{ box-shadow: 0 0 16px rgba(94,234,255,0.8); }
.fx-milestone__node:hover::before{
  content: "";
  position: absolute;
  left: 10px;
  top: 4px;
  width: 22px;
  height: 1px;
  background: linear-gradient(90deg, var(--f-cyan), transparent);
}

.fx-contact__btn{ transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease; }
a.fx-contact__btn:hover{ transform: translateY(-3px); box-shadow: 0 10px 24px rgba(94,234,255,0.18); }

.fx-scrollcue{ animation: fx-bob 2s ease-in-out infinite, fx-cue-pulse 2s ease-in-out infinite; }
@keyframes fx-cue-pulse{
  0%, 100%{ opacity: 0.6; text-shadow: none; }
  50%{ opacity: 1; text-shadow: 0 0 8px rgba(94,234,255,0.6); }
}

@media (prefers-reduced-motion: reduce){
  .fx-milestone__node{ transition: none !important; }
  .fx-contact__btn{ transition: none !important; }
  a.fx-contact__btn:hover{ transform: none !important; }
  .fx-scrollcue{ animation: none !important; }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/remaining-microinteractions.smoke.js`
Expected: `PASS: scroll cue has its new pulse animation applied`

- [ ] **Step 5: Manual visual check**

In a browser, Future mode: hover a timeline node and confirm it brightens with a small tendril; hover a contact button and confirm it lifts with a glow; watch the hero's "scroll" cue and confirm it pulses in brightness, not just bobs.

- [ ] **Step 6: Run the full smoke suite once, end to end**

Run:
```bash
node tests/assets.smoke.js && node tests/nebula-parallax.smoke.js && node tests/drift-silhouettes.smoke.js && node tests/warp-entrance.smoke.js && node tests/about-reveal.smoke.js && node tests/timeline-pings.smoke.js && node tests/projects-warp.smoke.js && node tests/contact-lockon.smoke.js && node tests/nav-toggle-microinteractions.smoke.js && node tests/remaining-microinteractions.smoke.js
```
Expected: every test prints a `PASS:` line, nothing prints `FAIL:`.

- [ ] **Step 7: Commit**

```bash
git add styles.css tests/remaining-microinteractions.smoke.js
git commit -m "Add timeline node, contact button, and scroll-cue micro-interactions"
```

- [ ] **Step 8: Push and confirm the live site deploys cleanly**

Run: `git push`
Then check the Pages deploy succeeds (e.g. `curl -s "https://api.github.com/repos/kanematthews/portfolio/actions/runs?per_page=1"` and look for `"conclusion": "success"`), and finally load `https://kanematthews.github.io/portfolio/` in a browser, select Future mode, and do one last end-to-end pass through every section.
