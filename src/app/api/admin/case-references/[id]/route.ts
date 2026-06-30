import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const VALID_PLATFORMS = new Set(['youtube', 'tiktok', 'instagram', 'facebook', 'other'])

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string') data.name = body.name.trim()
  if (typeof body.slug === 'string') data.slug = body.slug.trim()
  if (typeof body.url === 'string') data.url = body.url.trim()
  if (typeof body.platform === 'string' && VALID_PLATFORMS.has(body.platform)) {
    data.platform = body.platform
  }
  if ('description' in body) data.description = body.description?.trim() || null
  if (Array.isArray(body.tags)) data.tags = body.tags
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder
  if (body.archive === true) data.archivedAt = new Date()
  if (body.archive === false) data.archivedAt = null

  try {
    const updated = await prisma.caseReference.update({
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
    await prisma.caseReference.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Löschen fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
