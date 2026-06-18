const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.route('https://trello.com/b/90XXxsX8.json**', route => {
    route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
  });

  await openFutureMode(page, 'file:///C:/Users/cool_/Desktop/Portfolio/status.html');
  await page.waitForSelector('#statusError:not([hidden])');

  const errorText = await page.locator('#statusError').textContent();
  if (!/couldn't load board/i.test(errorText)) {
    console.error('FAIL: expected error message about failing to load the board, got', errorText);
    process.exit(1);
  }

  console.log('PASS: status page shows an error message when the Trello fetch fails');
  await browser.close();
})();
