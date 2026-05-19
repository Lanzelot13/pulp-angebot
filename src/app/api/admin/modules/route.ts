import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { PITCH_MODULE_TYPES, PitchModuleType } from '@/lib/pitch-types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { searchParams } = new URL(request.url)
  const includeArchived = searchParams.get('includeArchived') === '1'

  const modules = await prisma.pitchModule.findMany({
    where: includeArchived ? {} : { archivedAt: null },
    orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
  })
  return NextResponse.json(modules)
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const user = authResult
  const body = await request.json()

  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name fehlt' }, { status: 400 })
  }
  if (!body.type || !PITCH_MODULE_TYPES.includes(body.type as PitchModuleType)) {
    return NextResponse.json({ error: 'Unbekannter Modul-Typ' }, { status: 400 })
  }

  const moduleRow = await prisma.pitchModule.create({
    data: {
      type: body.type,
      name: body.name,
      description: body.description || null,
      content: body.content ?? {},
      createdBy: `${user.firstname} ${user.lastname}`.trim() || user.email,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
    },
  })
  return NextResponse.json(moduleRow, { status: 201 })
}
