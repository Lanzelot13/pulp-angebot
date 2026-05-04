import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/contacts — List all team contacts (public, used by skill)
export async function GET() {
  const contacts = await prisma.contact.findMany({
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(contacts)
}
