import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// POST /api/admin/offers/bulk-archive
// Body: { ids: string[] }
//
// Archives multiple offers in one call by setting archivedAt = now() on each.
// Existing already-archived offers are skipped silently.
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  let body: { ids?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === 'string' && id) : []
  if (ids.length === 0) {
    return NextResponse.json({ error: 'Keine IDs übergeben' }, { status: 400 })
  }

  try {
    const result = await prisma.offer.updateMany({
      where: {
        id: { in: ids },
        archivedAt: null,
      } as never,
      data: { archivedAt: new Date() } as unknown as Record<string, unknown>,
    })
    return NextResponse.json({ archived: result.count })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Archivieren fehlgeschlagen'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
