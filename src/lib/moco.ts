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
    const detail =
      typeof parsed === 'object' && parsed && 'message' in (parsed as Record<string, unknown>)
        ? String((parsed as Record<string, unknown>).message)
        : typeof parsed === 'string'
        ? parsed.slice(0, 300)
        : `HTTP ${res.status}`
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
  return call<MocoDeal>('POST', '/deals', {
    name: input.name,
    company_id: input.company_id,
    user_id: input.user_id,
    deal_category_id: input.deal_category_id,
    money: input.money,
    currency: input.currency || 'EUR',
    status: input.status || 'potential',
    reminder_date: input.reminder_date,
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
  title: string
  recipient_address?: string
  currency?: string
  tax?: number
  items: MocoOfferItem[]
}): Promise<MocoOffer> {
  return call<MocoOffer>('POST', '/offers', {
    deal_id: input.deal_id,
    company_id: input.company_id,
    date: input.date,
    title: input.title,
    recipient_address: input.recipient_address || '',
    currency: input.currency || 'EUR',
    tax: input.tax ?? 20,
    items: input.items,
  })
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
