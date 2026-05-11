import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/offers?archived=false|true|all — List offers with versions count
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const archivedParam = (request.nextUrl.searchParams.get('archived') || 'false').toLowerCase()

  // Build where clause using a loose cast (Prisma client may not yet know archivedAt)
  let where: Record<string, unknown> = {}
  if (archivedParam === 'true') {
    where = { archivedAt: { not: null } }
  } else if (archivedParam === 'all') {
    where = {}
  } else {
    where = { archivedAt: null }
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
