import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const ref = await prisma.reference.update({
    where: { id: params.id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.url !== undefined && { url: body.url || null }),
      ...(body.tags && { tags: body.tags }),
      ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
  })
  return NextResponse.json(ref)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  await prisma.reference.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
