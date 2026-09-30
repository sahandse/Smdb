import { readFileSync, existsSync } from 'node:fs'

const requiredFiles = [
  'dist/index.html',
  'dist/runtime-fixes.js',
  'dist/smdb-enhancements.js',
  'dist/manifest.webmanifest',
  'dist/sw.js',
  'dist/smdb-icon.svg',
]

function fail(message) {
  console.error(`SMDB smoke check failed: ${message}`)
  process.exit(1)
}

for (const file of requiredFiles) {
  if (!existsSync(file)) fail(`${file} is missing`)
}

const html = readFileSync('dist/index.html', 'utf8')
const requiredMarkers = [
  '<html lang="fa" dir="rtl">',
  'id="titleInput"',
  'id="videoInput"',
  'id="gallery"',
  'id="webpDropZone"',
  'id="webpFileInput"',
  'id="webpUrlInput"',
  'id="webpResultGrid"',
  'runtime-fixes.js',
  'smdb-enhancements.js',
  'manifest.webmanifest',
]
for (const marker of requiredMarkers) {
  if (!html.includes(marker)) fail(`missing required marker: ${marker}`)
}
if (!html.includes('</body>') || !html.includes('</html>')) fail('generated HTML is incomplete')

const runtime = readFileSync('dist/runtime-fixes.js', 'utf8')
if (!runtime.includes('SMDB runtime fixes')) fail('runtime fixes file is not the expected build')

const enhancements = readFileSync('dist/smdb-enhancements.js', 'utf8')
for (const marker of ['smdbEnhancementTools','smdbBatchBtn','smdbHistory','serviceWorker','WordPress']) {
  if (!enhancements.includes(marker)) fail(`enhancement marker missing: ${marker}`)
}

const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'))
if (manifest.name !== 'SMDB' || manifest.display !== 'standalone') fail('PWA manifest is invalid')

console.log('SMDB smoke check passed')
