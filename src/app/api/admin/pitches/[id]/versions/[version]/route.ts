import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/pitches/:id/versions/:version
// Liefert den vollständigen Snapshot einer historischen Version. Wird vom
// Admin-UI für den "Ansehen"-Modus genutzt: zeigt die alte Pitch read-only.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; version: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const versionNum = parseInt(params.version, 10)
  if (!Number.isFinite(versionNum) || versionNum < 1) {
    return NextResponse.json({ error: 'Ungültige Versionsnummer' }, { status: 400 })
  }

  const snapshot = await prisma.pitchVersion.findFirst({
    where: { pitchId: params.id, version: versionNum },
  })
  if (!snapshot) {
    return NextResponse.json({ error: 'Version nicht gefunden' }, { status: 404 })
  }

  return NextResponse.json({
    version: snapshot.version,
    changedBy: snapshot.changedBy,
    createdAt: snapshot.createdAt,
    data: snapshot.data,
  })
}
