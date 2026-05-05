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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.url !== undefined) {
    data.url = body.url
    data.platform = body.platform || detectPlatform(body.url)
  }
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder

  const channel = await prisma.channel.update({
    where: { id: params.id },
    data,
  })
  return NextResponse.json(channel)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  await prisma.channel.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
