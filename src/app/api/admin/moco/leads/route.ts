import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { searchDeals, createDeal, MocoError, type MocoDeal } from '@/lib/moco'

export const dynamic = 'force-dynamic'

// GET /api/admin/moco/leads?q=alao
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const term = (request.nextUrl.searchParams.get('q') || '').trim()
  if (!term) return NextResponse.json([])

  try {
    const deals = await searchDeals(term)
    return NextResponse.json(deals)
  } catch (e) {
    const status = e instanceof MocoError ? e.status || 500 : 500
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Moco-Fehler' },
      { status }
    )
  }
}

interface CreateLeadBody {
  name?: string
  company_id?: number
  user_id?: number
  deal_category_id?: number
  money?: number
  currency?: string
  status?: MocoDeal['status']
  closing_date?: string
  reminder_date?: string
  info?: string
}

// POST /api/admin/moco/leads
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  let body: CreateLeadBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })
  }

  if (!body.name || !body.company_id || !body.user_id || !body.deal_category_id) {
    return NextResponse.json(
      { error: 'Pflichtfelder fehlen: name, company_id, user_id, deal_category_id' },
      { status: 400 }
    )
  }

  try {
    const deal = await createDeal({
      name: body.name,
      company_id: body.company_id,
      user_id: body.user_id,
      deal_category_id: body.deal_category_id,
      money: body.money ?? 0,
      currency: body.currency,
      status: body.status,
      closing_date: body.closing_date,
      reminder_date: body.reminder_date,
      info: body.info,
    })
    return NextResponse.json(deal, { status: 201 })
  } catch (e) {
    const status = e instanceof MocoError ? e.status || 500 : 500
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Moco-Fehler' },
      { status }
    )
  }
}
