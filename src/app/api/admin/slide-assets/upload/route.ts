import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { requireAdmin } from '@/lib/admin-auth'
import { createSlug } from '@/lib/slug'

export const dynamic = 'force-dynamic'

// Upload für Slide-Assets (Background-Bilder, spätere Modul-Bilder).
// Bewusst separat vom Lovebrand-Upload weil größere Files erlaubt sind
// und der Blob-Pfad anders (slide-assets/<name>-<stamp>.<ext>).
const ALLOWED = new Set(['jpg', 'jpeg', 'png', 'webp'])
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

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

  const originalName = file.name || 'asset'
  const dot = originalName.lastIndexOf('.')
  const ext = (dot >= 0 ? originalName.slice(dot + 1) : '').toLowerCase()
  if (!ALLOWED.has(ext)) {
    return NextResponse.json(
      { error: `Format nicht erlaubt. Nur ${Array.from(ALLOWED).join(', ')}` },
      { status: 400 }
    )
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `Datei zu groß (max ${MAX_SIZE / 1024 / 1024} MB)` },
      { status: 400 }
    )
  }

  const baseSlug = createSlug(
    nameHint || originalName.slice(0, dot >= 0 ? dot : undefined) || 'asset'
  )
  const stamp = Date.now().toString(36)
  const filename = `slide-assets/${baseSlug}-${stamp}.${ext}`

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
