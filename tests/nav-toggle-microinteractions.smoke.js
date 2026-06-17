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
