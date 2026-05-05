import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const [offers, contacts, references, channels] = await Promise.all([
    prisma.offer.groupBy({ by: ['status'], _count: true }),
    prisma.contact.count(),
    prisma.reference.count(),
    prisma.channel.count(),
  ])

  const offerTotal = offers.reduce((sum, o) => sum + o._count, 0)
  const statusCounts = Object.fromEntries(
    offers.map((o) => [o.status, o._count])
  )

  return NextResponse.json({
    offers: { total: offerTotal, ...statusCounts },
    contacts,
    references,
    channels,
  })
}
