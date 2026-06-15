import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { createSlug } from '@/lib/slug'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const brands = await prisma.loveBrand.findMany({
    orderBy: [{ archivedAt: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(brands)
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  if (!body.name) {
    return NextResponse.json({ error: 'name fehlt' }, { status: 400 })
  }
  const slug = (body.slug as string)?.trim() || createSlug(body.name)
  const shape = ['default', 'badge', 'tall'].includes(body.shape) ? body.shape : 'default'
  try {
    const brand = await prisma.loveBrand.create({
      data: {
        slug,
        name: body.name,
        logoUrl: body.logoUrl || '',
        shape,
        invertOnDark: typeof body.invertOnDark === 'boolean' ? body.invertOnDark : true,
        sortOrder: body.sortOrder ?? 0,
      },
    })
    return NextResponse.json(brand, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Anlegen fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
