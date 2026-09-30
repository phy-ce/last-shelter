// Dev server for the smoke test on :8123. Uses Vite so npm imports (pixi.js, gsap) resolve like `npm run dev`.
import { createServer } from 'vite'
import { resolve } from 'node:path'

const server = await createServer({
  root: resolve(import.meta.dirname, '../..'),
  server: { port: 8123, strictPort: true },
  logLevel: 'warn',
})
await server.listen()
console.log('serving on 8123')
