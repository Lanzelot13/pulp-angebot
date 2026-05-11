import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// POST /api/admin/offers/:id/archive — Archive an offer (soft delete)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const offer = await prisma.offer.update({
      where: { id: params.id },
      data: { archivedAt: new Date() } as unknown as Record<string, unknown>,
    })
    return NextResponse.json(offer)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Archivieren fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
