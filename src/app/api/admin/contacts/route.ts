import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

// GET /api/admin/contacts
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const contacts = await prisma.contact.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(contacts)
}

// POST /api/admin/contacts — Create
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const body = await request.json()
  const contact = await prisma.contact.create({
    data: {
      slug: body.slug,
      name: body.name,
      role: body.role || '',
      email: body.email || '',
      phone: body.phone || '',
      avatarUrl: body.avatarUrl || null,
    },
  })
  return NextResponse.json(contact, { status: 201 })
}
