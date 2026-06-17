const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('file:///C:/Users/cool_/Desktop/Portfolio/index.html');
  await page.waitForTimeout(1700);
  await page.fill('#bootInput', 'future');
  await page.press('#bootInput', 'Enter');

  // initBootGate delays calling enterSite() by 550ms after Enter (pre-existing
  // behavior, unrelated to this task), so the warp burst doesn't start until
  // then. Sample partway through the 700ms burst, not immediately after Enter.
  await page.waitForTimeout(700);
  const duringClass = await page.locator('.fx-warp').getAttribute('class');
  if (!duringClass || !duringClass.includes('is-warping')) {
    console.error('FAIL: expected .fx-warp to have is-warping shortly after entering future mode, got class="' + duringClass + '"');
    process.exit(1);
  }

  await page.waitForTimeout(700);
  const afterClass = await page.locator('.fx-warp').getAttribute('class');
  if (afterClass.includes('is-warping')) {
    console.error('FAIL: expected is-warping to be removed after the burst, still present');
    process.exit(1);
  }

  console.log('PASS: warp-launch burst plays once on entering Future mode and then clears');
  await browser.close();
})();
