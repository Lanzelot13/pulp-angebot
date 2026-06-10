import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { syncPulpiesFromWebsite } from '@/lib/pulpies'

export const dynamic = 'force-dynamic'

// Triggert einen Sync von pulpmedia.at/people in die lokale DB.
// Per Admin-UI-Button aufgerufen.
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  try {
    const result = await syncPulpiesFromWebsite()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync fehlgeschlagen'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
