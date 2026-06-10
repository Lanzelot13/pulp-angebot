import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/auth'
import { buildSlug } from '@/lib/slug'
import { CreateOfferRequest, DEFAULT_NOT_INCLUDED, DEFAULT_STATS } from '@/lib/types'
import { fullOfferUrl, fullEditUrl, fullCleanUrl, PUBLIC_BASE_URL } from '@/lib/config'

// Helper: convert value to Prisma-compatible JSON or DbNull
function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value ? (value as Prisma.InputJsonValue) : Prisma.DbNull
}

// GET /api/offers — List all offers
export async function GET(request: NextRequest) {
  const authError = requireApiKey(request)
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const contact = searchParams.get('contact')

  const where: Record<string, unknown> = {}
  if (status) where.status = status.toUpperCase()
  if (contact) where.contactSlug = contact

  const offers = await prisma.offer.findMany({
    where,
    include: { contact: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(offers)
}

// POST /api/offers — Create a new offer
export async function POST(request: NextRequest) {
  const authError = requireApiKey(request)
  if (authError) return authError

  const body: CreateOfferRequest = await request.json()

  // Validate required fields
  if (!body.clientName || !body.clientCompany || !body.projectName || !body.contactSlug) {
    return NextResponse.json(
      { error: 'Missing required fields: clientName, clientCompany, projectName, contactSlug' },
      { status: 400 }
    )
  }

  // Check contact exists
  const contact = await prisma.contact.findUnique({ where: { slug: body.contactSlug } })
  if (!contact) {
    return NextResponse.json(
      { error: `Contact "${body.contactSlug}" not found` },
      { status: 400 }
    )
  }

  // Duplicate guard: if an offer with the same clientCompany + projectName was
  // created in the last 10 minutes, bounce with 409 and the existing id.
  // This catches accidental double-creates from the Claude-skill retrying.
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000)
  const existing = await prisma.offer.findFirst({
    where: {
      clientCompany: body.clientCompany,
      projectName: body.projectName,
      createdAt: { gt: tenMinutesAgo },
    },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) {
    return NextResponse.json(
      {
        error:
          `Es gibt bereits ein Angebot für "${body.clientCompany}" / "${body.projectName}", angelegt vor ` +
          `${Math.round((Date.now() - existing.createdAt.getTime()) / 1000)}s. ` +
          `Falls das absichtlich ist, ändere clientCompany oder projectName.`,
        existingOfferId: existing.id,
        existingSlug: existing.slug,
        existingUrl: fullOfferUrl(existing.slug),
        existingEditUrl: fullEditUrl(existing.slug, existing.editToken),
      },
      { status: 409 }
    )
  }

  // Slug aus Firma + Projekt bauen, damit der Link spricht. Wenn der Skill nur
  // den Firmennamen schickt (Bestandskunden, dasselbe Projekt mehrfach), würde
  // der Slug nichtssagend sein.
  const slug = buildSlug({
    company: body.clientCompany,
    project: body.projectName,
    offerNumber: body.offerNumber,
  })

  // Check slug uniqueness, append suffix if needed
  let finalSlug = slug
  let counter = 1
  while (await prisma.offer.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${counter}`
    counter++
  }

  // Stats: wenn der Skill nichts oder ein leeres Array mitschickt, nehmen wir
  // die Pulpmedia-Default-Zahlen. So sieht jedes Angebot wenigstens generisch
  // kompetent aus, selbst wenn die KI keine projektspezifischen Zahlen findet.
  const incomingStats = Array.isArray(body.stats) ? body.stats : null
  const finalStats =
    incomingStats && incomingStats.length > 0 ? incomingStats : DEFAULT_STATS

  const offer = await prisma.offer.create({
    data: {
      slug: finalSlug,
      clientName: body.clientName,
      clientCompany: body.clientCompany,
      projectName: body.projectName,
      offerNumber: body.offerNumber || null,
      contactSlug: body.contactSlug,
      mocoRef: body.mocoRef || null,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      hero: jsonOrNull(body.hero),
      understanding: jsonOrNull(body.understanding),
      services: jsonOrNull(body.services),
      packages: jsonOrNull(body.packages),
      // Use provided notIncluded or fall back to standard defaults so every
      // new offer ships with a sensible "what's not included" section.
      notIncluded: jsonOrNull(body.notIncluded ?? DEFAULT_NOT_INCLUDED),
      timeline: jsonOrNull(body.timeline),
      stats: jsonOrNull(finalStats),
      referenceIds: body.referenceIds || [],
      channelIds: body.channelIds || [],
      legal: jsonOrNull(body.legal),
    } as unknown as Prisma.OfferCreateInput,
    include: { contact: true },
  })

  return NextResponse.json(
    {
      ...offer,
      // Volle Links, damit der Skill (oder welcher Client auch immer) niemals
      // die Vercel-Default-Domain raten muss.
      url: fullOfferUrl(offer.slug),
      editUrl: fullEditUrl(offer.slug, offer.editToken),
      cleanUrl: fullCleanUrl(offer.slug),
      baseUrl: PUBLIC_BASE_URL,
    },
    { status: 201 }
  )
}
