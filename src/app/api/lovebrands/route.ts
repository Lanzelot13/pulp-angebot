import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Öffentlich, weil der Pitch-Renderer für Kunden den Pool lädt.
// Liefert nur aktive Brands.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const brands = await prisma.loveBrand.findMany({
      where: { archivedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(brands)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
