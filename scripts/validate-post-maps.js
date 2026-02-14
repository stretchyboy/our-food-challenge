const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'src', 'posts');
const riskyIsoCodes = new Set([
  'CK',
  'NU',
  'TV',
  'TO',
  'WS',
  'MV',
  'VC',
  'GD',
  'KM',
  'TT',
  'MC'
]);

const postFiles = fs
  .readdirSync(postsDir)
  .filter((name) => name.endsWith('.md'));

let warningCount = 0;

for (const fileName of postFiles) {
  const filePath = path.join(postsDir, fileName);
  const content = fs.readFileSync(filePath, 'utf8');

  const isoMatch = content.match(/^iso:\s*([A-Za-z]{2})\s*$/m);
  if (!isoMatch) {
    console.warn(`[map-check] WARNING: Missing ISO code in ${fileName}`);
    warningCount += 1;
    continue;
  }

  const iso = isoMatch[1].toUpperCase();
  const hasMapFocus = /^mapFocus:\s*$/m.test(content);
  const titleMatch = content.match(/^title:\s*(.+)\s*$/m);
  const title = titleMatch ? titleMatch[1].trim() : fileName.replace('.md', '');

  if (riskyIsoCodes.has(iso) && !hasMapFocus) {
    console.warn(
      `[map-check] WARNING: ${fileName} (${iso}) likely needs mapFocus coords for reliable rendering.`
    );
    const mapsQuery = encodeURIComponent(`${title} coordinates`);
    console.warn(`[map-check] Find coords: https://www.google.com/maps/search/?api=1&query=${mapsQuery}`);
    console.warn('[map-check] Add this to front matter:');
    console.warn('mapFocus:');
    console.warn('  coords: [LATITUDE, LONGITUDE]');
    console.warn('  scale: 3.2');
    warningCount += 1;
  }
}

if (warningCount > 0) {
  console.warn(`[map-check] Completed with ${warningCount} warning(s). Build will continue.`);
} else {
  console.log('[map-check] Post map metadata validation passed.');
}
