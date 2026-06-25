import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/auth'
import { snapshotPitch } from '@/lib/pitch-versions'
import { randomUUID } from 'crypto'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface IncomingModule {
  type: string
  name?: string
  content: Record<string, unknown>
}

interface UpdatePitchBody {
  clientCompany?: string
  occasion?: string | null
  contactSlug?: string
  status?: 'DRAFT' | 'SENT' | 'ARCHIVED'
  /**
   * Wenn übergeben, ersetzt die vollständige Modul-Liste. Vor dem Ersetzen
   * wird der bisherige Stand als PitchVersion-Snapshot gespeichert.
   * Wenn weggelassen, bleibt die Liste unverändert.
   */
  modules?: IncomingModule[]
}

// GET /api/pitches/:id — Pitch-Daten via Bearer- oder editToken-Auth abfragen
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // editToken im Query oder Bearer-Key reicht
  const url = new URL(request.url)
  const editToken = url.searchParams.get('edit')

  if (editToken) {
    const pitch = await prisma.pitch.findUnique({
      where: { id: params.id },
      include: { contact: true },
    })
    if (!pitch || pitch.editToken !== editToken) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }
    return NextResponse.json(pitch)
  }

  const authErr = requireApiKey(request)
  if (authErr) return authErr

  const pitch = await prisma.pitch.findUnique({
    where: { id: params.id },
    include: { contact: true },
  })
  if (!pitch) {
    return NextResponse.json({ error: 'Pitch nicht gefunden' }, { status: 404 })
  }
  return NextResponse.json(pitch)
}

// PATCH /api/pitches/:id?edit=TOKEN — bearbeitet eine Pitch.
// Auth: Bearer-Key oder editToken via Query-Param.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const url = new URL(request.url)
  const editToken = url.searchParams.get('edit')

  let authenticated = false
  if (editToken) {
    const pitch = await prisma.pitch.findUnique({ where: { id: params.id } })
    if (pitch && pitch.editToken === editToken) authenticated = true
  }
  if (!authenticated) {
    const authErr = requireApiKey(request)
    if (authErr) return authErr
  }

  let body: UpdatePitchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (body.clientCompany !== undefined) data.clientCompany = body.clientCompany.trim()
  if (body.occasion !== undefined) data.occasion = body.occasion?.trim() || null
  if (body.contactSlug !== undefined) data.contactSlug = body.contactSlug
  if (body.status !== undefined) data.status = body.status

  if (Array.isArray(body.modules)) {
    const snapshots = body.modules.map((m, i) => ({
      instanceId: randomUUID(),
      moduleId: null,
      type: m.type,
      name: m.name || m.type,
      content: m.content || {},
      sourceUpdatedAt: null,
      sortOrder: i,
    }))
    data.modules = snapshots as unknown as Prisma.InputJsonValue
  }

  // Snapshot vor dem Update, plus version-Increment
  await snapshotPitch({ pitchId: params.id, changedBy: editToken ? 'editor' : 'skill' })
  data.version = { increment: 1 }

  const updated = await prisma.pitch.update({
    where: { id: params.id },
    data: data as never,
    include: { contact: true },
  })
  return NextResponse.json(updated)
}
