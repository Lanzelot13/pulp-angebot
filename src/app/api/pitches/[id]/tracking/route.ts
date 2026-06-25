import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface TrackViewRow {
  id: string
  targetType: string
  targetId: string
  targetSlug: string
  sessionId: string
  openedAt: Date
  lastEventAt: Date
  activeSeconds: number
  targetStatus: string | null
  country: string | null
  region: string | null
  device: string | null
  referrer: string | null
  _count?: { events: number }
  events?: Array<{ id: string; viewId: string; type: string; payload: unknown; at: Date }>
}

const trackDb = prisma as unknown as {
  trackView: {
    findMany: (a: unknown) => Promise<TrackViewRow[]>
    findUnique: (a: unknown) => Promise<TrackViewRow | null>
  }
}

// GET /api/pitches/:id/tracking
// Bearer-Key oder editToken-Query.
// Liefert Stats + Sessions-Liste, oder bei ?viewId= die Events einer Session.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const url = new URL(request.url)
  const editToken = url.searchParams.get('edit')

  let authenticated = false
  if (editToken) {
    const pitch = await prisma.pitch.findUnique({ where: { id: params.id } })
    if (pitch && pitch.editToken === editToken) authenticated = true
  }
  if (!authenticated) {
    const authErr = requireApiKey(request)
    if (authErr) return authErr
  }

  const pitch = await prisma.pitch.findUnique({
    where: { id: params.id },
    select: { id: true, slug: true, clientCompany: true, occasion: true, status: true },
  })
  if (!pitch) {
    return NextResponse.json({ error: 'Pitch nicht gefunden' }, { status: 404 })
  }

  const viewIdFilter = url.searchParams.get('viewId')
  if (viewIdFilter) {
    const view = await trackDb.trackView.findUnique({
      where: { id: viewIdFilter },
      include: { events: { orderBy: { at: 'asc' }, take: 1000 } },
    })
    if (!view || view.targetType !== 'PITCH' || view.targetId !== pitch.id) {
      return NextResponse.json({ error: 'View nicht gefunden' }, { status: 404 })
    }
    return NextResponse.json({ view })
  }

  const views = await trackDb.trackView.findMany({
    where: { targetType: 'PITCH', targetId: pitch.id },
    orderBy: { openedAt: 'desc' },
    include: { _count: { select: { events: true } } },
  })

  const totalActiveSeconds = views.reduce((s: number, v: TrackViewRow) => s + (v.activeSeconds || 0), 0)
  const uniqueDays = new Set(views.map((v: TrackViewRow) => v.openedAt.toISOString().slice(0, 10))).size
  const lastEventAt = views.reduce<Date | null>(
    (latest, v: TrackViewRow) => (!latest || v.lastEventAt > latest ? v.lastEventAt : latest),
    null
  )
  const statusBreakdown: Record<string, number> = {}
  for (const v of views) {
    const k = v.targetStatus || 'UNKNOWN'
    statusBreakdown[k] = (statusBreakdown[k] || 0) + 1
  }

  return NextResponse.json({
    pitch,
    stats: {
      sessionCount: views.length,
      uniqueDays,
      totalActiveSeconds,
      lastEventAt,
      totalEvents: views.reduce((s, v: TrackViewRow) => s + (v._count?.events || 0), 0),
    },
    statusBreakdown,
    sessions: views.map((v: TrackViewRow) => ({
      id: v.id,
      openedAt: v.openedAt,
      lastEventAt: v.lastEventAt,
      activeSeconds: v.activeSeconds,
      targetStatus: v.targetStatus,
      country: v.country,
      region: v.region,
      device: v.device,
      referrer: v.referrer,
      eventCount: v._count?.events || 0,
    })),
  })
}
