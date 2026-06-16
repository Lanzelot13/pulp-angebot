import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/pitches/:id/versions
// Liste aller historischen Versionen einer Pitch, neueste zuerst.
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const versions = await prisma.pitchVersion.findMany({
    where: { pitchId: params.id },
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
