import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { requireAdmin } from '@/lib/admin-auth'
import { createSlug } from '@/lib/slug'

export const dynamic = 'force-dynamic'

// Erlaubte Logo-Formate
const ALLOWED = new Set(['svg', 'png', 'jpg', 'jpeg', 'webp'])

// Upload eines Lovebrand-Logos in Vercel Blob.
// Erwartet multipart/form-data mit Feldern "file" (Datei) und optional "name"
// (Brand-Name zur Pfad-Generierung). Antwortet mit { url } der hochgeladenen Datei.
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Ungültiges FormData' }, { status: 400 })
  }
  const file = formData.get('file')
  const nameHint = (formData.get('name') as string | null) || ''
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Datei fehlt' }, { status: 400 })
  }

  const originalName = file.name || 'logo'
  const dot = originalName.lastIndexOf('.')
  const ext = (dot >= 0 ? originalName.slice(dot + 1) : '').toLowerCase()
  if (!ALLOWED.has(ext)) {
    return NextResponse.json(
      { error: `Format nicht erlaubt. Nur ${Array.from(ALLOWED).join(', ')}` },
      { status: 400 }
    )
  }
  // Max 2 MB (Logos sind klein, das fängt versehentliche Riesen-PDFs ab)
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'Datei zu groß (max 2 MB)' }, { status: 400 })
  }

  const baseSlug = createSlug(nameHint || originalName.slice(0, dot >= 0 ? dot : undefined) || 'logo')
  // Pfad in Vercel Blob: lovebrands/<slug>-<timestamp>.<ext>
  // Timestamp verhindert Cache-Probleme beim Logo-Tausch derselben Brand.
  const stamp = Date.now().toString(36)
  const filename = `lovebrands/${baseSlug}-${stamp}.${ext}`

  try {
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type || undefined,
    })
    return NextResponse.json({ url: blob.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
