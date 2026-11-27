// Demo server: serves the built app (dist/) and the mock API from one process.
// Used for the public demo only. Real deployments use the Django backend instead.
import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleMockApi } from '../vite.mock.ts'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)), 'dist')
const PORT = Number(process.env.PORT ?? 8080)

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

async function serveFile(res: ServerResponse, file: string): Promise<void> {
  const body = await readFile(file)
  res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream')
  // Hashed build files can be cached for a long time; the page itself must not be.
  res.setHeader(
    'Cache-Control',
    file.includes(`${join(ROOT, 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  )
  res.end(body)
}

createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost')

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      req.url = url.pathname.slice('/api'.length) + url.search
      await handleMockApi(req, res)
      return
    }

    // Static files, with a fallback to index.html so client-side routes (for example /orders) work.
    const requested = normalize(join(ROOT, decodeURIComponent(url.pathname)))
    if (!requested.startsWith(ROOT)) {
      res.statusCode = 403
      res.end('Forbidden')
      return
    }
    const isFile = await stat(requested).then((s) => s.isFile()).catch(() => false)
    await serveFile(res, isFile ? requested : join(ROOT, 'index.html'))
  } catch {
    res.statusCode = 500
    res.end('Server error')
  }
}).listen(PORT, () => {
  console.log(`Demo running on port ${PORT}`)
})
