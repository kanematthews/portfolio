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
