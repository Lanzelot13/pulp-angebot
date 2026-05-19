import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { PITCH_MODULE_TYPES, PitchModuleType } from '@/lib/pitch-types'
import {
  parsePitchModules,
  nextSortOrder,
  snapshotFromCustom,
  snapshotFromModule,
  serializeModules,
} from '@/lib/pitch-modules'

export const dynamic = 'force-dynamic'

// POST: add a module to the pitch.
// Either provide `moduleId` (copy snapshot from a global PitchModule)
// or provide `custom` ({ type, name, content }) for an ad-hoc block.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const pitch = await prisma.pitch.findUnique({ where: { id: params.id } })
  if (!pitch) {
    return NextResponse.json({ error: 'Pitch nicht gefunden' }, { status: 404 })
  }

  const modules = parsePitchModules(pitch.modules)
  const sortOrder =
    typeof body.sortOrder === 'number' ? body.sortOrder : nextSortOrder(modules)

  let newSnapshot
  if (body.moduleId) {
    const moduleRow = await prisma.pitchModule.findUnique({
      where: { id: body.moduleId },
    })
    if (!moduleRow) {
      return NextResponse.json(
        { error: 'Quell-Modul nicht gefunden' },
        { status: 404 }
      )
    }
    newSnapshot = snapshotFromModule({
      moduleId: moduleRow.id,
      type: moduleRow.type as PitchModuleType,
      name: moduleRow.name,
      content: moduleRow.content,
      sourceUpdatedAt: moduleRow.updatedAt,
      sortOrder,
    })
  } else if (body.custom) {
    const c = body.custom
    if (!c.type || !PITCH_MODULE_TYPES.includes(c.type as PitchModuleType)) {
      return NextResponse.json(
        { error: 'Unbekannter Modul-Typ' },
        { status: 400 }
      )
    }
    if (!c.name || typeof c.name !== 'string') {
      return NextResponse.json({ error: 'name fehlt' }, { status: 400 })
    }
    newSnapshot = snapshotFromCustom({
      type: c.type,
      name: c.name,
      content: c.content ?? {},
      sortOrder,
    })
  } else {
    return NextResponse.json(
      { error: 'Bitte moduleId oder custom angeben' },
      { status: 400 }
    )
  }

  const updated = [...modules, newSnapshot]
  const result = await prisma.pitch.update({
    where: { id: params.id },
    data: { modules: serializeModules(updated) },
  })
  return NextResponse.json(result, { status: 201 })
}
