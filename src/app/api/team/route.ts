import { NextResponse } from 'next/server'
import { fetchTeam } from '@/lib/team'

// Keine Auth: die Daten sind sowieso öffentlich auf pulpmedia.at zu sehen,
// und der Pitch-Renderer für Kunden braucht den Endpunkt.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { people, fetchedAt, fromCache } = await fetchTeam()
    return NextResponse.json({ people, fetchedAt, fromCache })
  } catch (err) {
    return NextResponse.json(
      {
        people: [],
        fetchedAt: null,
        fromCache: false,
        error:
          err instanceof Error ? err.message : 'Team konnte nicht geladen werden',
      },
      { status: 200 } // Soft-Fail: leeres Team statt 500, damit die Pitch trotzdem läuft
    )
  }
}
