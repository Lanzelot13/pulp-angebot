import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { createSlug } from '@/lib/slug'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const { searchParams } = new URL(request.url)
  const archived = searchParams.get('archived') === 'true'
  const search = (searchParams.get('search') || '').trim()
  const contactSlug = (searchParams.get('contactSlug') || '').trim()

  const where: Record<string, unknown> = {
    archivedAt: archived ? { not: null } : null,
  }
  if (contactSlug) where.contactSlug = contactSlug
  if (search) {
    where.OR = [
      { clientCompany: { contains: search, mode: 'insensitive' } },
      { occasion: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ]
  }

  const pitches = await prisma.pitch.findMany({
    where,
    include: { contact: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // Aufrufe pro Pitch (TrackView-Count + letzter Zugriff) in einem Query.
  const pitchIds = pitches.map((p) => p.id)
  const countMap = new Map<string, number>()
  const lastViewMap = new Map<string, Date>()
  if (pitchIds.length > 0) {
    try {
      const trackDb = prisma as unknown as {
        trackView: {
          groupBy: (a: unknown) => Promise<
            Array<{
              targetId: string
              _count: { _all: number }
              _max: { lastEventAt: Date | null }
            }>
          >
        }
      }
      const grouped = await trackDb.trackView.groupBy({
        by: ['targetId'],
        where: { targetType: 'PITCH', targetId: { in: pitchIds } },
        _count: { _all: true },
        _max: { lastEventAt: true },
      })
      for (const row of grouped) {
        countMap.set(row.targetId, row._count._all)
        if (row._max.lastEventAt) {
          lastViewMap.set(row.targetId, row._max.lastEventAt)
        }
      }
    } catch {
      // Tracking-Tabelle noch nicht da: einfach 0er liefern
    }
  }

  const pitchesWithCounts = pitches.map((p) => ({
    ...p,
    viewCount: countMap.get(p.id) || 0,
    lastViewAt: lastViewMap.get(p.id) || null,
  }))

  return NextResponse.json(pitchesWithCounts)
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()

  if (!body.clientCompany || typeof body.clientCompany !== 'string') {
    return NextResponse.json({ error: 'clientCompany fehlt' }, { status: 400 })
  }
  if (!body.contactSlug || typeof body.contactSlug !== 'string') {
    return NextResponse.json({ error: 'contactSlug fehlt' }, { status: 400 })
  }

  // Ensure contact exists
  const contact = await prisma.contact.findUnique({
    where: { slug: body.contactSlug },
  })
  if (!contact) {
    return NextResponse.json({ error: 'Kontakt nicht gefunden' }, { status: 404 })
  }

  // Generate a unique slug. Append the date if a Pitch with the same slug
  // already exists, so accounters can create multiple pitches per customer.
  const baseSlug = createSlug(body.clientCompany)
  let slug = baseSlug
  const today = new Date()
  const datePart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  if (await prisma.pitch.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${datePart}`
  }
  let counter = 2
  while (await prisma.pitch.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${datePart}-${counter}`
    counter += 1
  }

  const pitch = await prisma.pitch.create({
    data: {
      slug,
      clientCompany: body.clientCompany.trim(),
      occasion: body.occasion?.trim() || null,
      contactSlug: body.contactSlug,
      modules: [],
    },
    include: { contact: { select: { name: true, slug: true } } },
  })
  return NextResponse.json(pitch, { status: 201 })
}
