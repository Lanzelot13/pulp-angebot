import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { createSlug } from '@/lib/slug'

export const dynamic = 'force-dynamic'

const VALID_PLATFORMS = new Set(['youtube', 'tiktok', 'instagram', 'facebook', 'other'])

function detectPlatform(url: string): string {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube'
  if (/tiktok\.com/i.test(url)) return 'tiktok'
  if (/instagram\.com/i.test(url)) return 'instagram'
  if (/facebook\.com|fb\.com/i.test(url)) return 'facebook'
  return 'other'
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const refs = await prisma.caseReference.findMany({
    orderBy: [{ archivedAt: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(refs)
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  if (!body.name || !body.url) {
    return NextResponse.json({ error: 'name und url sind Pflicht' }, { status: 400 })
  }
  const slug = (body.slug as string)?.trim() || createSlug(body.name)
  const platform = VALID_PLATFORMS.has(body.platform) ? body.platform : detectPlatform(body.url)

  try {
    const ref = await prisma.caseReference.create({
      data: {
        slug,
        name: body.name.trim(),
        url: body.url.trim(),
        platform,
        description: body.description?.trim() || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        sortOrder: body.sortOrder ?? 0,
      },
    })
    return NextResponse.json(ref, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Anlegen fehlgeschlagen'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
