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
