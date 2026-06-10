import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Casts nötig, weil Prisma-Client in der Sandbox nicht regeneriert wird.
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
  userAgent: string | null
  _count?: { events: number }
  events?: TrackEventRow[]
}

interface TrackEventRow {
  id: string
  viewId: string
  type: string
  payload: Record<string, unknown> | null
  at: Date
}

interface PrismaTrack {
  trackView: {
    findMany: (a: unknown) => Promise<TrackViewRow[]>
    findUnique: (a: unknown) => Promise<TrackViewRow | null>
  }
  trackEvent: {
    findMany: (a: unknown) => Promise<TrackEventRow[]>
  }
}

const trackDb = prisma as unknown as PrismaTrack

// GET /api/offers/[id]/tracking
//
// Skill-Variante des Tracking-Endpoints (Bearer ODER edit-Token), damit der
// angebot-Skill direkt im Chat Fragen wie "Hat der Kunde geschaut?" beantworten
// kann, ohne ins Backend zu wechseln.
//
// - Standard: Header-Stats, Status-Breakdown, Session-Liste
// - Mit ?viewId=...: Drill-Down auf die Events einer einzelnen Session
//
// Auth: Bearer API-Key ODER ?edit=<editToken>
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const offerId = params.id
  const { searchParams } = new URL(request.url)
  const editToken = searchParams.get('edit')
  const viewIdFilter = searchParams.get('viewId')

  // Auth: Bearer-Key ODER passender editToken
  let offer
  if (editToken) {
    offer = await prisma.offer.findFirst({
      where: { id: offerId, editToken },
      select: {
        id: true,
        slug: true,
        projectName: true,
        clientCompany: true,
        status: true,
      },
    })
    if (!offer) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }
  } else {
    const authError = requireApiKey(request)
    if (authError) return authError
    offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        slug: true,
        projectName: true,
        clientCompany: true,
        status: true,
      },
    })
    if (!offer) {
      return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 })
    }
  }

  // Drill-Down: Events einer einzelnen View
  if (viewIdFilter) {
    const view = await trackDb.trackView.findUnique({
      where: { id: viewIdFilter },
      include: {
        events: {
          orderBy: { at: 'asc' },
          take: 1000,
        },
      },
    })
    if (!view || view.targetType !== 'OFFER' || view.targetId !== offerId) {
      return NextResponse.json({ error: 'View nicht gefunden' }, { status: 404 })
    }
    return NextResponse.json({ view })
  }

  // Übersicht — nach lastEventAt sortiert, damit zuletzt aktive Sessions
  // oben stehen (Sessions können durch wiederkehrende Ansichten upgedatet werden).
  const views = await trackDb.trackView.findMany({
    where: { targetType: 'OFFER', targetId: offerId },
    orderBy: { lastEventAt: 'desc' },
    include: {
      _count: { select: { events: true } },
    },
  })

  // Sections pro View deduped
  const sessionEvents = views.length
    ? await trackDb.trackEvent.findMany({
        where: { viewId: { in: views.map((v) => v.id) }, type: 'section_view' },
        select: { viewId: true, payload: true },
      })
    : []

  const sectionsByView = new Map<string, Set<string>>()
  for (const ev of sessionEvents) {
    const sid = (ev.payload as { sectionId?: string } | null)?.sectionId
    if (!sid) continue
    let set = sectionsByView.get(ev.viewId)
    if (!set) {
      set = new Set<string>()
      sectionsByView.set(ev.viewId, set)
    }
    set.add(sid)
  }

  const totalActiveSeconds = views.reduce(
    (sum, v) => sum + (v.activeSeconds || 0),
    0
  )
  const uniqueDays = new Set(
    views.map((v) => v.openedAt.toISOString().slice(0, 10))
  ).size
  const lastEventAt = views.reduce<Date | null>(
    (latest, v) => (!latest || v.lastEventAt > latest ? v.lastEventAt : latest),
    null
  )

  const statusBreakdown: Record<string, number> = {}
  for (const v of views) {
    const key = v.targetStatus || 'UNKNOWN'
    statusBreakdown[key] = (statusBreakdown[key] || 0) + 1
  }

  const sessions = views.map((v) => ({
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
    sectionsSeen: sectionsByView.get(v.id)?.size || 0,
  }))

  const totalSectionsSeen = sessions.reduce((sum, s) => sum + s.sectionsSeen, 0)
  const totalEvents = sessions.reduce((sum, s) => sum + s.eventCount, 0)

  return NextResponse.json({
    offer,
    stats: {
      sessionCount: views.length,
      uniqueDays,
      totalActiveSeconds,
      lastEventAt,
      totalSectionsSeen,
      totalEvents,
    },
    statusBreakdown,
    sessions,
  })
}
