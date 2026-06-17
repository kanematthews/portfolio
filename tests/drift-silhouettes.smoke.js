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
