# @your-platform/server

Server-side A/B testing SDK for Node.js (18+). Zero runtime dependencies.

## Installation

```bash
npm install @your-platform/server
```

## Quick Start

```typescript
import { ABTestingServer } from '@your-platform/server'

const ab = new ABTestingServer({
  serverKey: process.env.AB_SERVER_KEY!,
  apiHost: 'https://your-platform.com'
})

await ab.connect()
```

## API

### `new ABTestingServer(config)`

| Option | Type | Default | Description |
|---|---|---|---|
| `serverKey` | `string` | *required* | Your server API key |
| `apiHost` | `string` | *required* | Platform API base URL |
| `pollInterval` | `number` | `30` | Config polling interval in seconds |
| `flushInterval` | `number` | `5` | Event flush interval in seconds |
| `maxQueueSize` | `number` | `100` | Max queued events before auto-flush |

### `connect(): Promise<void>`

Fetches experiment configs from the platform, starts background polling and event flushing. Retries 3 times on failure. Never throws — resolves even if the API is unreachable.

### `getVariant(options): string`

Synchronous, zero-I/O variant assignment. Automatically queues an exposure event.

| Option | Type | Description |
|---|---|---|
| `experimentId` | `string` | Experiment UUID |
| `userId` | `string?` | User identifier |
| `sessionId` | `string?` | Session identifier (fallback if no userId) |
| `fallback` | `string` | Value returned if experiment is unavailable |

Returns the variant name string, or `fallback` if the experiment is missing, not running, or no identifier is provided.

### `track(options): void`

Queues a conversion event. Returns immediately with no I/O.

| Option | Type | Description |
|---|---|---|
| `experimentId` | `string` | Experiment UUID |
| `userId` | `string?` | User identifier |
| `sessionId` | `string?` | Session identifier |
| `goalName` | `string` | Conversion goal name |
| `goalValue` | `number?` | Optional numeric value |
| `metadata` | `Record<string, unknown>?` | Optional metadata |

### `close(): Promise<void>`

Stops all background intervals and flushes remaining events. Resolves when flush completes or after a 5-second timeout.

## Examples

### Express

```typescript
import express from 'express'
import { ABTestingServer } from '@your-platform/server'

const app = express()
const ab = new ABTestingServer({
  serverKey: process.env.AB_SERVER_KEY!,
  apiHost: 'https://your-platform.com'
})
await ab.connect()

process.on('SIGTERM', async () => {
  await ab.close()
  process.exit(0)
})

app.get('/checkout', (req, res) => {
  const variant = ab.getVariant({
    experimentId: 'your-experiment-uuid',
    userId: req.user.id,
    fallback: 'control'
  })
  res.render('checkout', { ctaVariant: variant })
})

app.post('/purchase', (req, res) => {
  ab.track({
    experimentId: 'your-experiment-uuid',
    userId: req.user.id,
    goalName: 'purchase',
    goalValue: req.body.total
  })
  res.json({ ok: true })
})

app.listen(3000)
```

### Next.js Middleware

```typescript
// lib/ab.ts
import { ABTestingServer } from '@your-platform/server'

export const ab = new ABTestingServer({
  serverKey: process.env.AB_SERVER_KEY!,
  apiHost: 'https://your-platform.com'
})
```

```typescript
// middleware.ts
import { ab } from './lib/ab'
import { NextResponse } from 'next/server'

let ready = false

export async function middleware(request: Request) {
  if (!ready) { await ab.connect(); ready = true }

  const userId = request.cookies.get('userId')?.value
  const variant = ab.getVariant({
    experimentId: 'your-experiment-uuid',
    userId,
    fallback: 'control'
  })

  const res = NextResponse.next()
  res.headers.set('x-ab-variant', variant)
  return res
}
```
