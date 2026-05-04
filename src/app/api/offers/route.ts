import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/auth'
import { createSlug } from '@/lib/slug'
import { CreateOfferRequest } from '@/lib/types'

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
    ...offer,
    url: `/o/${offer.slug}`,
    editUrl: `/o/${offer.slug}?edit=${offer.editToken}`,
    cleanUrl: `/o/${offer.slug}?clean=1`,
  }, { status: 201 })
}
