import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/offers — List all offers with versions count
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const offers = await prisma.offer.findMany({
    include: {
      contact: { select: { name: true } },
      _count: { select: { versions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(offers)
}
