import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { parsePitchModules, serializeModules } from '@/lib/pitch-modules'
import { snapshotPitch } from '@/lib/pitch-versions'

export const dynamic = 'force-dynamic'

// POST: reorder modules within a pitch. Body: { order: instanceId[] }.
// Any instanceIds not included keep their relative order and are appended.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const order: unknown = body.order
  if (!Array.isArray(order) || !order.every((x) => typeof x === 'string')) {
    return NextResponse.json(
      { error: 'order muss ein Array von instanceIds sein' },
      { status: 400 }
    )
  }

  const pitch = await prisma.pitch.findUnique({ where: { id: params.id } })
  if (!pitch) {
    return NextResponse.json({ error: 'Pitch nicht gefunden' }, { status: 404 })
  }

  const modules = parsePitchModules(pitch.modules)
  const byId = new Map(modules.map((m) => [m.instanceId, m]))
  const seen = new Set<string>()
  const reordered: typeof modules = []

  let sortOrder = 0
  for (const instanceId of order as string[]) {
    const m = byId.get(instanceId)
    if (m && !seen.has(instanceId)) {
      reordered.push({ ...m, sortOrder })
      seen.add(instanceId)
      sortOrder += 1
    }
  }
  // Append leftovers (anything not in the order array) to keep them
  for (const m of modules) {
    if (!seen.has(m.instanceId)) {
      reordered.push({ ...m, sortOrder })
      sortOrder += 1
    }
  }

  await snapshotPitch({ pitchId: params.id, changedBy: 'admin' })
  const updated = await prisma.pitch.update({
    where: { id: params.id },
    data: { modules: serializeModules(reordered), version: { increment: 1 } },
  })
  return NextResponse.json(updated)
}
