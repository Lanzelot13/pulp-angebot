import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const channels = await prisma.channel.findMany({ orderBy: { sortOrder: 'asc' } })
  return NextResponse.json(channels)
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const channel = await prisma.channel.create({
    data: {
      name: body.name,
      icon: body.icon || null,
      sortOrder: body.sortOrder || 0,
    },
  })
  return NextResponse.json(channel, { status: 201 })
}
