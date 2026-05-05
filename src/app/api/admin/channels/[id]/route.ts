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
  const channel = await prisma.channel.update({
    where: { id: params.id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
  })
  return NextResponse.json(channel)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  await prisma.channel.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
