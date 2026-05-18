import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import type { PackagesSection, PackageItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

// POST /api/admin/offers/:id/unlink-package
// Body: { packageIndex: number }
//
// Clears mocoOfferId on the chosen package. The Moco-Offer itself is NOT
// deleted — only the local link between tool and Moco is removed, so the
// package can be pushed again.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  let body: { packageIndex?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })
  }

  const packageIndex = body.packageIndex
  if (typeof packageIndex !== 'number' || packageIndex < 0) {
    return NextResponse.json({ error: 'packageIndex fehlt oder ungültig' }, { status: 400 })
  }

  const offer = await prisma.offer.findUnique({ where: { id: params.id } })
  if (!offer) {
    return NextResponse.json({ error: 'Angebot nicht gefunden' }, { status: 404 })
  }

  const packages = offer.packages as unknown as PackagesSection | null
  if (!packages?.items?.[packageIndex]) {
    return NextResponse.json({ error: 'Paket nicht gefunden' }, { status: 404 })
  }

  const updatedItems: PackageItem[] = packages.items.map((it, idx) =>
    idx === packageIndex ? { ...it, mocoOfferId: null } : it
  )
  const updatedPackages = { ...packages, items: updatedItems }

  await prisma.offer.update({
    where: { id: offer.id },
    data: { packages: updatedPackages as unknown as never },
  })

  return NextResponse.json({ packageIndex })
}
