import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { snapshotPitch } from '@/lib/pitch-versions'

export const dynamic = 'force-dynamic'

// POST /api/admin/pitches/:id/versions/:version/restore
//
// Lädt eine ältere Version als neue aktuelle Version. Die bisher aktuelle Version
// wird vorher als Snapshot in die Historie aufgenommen.
//
// Beispiel: Pitch ist auf v3 (aktuell). User klickt "v1 wiederherstellen":
//  → v3 wird als Snapshot abgelegt
//  → Pitch-Inhalt wird mit v1-Daten überschrieben
//  → Version-Counter springt auf v4 (also: v4 entspricht inhaltlich v1)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; version: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const versionNum = parseInt(params.version, 10)
  if (!Number.isFinite(versionNum) || versionNum < 1) {
    return NextResponse.json({ error: 'Ungültige Versionsnummer' }, { status: 400 })
  }

  const current = await prisma.pitch.findUnique({ where: { id: params.id } })
  if (!current) {
    return NextResponse.json({ error: 'Pitch nicht gefunden' }, { status: 404 })
  }
  if (versionNum === current.version) {
    return NextResponse.json(
      { error: 'Das ist bereits die aktuelle Version' },
      { status: 400 }
    )
  }

  const snapshot = await prisma.pitchVersion.findFirst({
    where: { pitchId: params.id, version: versionNum },
  })
  if (!snapshot) {
    return NextResponse.json({ error: 'Version nicht gefunden' }, { status: 404 })
  }

  // 1) Aktuellen Stand als Snapshot ablegen
  await snapshotPitch({ pitchId: current.id, changedBy: 'admin' })

  // 2) Inhaltliche Felder aus der historischen Version übernehmen.
  //    Schutz: id, slug, editToken, createdAt, contact-Verknüpfung bleiben.
  const snap = snapshot.data as Record<string, unknown>
  const restorable = [
    'clientCompany', 'occasion', 'modules', 'status',
  ] as const
  const updateData: Record<string, unknown> = {
    version: { increment: 1 },
    updatedAt: new Date(),
  }
  for (const f of restorable) {
    if (snap[f] !== undefined) updateData[f] = snap[f]
  }

  const updated = await prisma.pitch.update({
    where: { id: current.id },
    data: updateData as never,
    include: { contact: true },
  })

  return NextResponse.json({ pitch: updated, restoredFromVersion: versionNum })
}
