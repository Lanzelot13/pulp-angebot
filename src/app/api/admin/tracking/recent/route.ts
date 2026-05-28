import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// Casts nötig, weil Prisma-Client in der Sandbox nicht regeneriert wird.
interface TrackViewRow {
  id: string
  targetType: string
  targetId: string
  targetSlug: string
  openedAt: Date
  lastEventAt: Date
  activeSeconds: number
  targetStatus: string | null
  country: string | null
  region: string | null
  device: string | null
  _count?: { events: number }
}

interface PrismaTrack {
  trackView: {
    findMany: (a: unknown) => Promise<TrackViewRow[]>
  }
  trackEvent: {
    findMany: (a: unknown) => Promise<Array<{ viewId: string; payload: Record<string, unknown> | null }>>
  }
}

const trackDb = prisma as unknown as PrismaTrack

// GET /api/admin/tracking/recent?limit=10
//
// Liefert die letzten N Aufrufe (TrackViews) über alle Offers hinweg,
// mit aufgelöstem Offer (id, slug, projectName, clientCompany).
// Für den Dashboard-Block "Letzte Aufrufe".
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { searchParams } = new URL(request.url)
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit')) || 10))

  // Nur Offer-Views (Pitch lassen wir aus, könnten später dazukommen)
  const views = await trackDb.trackView.findMany({
    where: { targetType: 'OFFER' },
    orderBy: { openedAt: 'desc' },
    take: limit,
    include: {
      _count: { select: { events: true } },
    },
  })

  if (views.length === 0) {
    return NextResponse.json({ views: [] })
  }

  // Offers auflösen
  const offerIds = views.map((v) => v.targetId)
  const offers = await prisma.offer.findMany({
    where: { id: { in: offerIds } },
    select: {
      id: true,
      slug: true,
      projectName: true,
      clientCompany: true,
      status: true,
    },
  })
  const offerMap = new Map(offers.map((o) => [o.id, o]))

  // Section-Views pro View deduplizieren
  const sectionEvents = await trackDb.trackEvent.findMany({
    where: { viewId: { in: views.map((v) => v.id) }, type: 'section_view' },
    select: { viewId: true, payload: true },
  })
  const sectionsByView = new Map<string, Set<string>>()
  for (const ev of sectionEvents) {
    const sid = (ev.payload as { sectionId?: string } | null)?.sectionId
    if (!sid) continue
    let set = sectionsByView.get(ev.viewId)
    if (!set) {
      set = new Set<string>()
      sectionsByView.set(ev.viewId, set)
    }
    set.add(sid)
  }

  const result = views.map((v) => {
    const offer = offerMap.get(v.targetId)
    return {
      id: v.id,
      openedAt: v.openedAt,
      activeSeconds: v.activeSeconds,
      targetStatus: v.targetStatus,
      country: v.country,
      region: v.region,
      device: v.device,
      eventCount: v._count?.events || 0,
      sectionsSeen: sectionsByView.get(v.id)?.size || 0,
      offer: offer
        ? {
            id: offer.id,
            slug: offer.slug,
            projectName: offer.projectName,
            clientCompany: offer.clientCompany,
            status: offer.status,
          }
        : null,
    }
  })

  return NextResponse.json({ views: result })
}
