import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const VALID_STATUS = new Set(['DRAFT', 'PRICED', 'ACCEPTED', 'DECLINED'])

// GET /api/admin/offers
//   ?archived=false|true|all  (default false)
//   ?search=foo               freitext über clientCompany / clientName / projectName / offerNumber
//   ?contactSlug=paul         filter nach Pulpmedia-Accounter
//   ?status=DRAFT             filter nach Status
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const params = request.nextUrl.searchParams
  const archivedParam = (params.get('archived') || 'false').toLowerCase()
  const search = (params.get('search') || '').trim()
  const contactSlug = (params.get('contactSlug') || '').trim()
  const statusParam = (params.get('status') || '').trim().toUpperCase()

  // Build where clause — loose cast because Prisma client may not yet know archivedAt
  const where: Record<string, unknown> = {}

  if (archivedParam === 'true') {
    where.archivedAt = { not: null }
  } else if (archivedParam === 'all') {
    // no archive filter
  } else {
    where.archivedAt = null
  }

  if (contactSlug) {
    where.contactSlug = contactSlug
  }

  // Status-Filter akzeptiert auch Komma-getrennte Listen, z.B. "DRAFT,PRICED"
  // für den Filter-Tab "Aktiv".
  if (statusParam) {
    const candidates = statusParam
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => VALID_STATUS.has(s))
    if (candidates.length === 1) {
      where.status = candidates[0]
    } else if (candidates.length > 1) {
      where.status = { in: candidates }
    }
  }

  if (search) {
    where.OR = [
      { clientCompany: { contains: search, mode: 'insensitive' } },
      { clientName: { contains: search, mode: 'insensitive' } },
      { projectName: { contains: search, mode: 'insensitive' } },
      { offerNumber: { contains: search, mode: 'insensitive' } },
    ]
  }

  const offers = await prisma.offer.findMany({
    where: where as never,
    include: {
      contact: { select: { name: true } },
      _count: { select: { versions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Aufrufe pro Angebot (TrackView-Count + letzter Zugriff) in einem Query holen.
  // Cast, weil Prisma-Client in der Sandbox nicht regeneriert wird.
  const offerIds = offers.map((o) => o.id)
  const countMap = new Map<string, number>()
  const lastViewMap = new Map<string, Date>()
  if (offerIds.length > 0) {
    try {
      const trackDb = prisma as unknown as {
        trackView: {
          groupBy: (a: unknown) => Promise<
            Array<{
              targetId: string
              _count: { _all: number }
              _max: { lastEventAt: Date | null }
            }>
          >
        }
      }
      const grouped = await trackDb.trackView.groupBy({
        by: ['targetId'],
        where: { targetType: 'OFFER', targetId: { in: offerIds } },
        _count: { _all: true },
        _max: { lastEventAt: true },
      })
      for (const row of grouped) {
        countMap.set(row.targetId, row._count._all)
        if (row._max.lastEventAt) {
          lastViewMap.set(row.targetId, row._max.lastEventAt)
        }
      }
    } catch {
      // Tracking-Tabelle noch nicht da: einfach 0er liefern
    }
  }

  const offersWithCounts = offers.map((o) => ({
    ...o,
    viewCount: countMap.get(o.id) || 0,
    lastViewAt: lastViewMap.get(o.id) || null,
  }))

  return NextResponse.json(offersWithCounts)
}
