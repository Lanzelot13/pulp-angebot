import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/contacts/:slug — Update
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const contact = await prisma.contact.update({
    where: { slug: params.id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.role !== undefined && { role: body.role }),
      ...(body.email !== undefined && { email: body.email }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
    },
  })
  return NextResponse.json(contact)
}

// DELETE /api/admin/contacts/:slug
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  await prisma.contact.delete({ where: { slug: params.id } })
  return NextResponse.json({ ok: true })
}
