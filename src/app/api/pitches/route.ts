import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/auth'
import { createSlug } from '@/lib/slug'
import { randomUUID } from 'crypto'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface IncomingModule {
  type: string
  name?: string
  content: Record<string, unknown>
}

interface CreatePitchBody {
  clientCompany: string
  contactSlug: string
  occasion?: string
  slug?: string
  modules: IncomingModule[]
}

// POST /api/pitches
// Erstellt einen neuen Pitch mit den übergebenen Modul-Snapshots.
// Wird vom Pitch-Skill genutzt. Bearer-API-Key nötig.
//
// Body: { clientCompany, contactSlug, occasion?, slug?, modules: [{type, name?, content}] }
// Response: { id, slug, editToken, url, editUrl, baseUrl }
export async function POST(request: NextRequest) {
  const authErr = requireApiKey(request)
  if (authErr) return authErr

  let body: CreatePitchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.clientCompany || typeof body.clientCompany !== 'string') {
    return NextResponse.json({ error: 'clientCompany fehlt' }, { status: 400 })
  }
  if (!body.contactSlug || typeof body.contactSlug !== 'string') {
    return NextResponse.json({ error: 'contactSlug fehlt' }, { status: 400 })
  }
  if (!Array.isArray(body.modules)) {
    return NextResponse.json({ error: 'modules (Array) fehlt' }, { status: 400 })
  }

  const contact = await prisma.contact.findUnique({ where: { slug: body.contactSlug } })
  if (!contact) {
    return NextResponse.json(
      { error: `Kontakt "${body.contactSlug}" nicht gefunden` },
      { status: 404 }
    )
  }

  // Slug-Generierung: explizit übergeben gewinnt; sonst aus clientCompany.
  // Bei Konflikt mit existierendem Slug: Datum anhängen, dann zählen.
  const baseSlug = (body.slug && body.slug.trim()) || createSlug(body.clientCompany)
  const slug = baseSlug
  const existing = await prisma.pitch.findUnique({ where: { slug } })
  if (existing) {
    // Konflikt → 409 mit Hinweis und existingEditUrl, analog zu Offers
    const baseUrl = getBaseUrl(request)
    return NextResponse.json(
      {
        error: `Pitch mit Slug "${slug}" existiert bereits`,
        existingPitchId: existing.id,
        existingEditUrl: `${baseUrl}/p/${existing.slug}?edit=${existing.editToken}`,
        suggestion: 'Setze einen anderen `slug` im Request oder bearbeite die existierende Pitch.',
      },
      { status: 409 }
    )
  }

  // Modul-Snapshots vorbereiten (custom-Snapshots ohne moduleId)
  const snapshots = body.modules.map((m, i) => ({
    instanceId: randomUUID(),
    moduleId: null,
    type: m.type,
    name: m.name || m.type,
    content: m.content || {},
    sourceUpdatedAt: null,
    sortOrder: i,
  }))

  const pitch = await prisma.pitch.create({
    data: {
      slug,
      clientCompany: body.clientCompany.trim(),
      occasion: body.occasion?.trim() || null,
      contactSlug: body.contactSlug,
      modules: snapshots as unknown as Prisma.InputJsonValue,
    },
    include: { contact: true },
  })

  const baseUrl = getBaseUrl(request)
  return NextResponse.json(
    {
      id: pitch.id,
      slug: pitch.slug,
      editToken: pitch.editToken,
      url: `${baseUrl}/p/${pitch.slug}`,
      editUrl: `${baseUrl}/p/${pitch.slug}?edit=${pitch.editToken}`,
      adminUrl: `${baseUrl}/admin/pitches/${pitch.id}`,
      baseUrl,
    },
    { status: 201 }
  )
}

function getBaseUrl(request: NextRequest): string {
  // Branding-Domain bevorzugen, nicht die Vercel-URL.
  const env = process.env.PITCH_BASE_URL || process.env.OFFER_BASE_URL
  if (env) return env.replace(/\/$/, '')
  // Fallback: Host aus Request, falls Env nicht gesetzt
  const host = request.headers.get('host')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  return host ? `${proto}://${host}` : 'https://angebot.pulpmedia.at'
}
