import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const source = process.argv[2]
if (!source) throw new Error('usage: node tools/split-demo.mjs <demo.html>')

const root = resolve(import.meta.dirname, '..')
const html = await readFile(source, 'utf8')
const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1]
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
const body = html.match(/<body>([\s\S]*?)<\/body>/)?.[1]
if (!style || !script || !body) throw new Error('demo must contain one inline style, script and body')
const migratedBody = body
  .replace(/<script>[\s\S]*?<\/script>/, '')
  .replace('<button class="button" id="deckButton">덱 D</button>', '<button class="button" id="deckButton">덱 D</button>\n        <button class="button" id="codexButton">도감 C</button>')

await mkdir(resolve(root, 'src/styles'), { recursive: true })
await mkdir(resolve(root, 'src/legacy'), { recursive: true })
await mkdir(resolve(root, 'public/assets/art'), { recursive: true })
await mkdir(resolve(root, 'public/assets/audio'), { recursive: true })

await writeFile(resolve(root, 'src/styles/game.css'), style.trimStart())
await writeFile(resolve(root, 'src/legacy/game.js'), `${script.trimStart()}\n`)
await writeFile(resolve(root, 'index.html'), `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#100e13">
  <title>LAST SHELTER — 육체의 잔향</title>
  <link rel="stylesheet" href="./src/styles/game.css">
</head>
<body>
${migratedBody.trim()}
  <script type="module" src="./src/legacy/game.js"></script>
</body>
</html>
`)
await writeFile(resolve(root, 'README.md'), `# Last Shelter

Single-file demo migration from \`${basename(source)}\`.

## Run

\`npm install\` then \`npm run dev\`.

The first migration checkpoint deliberately preserves gameplay while separating the document,
styles, runtime and asset directories. New work should move code out of \`src/legacy/game.js\`
into the focused modules under \`src/\`.
`)
