const fs = require('fs');
const path = require('path');

const required = [
  'nebula-backdrop.png',
  'planet-silhouette.png',
  'rocket-silhouette.png',
  'alien-motif.png'
];

let failed = false;
for (const name of required) {
  const p = path.join(__dirname, '..', 'assets', name);
  if (!fs.existsSync(p)) {
    console.error('FAIL: missing', p);
    failed = true;
    continue;
  }
  const size = fs.statSync(p).size;
  if (size < 2000) {
    console.error('FAIL: suspiciously small', p, size, 'bytes');
    failed = true;
  } else {
    console.log('PASS:', name, size, 'bytes');
  }
}
process.exit(failed ? 1 : 0);
