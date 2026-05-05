import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/auth'
import { OfferStatus } from '@prisma/client'

// PATCH /api/offers/:id/status — Change offer status
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

  const body = await request.json()
  const newStatus = body.status?.toUpperCase() as OfferStatus

  if (!newStatus || !Object.values(OfferStatus).includes(newStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${Object.values(OfferStatus).join(', ')}` },
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
