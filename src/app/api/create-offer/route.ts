import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/slug'
import { CreateOfferRequest } from '@/lib/types'

// Helper: convert value to Prisma-compatible JSON or DbNull
function jsonOrNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value ? (value as Prisma.InputJsonValue) : Prisma.DbNull
}

// POST /api/create-offer — Create offer without API key auth
// Used by the /create page (link-based creation from Claude skill)
export async function POST(request: NextRequest) {
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

  const slug = createSlug(body.clientCompany, body.offerNumber)

  // Check slug uniqueness, append suffix if needed
  let finalSlug = slug
  let counter = 1
  while (await prisma.offer.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${counter}`
    counter++
  }

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
      timeline: jsonOrNull(body.timeline),
      stats: jsonOrNull(body.stats),
      referenceIds: body.referenceIds || [],
      channelIds: body.channelIds || [],
      legal: jsonOrNull(body.legal),
    },
    include: { contact: true },
  })

  return NextResponse.json({
    id: offer.id,
    slug: offer.slug,
    editToken: offer.editToken,
    url: `/o/${offer.slug}`,
    editUrl: `/o/${offer.slug}?edit=${offer.editToken}`,
  }, { status: 201 })
}
