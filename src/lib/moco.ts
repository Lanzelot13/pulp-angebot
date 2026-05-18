/**
 * Thin wrapper around the Moco REST API (https://github.com/hundertzehn/mocoapp-api-docs).
 *
 * Auth: Authorization: Token token=<MOCO_API_KEY>
 * Subdomain: MOCO_SUBDOMAIN (defaults to 'pulpmedia')
 */

const SUBDOMAIN = process.env.MOCO_SUBDOMAIN || 'pulpmedia'
const API_KEY = process.env.MOCO_API_KEY

export class MocoError extends Error {
  status?: number
  body?: unknown
  constructor(message: string, status?: number, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
    this.name = 'MocoError'
  }
}

/**
 * Moco returns validation errors in several shapes:
 *   { message: "..." }                                     — generic
 *   { errors: { field: ["msg1", "msg2"] } }                — ActiveRecord style
 *   { errors: [{ field, message }] }                       — alternative
 *   "..."                                                  — plain text
 * Plus arbitrary other shapes. This walker extracts a readable summary.
 */
function describeMocoError(parsed: unknown, status: number): string {
  if (typeof parsed === 'string') return parsed.slice(0, 400)
  if (!parsed || typeof parsed !== 'object') return `HTTP ${status}`

  const obj = parsed as Record<string, unknown>

  if (typeof obj.message === 'string') return obj.message

  const errors = obj.errors
  if (Array.isArray(errors)) {
    const parts = errors
      .map((e) => {
        if (typeof e === 'string') return e
        if (e && typeof e === 'object') {
          const ee = e as Record<string, unknown>
          if (typeof ee.message === 'string') {
            return ee.field ? `${ee.field}: ${ee.message}` : ee.message
          }
        }
        return null
      })
      .filter(Boolean)
    if (parts.length > 0) return parts.join(' · ')
  }

  if (errors && typeof errors === 'object') {
    const parts: string[] = []
    for (const [field, msgs] of Object.entries(errors as Record<string, unknown>)) {
      if (Array.isArray(msgs)) {
        parts.push(`${field}: ${msgs.join(', ')}`)
      } else if (typeof msgs === 'string') {
        parts.push(`${field}: ${msgs}`)
      }
    }
    if (parts.length > 0) return parts.join(' · ')
  }

  // Last resort: stringify
  try {
    return JSON.stringify(parsed).slice(0, 400)
  } catch {
    return `HTTP ${status}`
  }
}

function baseUrl(): string {
  return `https://${SUBDOMAIN}.mocoapp.com/api/v1`
}

