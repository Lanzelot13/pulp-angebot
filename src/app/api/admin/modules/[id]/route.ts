import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { PITCH_MODULE_TYPES, PitchModuleType } from '@/lib/pitch-types'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const moduleRow = await prisma.pitchModule.findUnique({
    where: { id: params.id },
  })
  if (!moduleRow) {
    return NextResponse.json({ error: 'Modul nicht gefunden' }, { status: 404 })
  }
  return NextResponse.json(moduleRow)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const data: Record<string, unknown> = {}

  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description || null
  if (body.content !== undefined) data.content = body.content
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder)
  if (body.type !== undefined) {
    if (!PITCH_MODULE_TYPES.includes(body.type as PitchModuleType)) {
      return NextResponse.json({ error: 'Unbekannter Modul-Typ' }, { status: 400 })
    }
    data.type = body.type
  }
  if (body.archivedAt !== undefined) {
    data.archivedAt = body.archivedAt ? new Date(body.archivedAt) : null
  }

  const moduleRow = await prisma.pitchModule.update({
    where: { id: params.id },
    data,
  })
  return NextResponse.json(moduleRow)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  await prisma.pitchModule.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
