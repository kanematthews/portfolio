# Future Mode Space Overhaul — Design

## Goal

Significantly upgrade the "Future" theme of the portfolio (`data-theme="future"`) with more impressive, varied, and cohesive sci-fi/space visuals and transitions — hero entrance, section-to-section reveals, background ambiance, and micro-interactions — while keeping the CLI theme untouched, staying performant, and remaining accessible (`prefers-reduced-motion`) and mobile-friendly.

Tone target: **bold sci-fi, still professional** — this is a job-seeking developer's portfolio. Space/rocket/alien motifs appear as sleek silhouettes, glows, and subtle easter-egg details, not literal cartoon illustrations.

## Scope

- Future theme only. CLI theme (`data-theme="cli"`) is unaffected.
- No new build tooling or JS dependencies. Plain CSS/canvas/vanilla JS, consistent with the current `script.js`/`styles.css` structure.
- No change to the GitHub Pages deploy pipeline (no compile step today; none introduced).
- A handful of new generated images via the existing `generate-image.js` (Pollinations.ai) pipeline, stored in `assets/`.

## A. Architecture & file organization

- New JS init functions follow the existing pattern in `script.js` (e.g. `initRain`, `initStars`, `initParticles`): `initParallax`, `initSectionReveals`, `initHeroLaunch`, `initMicroInteractions`. All wired into `initMainSite()`, all gated by `currentTheme() === 'future'` and the existing `reduceMotion` flag, same as current effects.
- `initSectionReveals` extends/replaces the current generic `.reveal` + `IntersectionObserver` logic in `initReveals()` to support per-section animation variants (see section C) rather than one shared fade-up.
- `styles.css` gets a new block appended after the existing `FUTURE THEME` section, clearly commented (e.g. `/* FUTURE THEME — ENHANCED: space overhaul */`), rather than interleaved into existing rules — keeps the diff reviewable and existing rules undisturbed.
- New generated images live in `assets/`, referenced via CSS `background-image` or `<img>`. Images below the fold get `loading="lazy"`.
- `playwright` / `gifenc` / `openai` / `generate-image.js` / `makegif.js` remain dev-only tooling, not shipped to the page — no change to that boundary.

## B. Background "space journey" system

Replaces the current single flat starfield + blurred CSS-blob mesh with a multi-depth parallax backdrop running continuously behind every Future-mode section, so scrolling reads as flying through space rather than separate static scenes.

- **Layer 1 (farthest):** existing `initStars` twinkling starfield canvas — unchanged.
- **Layer 2 (mid):** new generated nebula/cloud texture (`nebula-backdrop.png`), `position: fixed`, drifting slowly via CSS transform. Replaces the current `fx-mesh` blurred color blobs with actual texture.
- **Layer 3 (near):** existing particle constellation canvas (`initParticles`) and existing UFO drift (`fx-ufo`) — unchanged, already read as "near."
- **Scroll-linked depth:** layers 2 and 3 (mesh/nebula and particles) shift vertically at different rates as the user scrolls — cheap `translateY` offset driven by scroll position, read once per frame via `requestAnimationFrame` and a passive scroll listener (matching the rAF loop style already used by `initStars`/`initParticles`), not per-scroll-event layout reads.
- **Occasional silhouettes:** a distant planet (`planet-silhouette.png`, small, low-opacity) and a rocket (`rocket-silhouette.png`) drift past at long random intervals, using the same drift/timing pattern as the existing `fx-ufo` (`@keyframes fx-ufo-drift`), appearing once or twice per scroll-through rather than continuously.
- All parallax/drift effects are added to the existing `@media (prefers-reduced-motion: reduce)` block — frozen/hidden under reduced motion, same as current effects.

## C. Hero entrance + section signature reveals

Each transition is a variation on a shared visual language already present in the codebase (glow, scan, ping, streak) so the result feels like one designed system.