function headers(): HeadersInit {
  if (!API_KEY) throw new MocoError('MOCO_API_KEY ist nicht gesetzt', 500)
  return {
    Authorization: `Token token=${API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

async function call<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const text = await res.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
  }
  if (!res.ok) {
    const detail = describeMocoError(parsed, res.status)
    throw new MocoError(`Moco-API antwortet ${res.status}: ${detail}`, res.status, parsed)
  }
  return parsed as T
}

// === Types ===

export interface MocoCompany {
  id: number
  type: 'customer' | 'supplier' | 'organization'
  name: string
  country_code?: string
  website?: string
  email?: string
}

export interface MocoDeal {
  id: number
  name: string
  status: 'potential' | 'pending' | 'won' | 'lost'
  money: number
  currency: string
  closing_date?: string | null
  reminder_date?: string | null
  category?: { id: number; name: string }
  user?: { id: number; firstname: string; lastname: string }
  company?: { id: number; name: string }
}

export interface MocoUser {
  id: number
  firstname: string
  lastname: string
  email: string
  active?: boolean
}

export interface MocoDealCategory {
  id: number
  name: string
}

export interface MocoOfferItem {
  type: 'item' | 'lump_sum' | 'title' | 'separator'
  title: string
  quantity?: number
  unit?: string
  unit_price?: number
}

export interface MocoOffer {
  id: number
  date: string
  title: string
  status: string
  total: number
  currency: string
}

// === Companies ===

export async function searchCompanies(term: string, limit = 20): Promise<MocoCompany[]> {
  const q = encodeURIComponent(term)
  return call<MocoCompany[]>(
    'GET',
    `/companies?type=customer&term=${q}&per_page=${limit}`
  )
}

export async function getCompany(id: number): Promise<MocoCompany> {
  return call<MocoCompany>('GET', `/companies/${id}`)
}

export async function createCustomerCompany(input: {
  name: string
  country_code?: string
  website?: string
  email?: string
}): Promise<MocoCompany> {
  return call<MocoCompany>('POST', '/companies', {
    type: 'customer',
    name: input.name,
    country_code: input.country_code || 'AT',
    website: input.website,
    email: input.email,
  })
}

// === Deals (Leads) ===

export async function searchDeals(term: string, limit = 20): Promise<MocoDeal[]> {
  const q = encodeURIComponent(term)
  return call<MocoDeal[]>('GET', `/deals?term=${q}&per_page=${limit}`)
}

export async function getDeal(id: number): Promise<MocoDeal> {
  return call<MocoDeal>('GET', `/deals/${id}`)
}

export async function createDeal(input: {
  name: string
  company_id: number
  user_id: number
  deal_category_id: number
  money: number
  currency?: string
  status?: MocoDeal['status']
  closing_date?: string
  reminder_date?: string
  info?: string
}): Promise<MocoDeal> {
  // reminder_date is required by Moco for deals. Default to today + 14 days
  // when the caller didn't supply one, so the UI can keep it optional.
  const reminder =
    input.reminder_date && input.reminder_date.length > 0
      ? input.reminder_date
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return call<MocoDeal>('POST', '/deals', {
    name: input.name,
    company_id: input.company_id,
    user_id: input.user_id,
    deal_category_id: input.deal_category_id,
    money: input.money,
    currency: input.currency || 'EUR',
    status: input.status || 'potential',
    reminder_date: reminder,
    closing_date: input.closing_date,
    info: input.info,
  })
}

// === Stammdaten ===

export async function listUsers(): Promise<MocoUser[]> {
  return call<MocoUser[]>('GET', '/users?include_archived=false&per_page=200')
}

export async function listDealCategories(): Promise<MocoDealCategory[]> {
  return call<MocoDealCategory[]>('GET', '/deal_categories?per_page=100')
}

// === Offers ===

export async function createOffer(input: {
  deal_id?: number
  company_id: number
  date: string // YYYY-MM-DD
  due_date?: string // YYYY-MM-DD, defaults to date + 14 days
  title: string
  recipient_address?: string
  currency?: string
  tax?: number
  items: MocoOfferItem[]
}): Promise<MocoOffer> {
  // Moco requires due_date for offers. Default to offer date + 14 days
  const dueDate =
    input.due_date && input.due_date.length > 0
      ? input.due_date
      : addDays(input.date, 14)

  return call<MocoOffer>('POST', '/offers', {
    deal_id: input.deal_id,
    company_id: input.company_id,
    date: input.date,
    due_date: dueDate,
    title: input.title,
    recipient_address: input.recipient_address || '',
    currency: input.currency || 'EUR',
    tax: input.tax ?? 20,
    items: input.items,
  })
}

function addDays(yyyyMmDd: string, days: number): string {
  const d = new Date(yyyyMmDd + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function offerWebUrl(offerId: number): string {
  return `https://${SUBDOMAIN}.mocoapp.com/offers/${offerId}`
}

export function dealWebUrl(dealId: number): string {
  return `https://${SUBDOMAIN}.mocoapp.com/deals/${dealId}`
}

export function companyWebUrl(companyId: number): string {
  return `https://${SUBDOMAIN}.mocoapp.com/companies/${companyId}`
}
