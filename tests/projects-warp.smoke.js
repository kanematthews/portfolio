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
