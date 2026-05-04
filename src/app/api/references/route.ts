import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/references — List all reference projects
export async function GET() {
  const references = await prisma.reference.findMany({
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json(references)
}
