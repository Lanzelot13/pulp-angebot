import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const refs = await prisma.reference.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json(refs)
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const ref = await prisma.reference.create({
    data: {
      name: body.name,
      description: body.description || '',
      tags: body.tags || [],
      imageUrl: body.imageUrl || null,
      sortOrder: body.sortOrder || 0,
    },
  })
  return NextResponse.json(ref, { status: 201 })
}
