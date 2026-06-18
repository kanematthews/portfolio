async function openFutureMode(page, url = 'file:///C:/Users/cool_/Desktop/Portfolio/index.html') {
  await page.goto(url);
  await page.waitForTimeout(1700);
  await page.fill('#bootInput', 'future');
  await page.press('#bootInput', 'Enter');
  await page.waitForTimeout(1200);
}

module.exports = { openFutureMode };
