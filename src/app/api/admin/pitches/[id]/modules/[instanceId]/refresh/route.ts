import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { parsePitchModules, serializeModules } from '@/lib/pitch-modules'
import { snapshotPitch } from '@/lib/pitch-versions'

export const dynamic = 'force-dynamic'

// POST: refresh a module instance's content from its source PitchModule.
// Use this to pull in updates after the global module was edited.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; instanceId: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

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
  const instance = modules[idx]
  if (!instance.moduleId) {
    return NextResponse.json(
      { error: 'Custom-Block kann nicht aktualisiert werden' },
      { status: 400 }
    )
  }

  const moduleRow = await prisma.pitchModule.findUnique({
    where: { id: instance.moduleId },
  })
  if (!moduleRow) {
    return NextResponse.json(
      { error: 'Quell-Modul existiert nicht mehr' },
      { status: 404 }
    )
  }

  modules[idx] = {
    ...instance,
    name: moduleRow.name,
    type: moduleRow.type as typeof instance.type,
    content: moduleRow.content as typeof instance.content,
    sourceUpdatedAt: moduleRow.updatedAt.toISOString(),
  }

  await snapshotPitch({ pitchId: params.id, changedBy: 'admin' })
  const updated = await prisma.pitch.update({
    where: { id: params.id },
    data: { modules: serializeModules(modules), version: { increment: 1 } },
  })
  return NextResponse.json(updated)
}
