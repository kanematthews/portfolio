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
