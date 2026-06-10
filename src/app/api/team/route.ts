import { NextResponse } from 'next/server'
import { getActivePulpies } from '@/lib/pulpies'

// Liefert die aktiven Pulpies aus dem lokalen DB-Cache.
// Wird vom TeamPicker im Admin und (indirekt) vom Pitch-Renderer genutzt.
// Sync gegen pulpmedia.at läuft über POST /api/admin/pulpies/refresh.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const pulpies = await getActivePulpies()
    const people = pulpies.map((p) => ({
      slug: p.slug,
      name: p.name,
      role: p.role || '',
      imageUrl: p.imageUrl || '',
      email: p.email,
      phone: p.phone,
    }))
    return NextResponse.json({
      people,
      fromCache: true,    // immer aus DB
      fetchedAt: Date.now(),
    })
  } catch (err) {
    return NextResponse.json(
      {
        people: [],
        fetchedAt: null,
        fromCache: false,
        error:
          err instanceof Error ? err.message : 'Pulpies konnten nicht geladen werden',
      },
      { status: 200 }
    )
  }
}
