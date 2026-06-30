import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Öffentlich, weil der Pitch-Skill (Bearer-Auth) und das Public-Renderer-System
// hier auf den Pool zugreifen.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const refs = await prisma.caseReference.findMany({
      where: { archivedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return NextResponse.json(refs)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
