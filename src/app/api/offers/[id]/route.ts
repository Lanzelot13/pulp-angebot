import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/auth'
import { UpdateOfferRequest } from '@/lib/types'

// GET /api/offers/:id — Get a single offer
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Allow access via API key OR edit token
  const { searchParams } = new URL(request.url)
  const editToken = searchParams.get('edit')

  if (editToken) {
    const offer = await prisma.offer.findFirst({
      where: { id: params.id, editToken },
      include: { contact: true },
    })
    if (!offer) {
      return NextResponse.json({ error: 'Not found or invalid token' }, { status: 404 })
    }
    return NextResponse.json(offer)
  }

  const authError = requireApiKey(request)
  if (authError) return authError

  const offer = await prisma.offer.findUnique({
    where: { id: params.id },
    include: { contact: true },
  })

  if (!offer) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  }

  return NextResponse.json(offer)
}

// PATCH /api/offers/:id — Update an offer
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Allow access via API key OR edit token
  const { searchParams } = new URL(request.url)
  const editToken = searchParams.get('edit')

  let offer
  if (editToken) {
    offer = await prisma.offer.findFirst({
      where: { id: params.id, editToken },
    })
  } else {
    const authError = requireApiKey(request)
    if (authError) return authError
    offer = await prisma.offer.findUnique({ where: { id: params.id } })
  }

  if (!offer) {
    return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
  }

  const body: UpdateOfferRequest = await request.json()

  // Save current version before updating
  await prisma.offerVersion.create({
    data: {
      offerId: offer.id,
      version: offer.version,
      data: JSON.parse(JSON.stringify(offer)),
      changedBy: body.changedBy || (editToken ? 'editor' : 'api'),
    },
  })

  // Build update data from provided fields
  const updateData: Record<string, unknown> = {
    version: { increment: 1 },
    updatedAt: new Date(),
  }

  const allowedFields = [
    'clientName', 'clientCompany', 'projectName', 'offerNumber',
    'contactSlug', 'hero', 'understanding', 'services', 'packages',
    'notIncluded', 'timeline', 'stats', 'referenceIds', 'channelIds', 'channelsHidden', 'channelsHeadline', 'legal', 'template',
  ]

  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = (body as Record<string, unknown>)[field]
    }
  }

  const updated = await prisma.offer.update({
    where: { id: params.id },
    data: updateData,
    include: { contact: true },
  })

  return NextResponse.json(updated)
}
