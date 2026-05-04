import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/channels — List all social channels
export async function GET() {
  const channels = await prisma.channel.findMany({
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json(channels)
}
