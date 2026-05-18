import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// POST /api/admin/offers/:id/versions/:version/restore
//
// Clones the content of the given historical version into a new current version.
// The previous current state is preserved in the version history as usual.
//
// Example: offer has v1, v2, v3 (current). Restoring v1 creates v4 with v1's content.
// The version list afterwards reads: v1, v2, v3, v4 (=v1, current).
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

  // Load current offer
  const current = await prisma.offer.findUnique({ where: { id: params.id } })
  if (!current) {
    return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 })
  }

  // Don't allow restoring the current version onto itself
  if (versionNum === current.version) {
    return NextResponse.json(
      { error: 'Das ist bereits die aktuelle Version' },
      { status: 400 }
    )
  }

  // Load the snapshot we're restoring
  const snapshot = await prisma.offerVersion.findFirst({
    where: { offerId: params.id, version: versionNum },
  })
  if (!snapshot) {
    return NextResponse.json({ error: 'Version nicht gefunden' }, { status: 404 })
  }

  // Save the *current* state as a version entry before overwriting it
  await prisma.offerVersion.create({
    data: {
      offerId: current.id,
      version: current.version,
      data: JSON.parse(JSON.stringify(current)),
      changedBy: 'admin',
    },
  })

  // Apply snapshot fields to the offer. Only allow content fields — id, slug,
  // editToken, createdAt, contactSlug etc. stay as they are.
  const snap = snapshot.data as Record<string, unknown>
  const restorable = [
    'clientName', 'clientCompany', 'projectName', 'offerNumber',
    'hero', 'understanding', 'services', 'packages', 'notIncluded',
    'timeline', 'stats', 'statsHeadline', 'referencesHeadline',
    'referenceIds', 'channelIds', 'channelsHidden', 'channelsHeadline',
    'legal', 'template',
  ]
  const updateData: Record<string, unknown> = {
    version: current.version + 1,
    updatedAt: new Date(),
  }
  for (const f of restorable) {
    if (snap[f] !== undefined) updateData[f] = snap[f]
  }

  const updated = await prisma.offer.update({
    where: { id: current.id },
    data: updateData as never,
    include: { contact: true },
  })

  return NextResponse.json({ offer: updated, restoredFromVersion: versionNum })
}
