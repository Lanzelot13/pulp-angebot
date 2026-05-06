import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/offers/:id — Update offer (admin-only fields like template)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const data: Record<string, unknown> = {}

  if (body.template !== undefined) data.template = body.template
  if (body.status !== undefined) data.status = body.status

  const offer = await prisma.offer.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(offer)
}
