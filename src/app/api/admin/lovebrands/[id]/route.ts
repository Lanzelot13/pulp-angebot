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
  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') data.name = body.name
  if (typeof body.slug === 'string') data.slug = body.slug
  if (typeof body.logoUrl === 'string') data.logoUrl = body.logoUrl
  if (typeof body.shape === 'string' && ['default', 'badge', 'tall'].includes(body.shape)) {
    data.shape = body.shape
  }
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder
  if (typeof body.invertOnDark === 'boolean') data.invertOnDark = body.invertOnDark
  if (body.archive === true) data.archivedAt = new Date()
  if (body.archive === false) data.archivedAt = null

  try {
    const updated = await prisma.loveBrand.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    await prisma.loveBrand.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Löschen fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
