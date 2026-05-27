import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkSessionRateLimit } from '@/lib/track-rate-limit'
import { detectDevice, readGeoHeaders, safeReferrer, safeUserAgent } from '@/lib/track-helpers'

export const dynamic = 'force-dynamic'

// POST /api/track/view
// Öffnet eine View. Wird beim Page-Load einmal aufgerufen.
//
// Body: { targetType: 'OFFER' | 'PITCH', targetSlug: string, sessionId: string }
// Response: { viewId: string }
//
// Auth: keine (öffentlich, vom Client der Public-Page)
// Rate-Limit: pro sessionId (siehe lib/track-rate-limit)
export async function POST(req: NextRequest) {
  let body: { targetType?: string; targetSlug?: string; sessionId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const targetType = body.targetType
  const targetSlug = body.targetSlug
  const sessionId = body.sessionId

  if (!sessionId || (targetType !== 'OFFER' && targetType !== 'PITCH') || !targetSlug) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  const rl = checkSessionRateLimit(sessionId)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  // Target auflösen (Slug -> ID + Status)
  let targetId: string | null = null
  let targetStatus: string | null = null
  if (targetType === 'OFFER') {
    const offer = await prisma.offer.findUnique({
      where: { slug: targetSlug },
      select: { id: true, status: true },
    })
    if (offer) {
      targetId = offer.id
      targetStatus = offer.status
    }
  } else {
    const pitch = await prisma.pitch.findUnique({
      where: { slug: targetSlug },
      select: { id: true, status: true },
    })
    if (pitch) {
      targetId = pitch.id
      targetStatus = pitch.status
    }
  }

  if (!targetId) {
    return NextResponse.json({ error: 'Target not found' }, { status: 404 })
  }

  // Existierende View für dieses Target+Session?
  // (Cast nötig, weil Prisma-Client in der Sandbox nicht regeneriert wird.)
  const prismaAny = prisma as unknown as { trackView: { findFirst: (a: unknown) => Promise<{ id: string } | null>; update: (a: unknown) => Promise<unknown>; create: (a: unknown) => Promise<{ id: string }> } }
  const existing = await prismaAny.trackView.findFirst({
    where: { targetType, targetId, sessionId },
    select: { id: true },
  })

  if (existing) {
    await prismaAny.trackView.update({
      where: { id: existing.id },
      data: { lastEventAt: new Date() },
    })
    return NextResponse.json({ viewId: existing.id })
  }

  // Geo / Device / Referrer aus Headers
  const { country, region } = readGeoHeaders(req)
  const userAgent = safeUserAgent(req)
  const device = detectDevice(userAgent)
  const referrer = safeReferrer(req)

  const view = await prismaAny.trackView.create({
    data: {
      targetType,
      targetId,
      targetSlug,
      sessionId,
      targetStatus,
      country,
      region,
      userAgent,
      device,
      referrer,
    },
    select: { id: true },
  })

  return NextResponse.json({ viewId: view.id })
}
