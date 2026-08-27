import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getSession, requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { createSlug } from '@/lib/slug'

export const dynamic = 'force-dynamic'

// Erlaubte Bildformate — bewusst ohne SVG, weil Moodbilder Fotos sind.
const ALLOWED = new Set(['jpg', 'jpeg', 'png', 'webp'])

// Upload eines Moodboard-Bilds in Vercel Blob.
//
// Zwei Auth-Wege, damit sowohl das Admin-Backend als auch der Editor
// (mit edit-Token) hochladen kann:
//   - Admin-Cookie (Standard fürs Backend)
//   - ?offerId=...&edit=<editToken> (aus dem Inline-Editor)
//
// FormData:
//   file          — die Bilddatei
//   offerSlug?    — optional, für einen sprechenden Pfad in Blob
//
// Response: { url }
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const offerId = searchParams.get('offerId')
  const editToken = searchParams.get('edit')

  if (editToken && offerId) {
    // Editor-Weg: edit-Token gegen Offer prüfen
    const offer = await prisma.offer.findFirst({
      where: { id: offerId, editToken },
      select: { id: true },
    })
    if (!offer) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    // Backend-Weg: Admin-Cookie
    const adminUser = await getSession(request)
    if (!adminUser) {
      const authResult = await requireAdmin(request)
      if (authResult instanceof NextResponse) return authResult
    }
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Ungültiges FormData' }, { status: 400 })
  }
  const file = formData.get('file')
  const offerSlug = (formData.get('offerSlug') as string | null) || 'offer'
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Datei fehlt' }, { status: 400 })
  }

  const originalName = file.name || 'moodboard'
  const dot = originalName.lastIndexOf('.')
  const ext = (dot >= 0 ? originalName.slice(dot + 1) : '').toLowerCase()
  if (!ALLOWED.has(ext)) {
    return NextResponse.json(
      { error: `Format nicht erlaubt. Nur ${Array.from(ALLOWED).join(', ')}` },
      { status: 400 }
    )
  }
  // Max 5 MB pro Bild — kompakter, damit sich die Kundenseite noch schnell lädt.
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Datei zu groß (max 5 MB)' }, { status: 400 })
  }

  const slug = createSlug(offerSlug)
  const stamp = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 6)
  // Pfad: moodboard/<offer-slug>-<timestamp>-<rand>.<ext>
  const filename = `moodboard/${slug}-${stamp}-${rand}.${ext}`

  try {
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    })
    return NextResponse.json({ url: blob.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Upload fehlgeschlagen'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
