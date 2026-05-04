import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/auth'
import { createSlug } from '@/lib/slug'
import { CreateOfferRequest } from '@/lib/types'

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
      hero: body.hero || null,
      understanding: body.understanding || null,
      services: body.services || null,
      packages: body.packages || null,
      timeline: body.timeline || null,
      stats: body.stats || null,
      referenceIds: body.referenceIds || [],
      channelIds: body.channelIds || [],
      legal: body.legal || null,
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
