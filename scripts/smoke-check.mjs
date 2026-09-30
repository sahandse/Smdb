import { readFileSync, existsSync } from 'node:fs'

const indexPath = 'dist/index.html'
const runtimePath = 'dist/runtime-fixes.js'

function fail(message) {
  console.error(`SMDB smoke check failed: ${message}`)
  process.exit(1)
}

if (!existsSync(indexPath)) fail('dist/index.html is missing')
if (!existsSync(runtimePath)) fail('dist/runtime-fixes.js is missing')

const html = readFileSync(indexPath, 'utf8')

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
]

for (const marker of requiredMarkers) {
  if (!html.includes(marker)) fail(`missing required marker: ${marker}`)
}

if (!html.includes('</body>') || !html.includes('</html>')) {
  fail('generated HTML is incomplete')
}

const runtime = readFileSync(runtimePath, 'utf8')
if (!runtime.includes('SMDB runtime fixes')) {
  fail('runtime fixes file is not the expected build')
}

console.log('SMDB smoke check passed')
