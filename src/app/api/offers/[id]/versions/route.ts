import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiKey } from '@/lib/auth'

// GET /api/offers/:id/versions — Get version history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireApiKey(request)
  if (authError) return authError

  const versions = await prisma.offerVersion.findMany({
    where: { offerId: params.id },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      changedBy: true,
      createdAt: true,
    },
  })

  return NextResponse.json(versions)
}
