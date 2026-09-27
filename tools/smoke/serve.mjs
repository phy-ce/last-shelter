// Minimal static server mirroring Vite's dev layout: /assets/* -> public/assets/*, rest -> project root.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.json': 'application/json' }

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (path === '/') path = '/index.html'
  const file = path.startsWith('/assets/') ? join(root, 'public', path) : join(root, path)
  try {
    const data = await readFile(file)
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' })
    res.end(data)
  } catch {
    res.writeHead(404); res.end('404 ' + path)
  }
}).listen(8123, () => console.log('serving on 8123'))
