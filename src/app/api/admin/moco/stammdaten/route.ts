import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { listUsers, listDealCategories, MocoError } from '@/lib/moco'

export const dynamic = 'force-dynamic'

// GET /api/admin/moco/stammdaten
// Returns { users, dealCategories } for populating dropdowns when creating
// a new lead from the admin UI.
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const [users, dealCategories] = await Promise.all([
      listUsers(),
      listDealCategories(),
    ])
    return NextResponse.json({ users, dealCategories })
  } catch (e) {
    const status = e instanceof MocoError ? e.status || 500 : 500
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Moco-Fehler' },
      { status }
    )
  }
}
