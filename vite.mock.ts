import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { createMockResponse, handleMockRequest } from './src/mock/handler.ts'

// Development mock: serves /api from the Vite dev server (see src/mock/handler.ts for the logic).
// Enabled when VITE_MOCK_API=true (see .env.development).

function readText(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString()
    })
    req.on('end', () => resolve(raw))
  })
}

export function mockApi(): Plugin {
  return {
    name: 'tenso-mock-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', async (req: IncomingMessage, res: ServerResponse) => {
        const out = createMockResponse()
        await handleMockRequest(
          {
            method: req.method ?? 'GET',
            url: req.url ?? '/',
            cookie: req.headers.cookie ?? '',
            bodyText: await readText(req),
          },
          out,
        )
        const result = out.result()
        res.statusCode = result.status
        for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value)
        res.end(result.body)
      })
    },
  }
}