- **Hero entrance ("launch sequence"):** when `future` is chosen at the boot gate, `enterSite('future')` triggers a brief warp-streak burst (radiating light lines from center, ~600-800ms, canvas or CSS) before settling into the existing orbit/globe hero. CLI mode's `enterSite('cli')` is unchanged.
- **About → "hologram materialize":** the existing `.fx-hologram__scan` sweep effect extends to the whole `.fx-about` section reveal — content resolves in with a scanline sweep + brief chromatic-edge flicker, replacing the current flat slide-up for this section specifically.
- **Timeline → "orbital trail lock-on":** the existing `.fx-timeline__line::after` fill-on-scroll animation gets a payoff per node — each `.fx-milestone__node` fires a brief radar-ping (reusing the `fx-contact__ping`/`@keyframes fx-ping` pattern) as the line's fill reaches it, instead of nodes being static dots.
- **Projects → "warp-in cards":** `.fx-card` entrance changes from uniform fade-up to a staggered streak-in (slight depth/blur transition per card, staggered delay) to simulate arriving from the starfield.
- **Contact → "lock-on":** `.fx-contact__radar` sweep gets a payoff — on scroll-into-view, one fast "targeting" rotation plays, then `.fx-contact__btn` elements snap into place with a brief targeting-reticle flash.
- All driven by the existing `IntersectionObserver`/`.reveal` triggering pattern (extended per section, see Architecture), and all respect `reduceMotion`.

## D. Micro-interactions polish

Extends the existing card tilt+glow treatment (`initTilt`, `.fx-card:hover`) site-wide for consistent feedback:

- **Nav links (`.fx-nav__links a`):** add a self-drawing underline-glow trace on hover (fast, `f-cyan`-toned, consistent with existing glow language) instead of the current flat color change.
- **Theme toggle (`.theme-toggle`):** brief pulse/ring-ping on click, reusing the `@keyframes fx-ping` language.
- **Timeline nodes (`.fx-milestone__node`):** brighten + show a small connecting tendril on hover as decorative affordance (not a link).
- **Contact buttons (`.fx-contact__btn`):** add magnetic-hover lift (`translateY` + shadow bloom) consistent with `.fx-card` hover, in addition to the existing ping.
- **Scroll cue (`.fx-scrollcue`):** subtle glow pulse synced with the existing `.fx-wave` bar animation timing, instead of being a static label.
- All implemented via CSS `:hover`/`:focus-visible` plus the existing JS event-listener pattern (`initTilt`-style) — no new event architecture.

## E. Generated asset plan

Produced via the existing `generate-image.js` (Pollinations.ai, no API key required) into `assets/`:

| Asset | Purpose | Notes |
|---|---|---|
| `nebula-backdrop.png` | Parallax Layer 2 texture | Dark, soft cyan/magenta/violet nebula clouds; wide aspect; low detail in center so text stays readable over it |
| `planet-silhouette.png` | Distant drifting planet | Small, low-opacity ringed planet, transparent background |
| `rocket-silhouette.png` | Drifting rocket accent | Sleek minimal silhouette with engine glow, transparent background; used sparingly (e.g. once near hero or contact) |
| `alien-motif.png` | Subtle easter-egg detail | Abstract glyph/emblem, not a literal cartoon alien (per "professional but bold" tone); candidate placement: hologram panel or footer corner |

Each requested at a size matching its CSS usage (no oversized downloads). If a first prompt pass doesn't fit the `f-cyan`/`f-magenta`/`f-violet`-on-dark palette, generate prompt variations and review before committing.

`makegif.js` is not used in this round — its Playwright+frame-capture approach is slower than live CSS/canvas for these effects, and a baked GIF would be lower quality than the real animation. It remains available for future use (e.g. an exportable shareable loop).

## F. Performance, accessibility & mobile

- Every new effect (parallax, warp-in, scan sweeps, pings, drifting silhouettes) is added to the existing `@media (prefers-reduced-motion: reduce)` block, following current conventions exactly.
- Scroll-linked parallax uses `requestAnimationFrame` + a passive scroll listener, matching the rAF-loop style already used by `initStars`/`initParticles` — no per-scroll-event layout thrashing.
- Drifting planet/rocket silhouettes and the nebula layer get reduced opacity/size or are hidden under the existing `@media (max-width: 760px)` block, the same place the UFO and radar are already scaled down for mobile.
- Generated PNGs are kept small (decorative, not hero content) and use `loading="lazy"` where below the fold.
- No new dependencies, no build step — ships as plain CSS/JS/images; no risk to the existing GitHub Pages Actions deploy.

## Out of scope

- CLI theme changes.
- New sections or content changes (this is visual/motion only).
- Any new npm dependency or build step.
- Animated GIF assets (deferred; `makegif.js` available later if wanted).
