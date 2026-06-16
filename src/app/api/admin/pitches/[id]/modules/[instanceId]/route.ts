import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { parsePitchModules, serializeModules } from '@/lib/pitch-modules'
import { snapshotPitch } from '@/lib/pitch-versions'

export const dynamic = 'force-dynamic'

// PATCH: update content/name/sortOrder of a single module instance within a pitch.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; instanceId: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const pitch = await prisma.pitch.findUnique({ where: { id: params.id } })
  if (!pitch) {
    return NextResponse.json({ error: 'Pitch nicht gefunden' }, { status: 404 })
  }

  const modules = parsePitchModules(pitch.modules)
  const idx = modules.findIndex((m) => m.instanceId === params.instanceId)
  if (idx === -1) {
    return NextResponse.json(
      { error: 'Modul-Instance nicht gefunden' },
      { status: 404 }
    )
  }

  const next = { ...modules[idx] }
  if (body.name !== undefined) next.name = String(body.name)
  if (body.content !== undefined) next.content = body.content
  if (body.sortOrder !== undefined) next.sortOrder = Number(body.sortOrder)
  modules[idx] = next

  await snapshotPitch({ pitchId: params.id, changedBy: 'admin' })
  const updated = await prisma.pitch.update({
    where: { id: params.id },
    data: { modules: serializeModules(modules), version: { increment: 1 } },
  })
  return NextResponse.json(updated)
}

// DELETE: remove a module instance from the pitch.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; instanceId: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const pitch = await prisma.pitch.findUnique({ where: { id: params.id } })
  if (!pitch) {
    return NextResponse.json({ error: 'Pitch nicht gefunden' }, { status: 404 })
  }

  const modules = parsePitchModules(pitch.modules).filter(
    (m) => m.instanceId !== params.instanceId
  )
  await snapshotPitch({ pitchId: params.id, changedBy: 'admin' })
  const updated = await prisma.pitch.update({
    where: { id: params.id },
    data: { modules: serializeModules(modules), version: { increment: 1 } },
  })
  return NextResponse.json(updated)
}
