const { chromium } = require('playwright');
const { openFutureMode } = require('./smoke-helpers');

const FIXTURE_1 = {
  lists: [{ id: 'l1', name: 'To Do', pos: 1 }],
  cards: [{ id: 'c1', name: 'Build the thing', idList: 'l1', pos: 1 }]
};
const FIXTURE_2 = {
  lists: [{ id: 'l1', name: 'To Do', pos: 1 }],
  cards: [
    { id: 'c1', name: 'Build the thing', idList: 'l1', pos: 1 },
    { id: 'c2', name: 'Ship it', idList: 'l1', pos: 2 }
  ]
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  let callCount = 0;
  await page.route('https://trello.com/b/90XXxsX8.json**', route => {
    callCount++;
    const body = callCount === 1 ? FIXTURE_1 : FIXTURE_2;
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.addInitScript(() => { window.__STATUS_POLL_MS__ = 1500; });

  await openFutureMode(page, 'file:///C:/Users/cool_/Desktop/Portfolio/status.html');

  await page.waitForSelector('.status-card');
  const firstCards = await page.locator('.status-card').allTextContents();
  if (firstCards.join(',') !== 'Build the thing') {
    console.error('FAIL: expected initial fetch to render "Build the thing", got', firstCards.join(','));
    process.exit(1);
  }

  await page.waitForTimeout(1800);
  const secondCards = await page.locator('.status-card').allTextContents();
  if (secondCards.join(',') !== 'Build the thing,Ship it') {
    console.error('FAIL: expected poll to re-render with "Ship it" added, got', secondCards.join(','));
    process.exit(1);
  }
  if (callCount < 2) {
    console.error('FAIL: expected at least 2 fetches (initial + poll), got', callCount);
    process.exit(1);
  }

  const updatedText = await page.locator('#statusUpdated').textContent();
  if (!/updated/i.test(updatedText)) {
    console.error('FAIL: expected last-updated text to mention "updated", got', updatedText);
    process.exit(1);
  }

  console.log('PASS: status page fetches Trello data, polls for updates, and shows last-updated text');
  await browser.close();
})();
