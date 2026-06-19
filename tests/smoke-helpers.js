async function openFutureMode(page, url = 'file:///D:/Portfolio/index.html') {
  await page.goto(url);
  await page.waitForTimeout(1700);
  await page.fill('#bootInput', 'future');
  await page.press('#bootInput', 'Enter');
  await page.waitForTimeout(1200);
}

async function openCliMode(page, url = 'file:///D:/Portfolio/index.html') {
  await page.goto(url);
  await page.waitForTimeout(1700);
  await page.fill('#bootInput', 'cli');
  await page.press('#bootInput', 'Enter');
  await page.waitForTimeout(1200);
}

module.exports = { openFutureMode, openCliMode };
