import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { createOffer, MocoError, type MocoOfferItem } from '@/lib/moco'
import type { PackagesSection, PackageItem, AddOnItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

// POST /api/admin/offers/:id/sync-package
// Body: { packageIndex: number, includeAddOns?: boolean }
//
// Builds a Moco-Offer from the chosen package (price, optional priceUnit/termMonths)
// plus optional add-ons, posts it to Moco, and stores the resulting offer id
// back into the package item's mocoOfferId.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  let body: { packageIndex?: number; includeAddOns?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })
  }

  const packageIndex = body.packageIndex
  if (typeof packageIndex !== 'number' || packageIndex < 0) {
    return NextResponse.json({ error: 'packageIndex fehlt oder ungültig' }, { status: 400 })
  }
  const includeAddOns = body.includeAddOns !== false // default: true

  const offer = await prisma.offer.findUnique({ where: { id: params.id } })
  if (!offer) {
    return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 })
  }

  const mocoCompanyId = (offer as unknown as { mocoCompanyId?: string | null }).mocoCompanyId
  if (!mocoCompanyId) {
    return NextResponse.json(
      { error: 'Kein Moco-Kunde verknüpft. Bitte zuerst einen Kunden verknüpfen.' },
      { status: 400 }
    )
  }
  const dealId = offer.mocoRef ? Number(offer.mocoRef) : undefined
  if (!dealId) {
    return NextResponse.json(
      { error: 'Kein Moco-Lead verknüpft. Bitte zuerst einen Lead verknüpfen oder anlegen.' },
      { status: 400 }
    )
  }

  const packages = offer.packages as unknown as PackagesSection | null
  const pkg: PackageItem | undefined = packages?.items?.[packageIndex]
  if (!pkg) {
    return NextResponse.json({ error: 'Paket nicht gefunden' }, { status: 404 })
  }

  // Build offer items. Moco requires quantity + unit for every item-row,
  // even for one-off positions. We use type: 'item' uniformly and only fall
  // back to title/separator rows for headlines.
  const items: MocoOfferItem[] = []

  const isMonthly = pkg.priceUnit === '/ Monat'
  const isQuarterly = pkg.priceUnit === '/ Quartal'
  const isYearly = pkg.priceUnit === '/ Jahr'
  const isRecurring = isMonthly || isQuarterly || isYearly

  items.push({ type: 'title', title: pkg.name })

  if (isRecurring && pkg.termMonths && pkg.termMonths > 0) {
    const divisor = isMonthly ? 1 : isQuarterly ? 3 : 12
    const quantity = pkg.termMonths / divisor
    const unit = isMonthly ? 'Monat' : isQuarterly ? 'Quartal' : 'Jahr'
    items.push({
      type: 'item',
      title: pkg.description || pkg.name,
      quantity,
      unit,
      unit_price: pkg.price ?? 0,
    })
  } else {
    items.push({
      type: 'item',
      title: pkg.description || pkg.name,
      quantity: 1,
      unit: 'Pauschale',
      unit_price: pkg.price ?? 0,
    })
  }

  if (includeAddOns && packages?.addOns?.length) {
    const visibleAddOns = packages.addOns.filter(
      (a: AddOnItem) => a.price !== null && a.price !== undefined
    )
    if (visibleAddOns.length > 0) {
      items.push({ type: 'separator', title: 'Add-Ons' })
      for (const a of visibleAddOns) {
        items.push({
          type: 'item',
          title: `${a.name}${a.description ? ' — ' + a.description : ''}`,
          quantity: 1,
          unit: 'Pauschale',
          unit_price: a.price ?? 0,
        })
      }
    }
  }

  // Today as offer date, format YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10)

  const title = `${offer.projectName} — ${pkg.name}`

  // Moco requires recipient_address. We build a fallback from the client data
  // we already have. Moco enriches it from the company record where possible.
  const recipientAddress = [offer.clientCompany, offer.clientName]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join('\n') || offer.clientCompany || 'Empfänger laut Kundenstamm'

  try {
    const mocoOffer = await createOffer({
      deal_id: dealId,
      company_id: Number(mocoCompanyId),
      date: today,
      title,
      recipient_address: recipientAddress,
      currency: 'EUR',
      tax: 20,
      items,
    })

    // Write mocoOfferId back into the package
    const updatedItems = (packages?.items || []).map((it, idx) =>
      idx === packageIndex ? { ...it, mocoOfferId: mocoOffer.id } : it
    )
    const updatedPackages = { ...(packages || {}), items: updatedItems }

    await prisma.offer.update({
      where: { id: offer.id },
      data: { packages: updatedPackages as unknown as never },
    })

    return NextResponse.json({ mocoOfferId: mocoOffer.id, packageIndex })
  } catch (e) {
    const status = e instanceof MocoError ? e.status || 500 : 500
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Moco-Fehler' },
      { status }
    )
  }
}
