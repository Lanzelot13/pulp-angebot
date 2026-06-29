import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// PATCH /api/admin/track-views/[id]
// Body: { isInternal: boolean }
//
// Manuelles Umklassifizieren einer Track-Session als "intern" (= Pulp)
// oder "extern" (= Kunde). Wird im Admin-Tracking-UI per Toggle gesetzt.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  let body: { isInternal?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })
  }
  if (typeof body.isInternal !== 'boolean') {
    return NextResponse.json({ error: 'isInternal muss boolean sein' }, { status: 400 })
  }

  // Cast, weil Prisma-Client in der Sandbox nicht regeneriert wird.
  const trackDb = prisma as unknown as {
    trackView: {
      update: (a: unknown) => Promise<{ id: string; isInternal: boolean }>
    }
  }

  try {
    const updated = await trackDb.trackView.update({
      where: { id: params.id },
      data: { isInternal: body.isInternal },
      select: { id: true, isInternal: true },
    })
    return NextResponse.json(updated)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update fehlgeschlagen'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
