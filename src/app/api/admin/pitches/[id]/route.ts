import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { createSlug } from '@/lib/slug'
import { snapshotPitch } from '@/lib/pitch-versions'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const pitch = await prisma.pitch.findUnique({
    where: { id: params.id },
    include: { contact: true },
  })
  if (!pitch) {
    return NextResponse.json({ error: 'Pitch nicht gefunden' }, { status: 404 })
  }
  return NextResponse.json(pitch)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const data: Record<string, unknown> = {}

  if (body.clientCompany !== undefined) data.clientCompany = body.clientCompany
  if (body.occasion !== undefined) data.occasion = body.occasion || null
  if (body.contactSlug !== undefined) data.contactSlug = body.contactSlug
  if (body.status !== undefined) data.status = body.status

  // Slug change: either explicit or empty string → regenerate from clientCompany
  if (body.slug !== undefined) {
    const desired = (body.slug || '').trim()
    if (desired) {
      const conflict = await prisma.pitch.findFirst({
        where: { slug: desired, NOT: { id: params.id } },
      })
      if (conflict) {
        return NextResponse.json(
          { error: 'Slug ist bereits vergeben' },
          { status: 409 }
        )
      }
      data.slug = desired
    }
  } else if (body.clientCompany !== undefined && body.regenerateSlug) {
    data.slug = createSlug(body.clientCompany)
  }

  await snapshotPitch({ pitchId: params.id, changedBy: 'admin' })
  const pitch = await prisma.pitch.update({
    where: { id: params.id },
    data: { ...data, version: { increment: 1 } },
    include: { contact: true },
  })
  return NextResponse.json(pitch)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  await prisma.pitch.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
