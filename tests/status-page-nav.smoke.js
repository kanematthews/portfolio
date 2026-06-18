const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await openFutureMode(page, 'file:///C:/Users/cool_/Desktop/Portfolio/status.html');

  const navVisible = await page.locator('.fx-nav').isVisible();
  if (!navVisible) {
    console.error('FAIL: expected .fx-nav header to be visible after choosing future mode on status.html');
    process.exit(1);
  }

  const homeHref = await page.locator('.fx-nav__links a', { hasText: 'Home' }).getAttribute('href');
  if (homeHref !== 'index.html') {
    console.error('FAIL: expected Home link on status.html to point to index.html, got', homeHref);
    process.exit(1);
  }

  await openFutureMode(page);
  const statusHref = await page.locator('.fx-nav__links a', { hasText: 'Status' }).getAttribute('href');
  if (statusHref !== 'status.html') {
    console.error('FAIL: expected Status link on index.html to point to status.html, got', statusHref);
    process.exit(1);
  }

  console.log('PASS: status.html boots into future mode with a working Home link, and index.html links to it');
  await browser.close();
})();
