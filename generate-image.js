const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const positional = [];
  let size = '1024x1024';

  for (const arg of argv) {
    if (arg.startsWith('--size=')) {
      size = arg.slice('--size='.length);
    } else {
      positional.push(arg);
    }
  }

  const [prompt, outputFilename] = positional;
  return { prompt, outputFilename, size };
}

(async () => {
  const { prompt, outputFilename, size } = parseArgs(process.argv.slice(2));

  if (!prompt || !outputFilename) {
    console.error('Usage: node generate-image.js "<prompt>" <output-filename> [--size=1024x1024]');
    process.exitCode = 1;
    return;
  }

  const [width, height] = size.split('x').map(Number);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true`;

  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    console.error('Request to Pollinations.ai failed:', err.message);
    process.exitCode = 1;
    return;
  }

  if (!response.ok) {
    console.error(`Pollinations.ai request failed: ${response.status} ${response.statusText}`);
    process.exitCode = 1;
    return;
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  const outDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, outputFilename);
  fs.writeFileSync(outPath, buffer);
  console.log('wrote', outPath, buffer.length, 'bytes');
})();
