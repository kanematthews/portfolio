const { chromium } = require('playwright');
const { openFutureMode, openCliMode } = require('./smoke-helpers');

const FIXTURE = {
  lists: [{ id: 'l2', name: 'Doing', pos: 2 }, { id: 'l1', name: 'To Do', pos: 1 }],
  cards: [
    { id: 'c2', name: 'Card B', idList: 'l1', pos: 2 },
    { id: 'c1', name: 'Card A', idList: 'l1', pos: 1 },
    { id: 'c3', name: 'Card C', idList: 'l2', pos: 1 }
  ]
};

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.route('https://trello.com/b/90XXxsX8.json**', route => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FIXTURE) });
  });

  await openCliMode(page);
  await page.waitForSelector('.cli-only .project-status .status-card');
  const cliColumns = await page.locator('.cli-only .project-status .status-column__title').allTextContents();
  if (cliColumns.join(',') !== 'To Do,Doing') {
    console.error('FAIL: expected CLI columns To Do,Doing, got', cliColumns.join(','));
    process.exit(1);
  }
  const cliCards = await page.locator('.cli-only .project-status .status-column:first-child .status-card').allTextContents();
  if (cliCards.join(',') !== 'Card A,Card B') {
    console.error('FAIL: expected CLI first column cards Card A,Card B, got', cliCards.join(','));
    process.exit(1);
  }

  await openFutureMode(page);
  await page.waitForSelector('.future-only .project-status .status-card');
  const fxColumns = await page.locator('.future-only .project-status .status-column__title').allTextContents();
  if (fxColumns.join(',') !== 'To Do,Doing') {
    console.error('FAIL: expected Future columns To Do,Doing, got', fxColumns.join(','));
    process.exit(1);
  }
  const fxCards = await page.locator('.future-only .project-status .status-column:first-child .status-card').allTextContents();
  if (fxCards.join(',') !== 'Card A,Card B') {
    console.error('FAIL: expected Future first column cards Card A,Card B, got', fxCards.join(','));
    process.exit(1);
  }

  console.log('PASS: project-status renders correct columns/cards under the Unity Game Project entry in both CLI and Future mode');
  await browser.close();
})();
