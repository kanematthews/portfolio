const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 2 });
  await page.goto('file:///C:/Users/cool_/Desktop/Portfolio/index.html');
  await page.waitForTimeout(1700);
  await page.fill('#bootInput', 'future');
  await page.press('#bootInput', 'Enter');
  await page.waitForTimeout(1200);

  const el = await page.locator('.fx-orbit');
  const box = await el.boundingBox();
  const pad = 30;
  const clip = {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: box.width + pad * 2,
    height: box.height + pad * 2
  };

  const frameCount = 24;
  const frameDelayMs = 80; // 24 * 80ms = ~2s loop, matches ring period reasonably
  const frames = [];

  for (let i = 0; i < frameCount; i++) {
    const buf = await page.screenshot({ clip });
    const png = PNG.sync.read(buf);
    frames.push({ width: png.width, height: png.height, data: png.data });
    await page.waitForTimeout(frameDelayMs);
  }

  await browser.close();

  const gif = GIFEncoder();
  const { width, height } = frames[0];

  for (const frame of frames) {
    const palette = quantize(frame.data, 256, { format: 'rgba4444' });
    const index = applyPalette(frame.data, palette, 'rgba4444');
    gif.writeFrame(index, width, height, { palette, delay: frameDelayMs, transparent: false });
  }
  gif.finish();

  const outDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, 'orbit-loop.gif');
  fs.writeFileSync(outPath, gif.bytes());
  console.log('wrote', outPath, gif.bytes().length, 'bytes');
})();
