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
