import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/auth'
import { getSession } from '@/lib/admin-auth'
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
    // Admin-Cookie ODER Bearer-Key akzeptieren, damit das Backend die
    // Publish-Actions ebenfalls auslösen kann.
    const adminUser = await getSession(request)
    if (!adminUser) {
      const authError = requireApiKey(request)
      if (authError) return authError
    }
    offer = await prisma.offer.findUnique({ where: { id: params.id } })
  }
  if (!offer) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
  }

  const snapshot = buildPublishSnapshot(offer as unknown as Record<string, unknown>)
  const now = new Date()
  const version = offer.version

  const updated = await prisma.offer.update({
    where: { id: params.id },
    data: {
      publishedSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      publishedAt: now,
      publishedVersion: version,
    } as unknown as Prisma.OfferUpdateInput,
  })

  return NextResponse.json({
    ok: true,
    publishedAt: now,
    publishedVersion: version,
    offerId: updated.id,
  })
}

// DELETE /api/offers/:id/publish
// Löst den Kunden-Snapshot auf und schaltet das Angebot zurück in den
// Live-Modus — Kunde sieht ab da automatisch wieder die aktuelle Version.
// Wenn der Kunde temporär nichts sehen soll, dafür blockedAt setzen (siehe
// Sperren-Toggle im Editor).
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
    // Admin-Cookie ODER Bearer-Key akzeptieren, damit das Backend die
    // Publish-Actions ebenfalls auslösen kann.
    const adminUser = await getSession(request)
    if (!adminUser) {
      const authError = requireApiKey(request)
      if (authError) return authError
    }
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
      publishedVersion: null,
    } as unknown as Prisma.OfferUpdateInput,
  })

  return NextResponse.json({ ok: true, offerId: params.id })
}
