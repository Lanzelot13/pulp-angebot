import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { searchCompanies, createCustomerCompany, MocoError } from '@/lib/moco'

export const dynamic = 'force-dynamic'

// GET /api/admin/moco/companies?q=alao
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const term = (request.nextUrl.searchParams.get('q') || '').trim()
  if (!term) return NextResponse.json([])

  try {
    const companies = await searchCompanies(term)
    return NextResponse.json(companies)
  } catch (e) {
    const status = e instanceof MocoError ? e.status || 500 : 500
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Moco-Fehler' },
      { status }
    )
  }
}

// POST /api/admin/moco/companies
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  let body: { name?: string; country_code?: string; website?: string; email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })
  }

  const name = (body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Name fehlt' }, { status: 400 })

  try {
    const company = await createCustomerCompany({
      name,
      country_code: body.country_code,
      website: body.website,
      email: body.email,
    })
    return NextResponse.json(company, { status: 201 })
  } catch (e) {
    const status = e instanceof MocoError ? e.status || 500 : 500
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Moco-Fehler' },
      { status }
    )
  }
}
