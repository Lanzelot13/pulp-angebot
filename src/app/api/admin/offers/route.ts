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

  if (statusParam && VALID_STATUS.has(statusParam)) {
    where.status = statusParam
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

  return NextResponse.json(offers)
}
