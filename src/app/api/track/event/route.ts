import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { checkSessionRateLimit } from '@/lib/track-rate-limit'

export const dynamic = 'force-dynamic'

// Casts nötig, weil Prisma-Client in der Sandbox nicht regeneriert wird.
type PrismaTrack = {
  trackView: {
    findUnique: (a: unknown) => Promise<{ id: string; activeSeconds?: number } | null>
    update: (a: unknown) => Promise<unknown>
  }
  trackEvent: {
    create: (a: unknown) => Promise<unknown>
  }
}
const trackDb = prisma as unknown as PrismaTrack

const ALLOWED_TYPES = new Set([
  'section_view',
  'link_click',
  'video_play',
  'video_progress',
  'heartbeat',
  'view_close',
])

// POST /api/track/event
// Loggt einen Event zu einer bestehenden View.
//
// Body: { viewId: string, type: string, payload?: object, sessionId?: string }
// Response: { ok: true }
//
// Bei type === 'heartbeat' wird zusätzlich view.activeSeconds += payload.activeSeconds erhöht.
// sessionId ist optional, dient nur dem Rate-Limit.
export async function POST(req: NextRequest) {
  let body: {
    viewId?: string
    type?: string
    payload?: Record<string, unknown>
    sessionId?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const viewId = body.viewId
  const type = body.type
  const payload = body.payload || {}

  if (!viewId || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: 'Unknown event type' }, { status: 400 })
  }

  // Rate-Limit pro sessionId, wenn übergeben.
  if (body.sessionId) {
    const rl = checkSessionRateLimit(body.sessionId)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }
  }

  // View existiert?
  const view = await trackDb.trackView.findUnique({
    where: { id: viewId },
    select: { id: true, activeSeconds: true },
  })
  if (!view) {
    return NextResponse.json({ error: 'View not found' }, { status: 404 })
  }

  // Event + lastEventAt + ggf. activeSeconds atomar updaten.
  const now = new Date()

  await trackDb.trackEvent.create({
    data: {
      viewId,
      type,
      payload: payload as Prisma.InputJsonValue,
      at: now,
    },
  })

  if (type === 'heartbeat') {
    const delta = Number(payload.activeSeconds) || 0
    const safeDelta = delta > 0 && delta <= 120 ? delta : 30
    await trackDb.trackView.update({
      where: { id: viewId },
      data: {
        lastEventAt: now,
        activeSeconds: { increment: safeDelta },
      },
    })
  } else if (type === 'view_close') {
    const total = Number(payload.totalActiveSeconds) || 0
    const current = view.activeSeconds || 0
    // Bei mehreren view_close-Events (kommt auf iOS gern vor) nehmen wir
    // immer das Maximum, damit eine spätere 0 keine bereits gemessene Zeit
    // überschreibt.
    const next = Math.max(current, total)
    if (next > current) {
      await trackDb.trackView.update({
        where: { id: viewId },
        data: {
          lastEventAt: now,
          activeSeconds: next,
        },
      })
    } else {
      await trackDb.trackView.update({
        where: { id: viewId },
        data: { lastEventAt: now },
      })
    }
  } else {
    await trackDb.trackView.update({
      where: { id: viewId },
      data: { lastEventAt: now },
    })
  }

  return NextResponse.json({ ok: true })
}
