/**
 * Rate-Limit für die /api/track/*-Endpoints.
 *
 * Limitiert wird pro sessionId, nicht pro IP. Das ist DSGVO-konform
 * (keine IP-Speicherung, kein Personenbezug), und gleichzeitig
 * ausreichend gegen versehentliche Endlosschleifen im Client.
 *
 * Hinweis: In-Memory-State funktioniert auf Vercel pro Lambda-Instanz.
 * Bei vielen parallelen Instanzen ist das Limit faktisch je Instanz.
 * Für unseren Use-Case (kleine Zahl an aktiven Sessions) reicht das.
 */

type Bucket = {
  count: number
  resetAt: number
}

const WINDOW_MS = 60_000 // 1 Minute
const MAX_REQUESTS = 60 // 60 Requests pro Minute pro Session
const buckets = new Map<string, Bucket>()

// Sporadisch alte Buckets entfernen, damit die Map nicht endlos wächst.
function gc(now: number) {
  if (buckets.size < 1000) return
  const toDelete: string[] = []
  buckets.forEach((v, k) => {
    if (v.resetAt <= now) toDelete.push(k)
  })
  for (const k of toDelete) buckets.delete(k)
}

export function checkSessionRateLimit(sessionId: string): {
  ok: boolean
  remaining: number
  retryAfter: number
} {
  if (!sessionId) return { ok: true, remaining: MAX_REQUESTS, retryAfter: 0 }

  const now = Date.now()
  gc(now)

  let bucket = buckets.get(sessionId)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS }
    buckets.set(sessionId, bucket)
  }

  bucket.count++
  const remaining = Math.max(0, MAX_REQUESTS - bucket.count)
  const ok = bucket.count <= MAX_REQUESTS
  const retryAfter = ok ? 0 : Math.ceil((bucket.resetAt - now) / 1000)

  return { ok, remaining, retryAfter }
}
