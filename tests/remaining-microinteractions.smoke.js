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
