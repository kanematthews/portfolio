const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///C:/Users/cool_/Desktop/Portfolio/status.html');

  const grouped = await page.evaluate(() => {
    const lists = [{ id: 'l2', name: 'Doing', pos: 2 }, { id: 'l1', name: 'To Do', pos: 1 }];
    const cards = [
      { id: 'c2', name: 'Card B', idList: 'l1', pos: 2 },
      { id: 'c1', name: 'Card A', idList: 'l1', pos: 1 },
      { id: 'c3', name: 'Card C', idList: 'l2', pos: 1 }
    ];
    return groupCardsByList(lists, cards);
  });

  if (grouped.length !== 2 || grouped[0].name !== 'To Do' || grouped[1].name !== 'Doing') {
    console.error('FAIL: expected lists sorted by pos (To Do, Doing), got', JSON.stringify(grouped.map(l => l.name)));
    process.exit(1);
  }
  if (grouped[0].cards.length !== 2 || grouped[0].cards[0].name !== 'Card A' || grouped[0].cards[1].name !== 'Card B') {
    console.error('FAIL: expected To Do cards sorted by pos (Card A, Card B), got', JSON.stringify(grouped[0].cards.map(c => c.name)));
    process.exit(1);
  }
  if (grouped[1].cards.length !== 1 || grouped[1].cards[0].name !== 'Card C') {
    console.error('FAIL: expected Doing to contain Card C, got', JSON.stringify(grouped[1].cards.map(c => c.name)));
    process.exit(1);
  }

  await page.evaluate((lists) => {
    renderColumns(document.getElementById('statusColumns'), lists);
  }, grouped);

  const columnTitles = await page.locator('.status-column__title').allTextContents();
  if (columnTitles.join(',') !== 'To Do,Doing') {
    console.error('FAIL: expected rendered columns To Do,Doing, got', columnTitles.join(','));
    process.exit(1);
  }
  const cardTexts = await page.locator('.status-column:first-child .status-card').allTextContents();
  if (cardTexts.join(',') !== 'Card A,Card B') {
    console.error('FAIL: expected first column cards Card A,Card B, got', cardTexts.join(','));
    process.exit(1);
  }

  const tabClicks = await page.evaluate(() => {
    const calls = [];
    const container = document.getElementById('statusTabs');
    renderTabs(container, [{ label: 'Game Dev' }, { label: 'Other' }], 1, (i) => calls.push(i));
    document.querySelectorAll('.status-tab')[0].click();
    return { calls, html: container.innerHTML };
  });
  if (!tabClicks.html.includes('Game Dev') || !tabClicks.html.includes('Other')) {
    console.error('FAIL: expected both tab labels to render, got', tabClicks.html);
    process.exit(1);
  }
  if (tabClicks.calls.length !== 1 || tabClicks.calls[0] !== 0) {
    console.error('FAIL: expected clicking the first tab to call onSelect(0), got', JSON.stringify(tabClicks.calls));
    process.exit(1);
  }
  const activeClassOnSecondTab = await page.evaluate(() => document.querySelectorAll('.status-tab')[1].classList.contains('is-active'));
  if (!activeClassOnSecondTab) {
    console.error('FAIL: expected the tab at activeIndex 1 to have the is-active class');
    process.exit(1);
  }

  console.log('PASS: groupCardsByList sorts correctly, renderColumns renders columns/cards, renderTabs renders tabs and wires clicks');
  await browser.close();
})();
