import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/auth'
import { OfferStatus } from '@prisma/client'

const VALID_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  DRAFT: ['PRICED'],
  PRICED: ['DRAFT', 'ACCEPTED'],
  ACCEPTED: ['PRICED'],
}

// PATCH /api/offers/:id/status — Change offer status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireApiKey(request)
  if (authError) return authError

  const body = await request.json()
  const newStatus = body.status?.toUpperCase() as OfferStatus

  if (!newStatus || !Object.values(OfferStatus).includes(newStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${Object.values(OfferStatus).join(', ')}` },
      { status: 400 }
    )
  }

  const offer = await prisma.offer.findUnique({ where: { id: params.id } })
  if (!offer) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  }

  const allowed = VALID_TRANSITIONS[offer.status]
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${offer.status} to ${newStatus}. Allowed: ${allowed.join(', ')}` },
      { status: 400 }
    )
  }

  // When going to PRICED, enable showPrices in packages
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date(),
  }

  if (newStatus === 'PRICED' && offer.packages) {
    const packages = offer.packages as Record<string, unknown>
    updateData.packages = { ...packages, showPrices: true }
  }

  if (newStatus === 'DRAFT' && offer.packages) {
    const packages = offer.packages as Record<string, unknown>
    updateData.packages = { ...packages, showPrices: false }
  }

  const updated = await prisma.offer.update({
    where: { id: params.id },
    data: updateData,
    include: { contact: true },
  })

  return NextResponse.json(updated)
}
