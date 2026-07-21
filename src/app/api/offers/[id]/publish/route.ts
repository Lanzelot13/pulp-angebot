import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/auth'
import { buildPublishSnapshot } from '@/lib/publish'

export const dynamic = 'force-dynamic'

// POST /api/offers/:id/publish
// Nimmt den aktuellen Live-Zustand des Angebots und speichert ihn als
// publishedSnapshot. Ab da sieht der Kunde diese Version. Weitere Live-
// Bearbeitungen ändern den Snapshot NICHT — erst ein erneutes POST publish
// veröffentlicht sie.
//
// Auth: Bearer API-Key ODER ?edit=<editToken>
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url)
  const editToken = searchParams.get('edit')

  let offer
  if (editToken) {
    offer = await prisma.offer.findFirst({ where: { id: params.id, editToken } })
  } else {
    const authError = requireApiKey(request)
    if (authError) return authError
    offer = await prisma.offer.findUnique({ where: { id: params.id } })
  }
  if (!offer) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
  }

  const snapshot = buildPublishSnapshot(offer as unknown as Record<string, unknown>)
  const now = new Date()

  const updated = await prisma.offer.update({
    where: { id: params.id },
    data: {
      publishedSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      publishedAt: now,
    } as unknown as Prisma.OfferUpdateInput,
  })

  return NextResponse.json({
    ok: true,
    publishedAt: now,
    offerId: updated.id,
  })
}

// DELETE /api/offers/:id/publish
// Setzt publishedSnapshot und publishedAt auf null. Der Kunde bekommt
// dann die "wird gerade überarbeitet"-Info-Seite (wie bei blockedAt),
// bis wieder ein Publish erfolgt.
//
// Auth: gleich wie oben.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url)
  const editToken = searchParams.get('edit')

  let offer
  if (editToken) {
    offer = await prisma.offer.findFirst({ where: { id: params.id, editToken } })
  } else {
    const authError = requireApiKey(request)
    if (authError) return authError
    offer = await prisma.offer.findUnique({ where: { id: params.id } })
  }
  if (!offer) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
  }

  await prisma.offer.update({
    where: { id: params.id },
    data: {
      publishedSnapshot: Prisma.DbNull,
      publishedAt: null,
    } as unknown as Prisma.OfferUpdateInput,
  })

  return NextResponse.json({ ok: true, offerId: params.id })
}
