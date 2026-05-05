import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

function detectPlatform(url: string): string {
  const lc = url.toLowerCase()
  if (lc.includes('instagram')) return 'instagram'
  if (lc.includes('facebook') || lc.includes('fb.com')) return 'facebook'
  if (lc.includes('linkedin')) return 'linkedin'
  if (lc.includes('youtube') || lc.includes('youtu.be')) return 'youtube'
  if (lc.includes('tiktok')) return 'tiktok'
  if (lc.includes('twitter') || lc.includes('x.com')) return 'x'
  if (lc.includes('pinterest')) return 'pinterest'
  return 'web'
}

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
      url: body.url,
      platform: body.platform || detectPlatform(body.url || ''),
      sortOrder: body.sortOrder || 0,
    },
  })
  return NextResponse.json(channel, { status: 201 })
}
