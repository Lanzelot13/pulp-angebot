import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUS = new Set(['DRAFT', 'PRICED', 'ACCEPTED', 'DECLINED'])
const ALLOWED_TEMPLATE = new Set(['TEMPLATE1', 'TEMPLATE2'])

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// PATCH /api/admin/offers/:id — Update offer metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const data: Record<string, unknown> = {}

  if (typeof body.clientName === 'string') {
    const v = body.clientName.trim()
    if (!v) return NextResponse.json({ error: 'Name der Ansprechperson beim Kunden darf nicht leer sein' }, { status: 400 })
    data.clientName = v
  }
  if (typeof body.clientCompany === 'string') {
    const v = body.clientCompany.trim()
    if (!v) return NextResponse.json({ error: 'Firmenname darf nicht leer sein' }, { status: 400 })
    data.clientCompany = v
  }
  if (typeof body.projectName === 'string') {
    const v = body.projectName.trim()
    if (!v) return NextResponse.json({ error: 'Projektname darf nicht leer sein' }, { status: 400 })
    data.projectName = v
  }
  if (body.offerNumber !== undefined) {
    if (body.offerNumber === null || body.offerNumber === '') {
      data.offerNumber = null
    } else if (typeof body.offerNumber === 'string') {
      data.offerNumber = body.offerNumber.trim()
    }
  }
  if (body.template !== undefined) {
    if (!ALLOWED_TEMPLATE.has(body.template)) {
      return NextResponse.json({ error: 'Ungültiges Template' }, { status: 400 })
    }
    data.template = body.template
  }
  if (body.status !== undefined) {
    if (!ALLOWED_STATUS.has(body.status)) {
      return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 })
    }
    data.status = body.status
  }
  if (typeof body.contactSlug === 'string') {
    const contact = await prisma.contact.findUnique({ where: { slug: body.contactSlug } })
    if (!contact) {
      return NextResponse.json({ error: 'Ansprechperson nicht gefunden' }, { status: 400 })
    }
    data.contactSlug = body.contactSlug
  }
  if (body.validUntil !== undefined) {
    if (body.validUntil === null || body.validUntil === '') {
      data.validUntil = null
    } else {
      const d = new Date(body.validUntil)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Ungültiges Gültigkeitsdatum' }, { status: 400 })
      }
      data.validUntil = d
    }
  }
  if (typeof body.slug === 'string') {
    const newSlug = normalizeSlug(body.slug)
    if (!newSlug) {
      return NextResponse.json({ error: 'Slug darf nicht leer sein' }, { status: 400 })
    }
    // Check if slug already taken by another offer
    const existing = await prisma.offer.findUnique({ where: { slug: newSlug } })
    if (existing && existing.id !== params.id) {
      return NextResponse.json({ error: 'Diese URL ist bereits vergeben' }, { status: 409 })
    }
    data.slug = newSlug
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Keine Änderungen übergeben' }, { status: 400 })
  }

  try {
    const offer = await prisma.offer.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json(offer)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
