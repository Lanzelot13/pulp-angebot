import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/tools/brandmonitor/[id] — einzelner Scan
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const scan = await prisma.brandScan.findUnique({ where: { id: params.id } })
  if (!scan) {
    return NextResponse.json({ error: 'Scan nicht gefunden.' }, { status: 404 })
  }

  return NextResponse.json({
    id: scan.id,
    scrapedAt: scan.scrapedAt,
    ...(scan.data as Record<string, unknown>),
  })
}

// DELETE /api/admin/tools/brandmonitor/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  await prisma.brandScan.delete({ where: { id: params.id } }).catch(() => {})
  return NextResponse.json({ ok: true })
}
