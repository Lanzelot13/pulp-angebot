/**
 * Helpers für die /api/track/*-Endpoints.
 */

import type { NextRequest } from 'next/server'

export type DeviceClass = 'mobile' | 'tablet' | 'desktop'

export function detectDevice(userAgent: string | null | undefined): DeviceClass {
  if (!userAgent) return 'desktop'
  const ua = userAgent
  if (/iPad|Android(?!.*Mobile)|Tablet|Kindle|PlayBook/i.test(ua)) return 'tablet'
  if (/Mobi|Android.*Mobile|iPhone|iPod|Windows Phone|BlackBerry|Opera Mini/i.test(ua)) return 'mobile'
  return 'desktop'
}

export function readGeoHeaders(req: NextRequest): { country: string | null; region: string | null } {
  // Vercel Edge fügt diese Header bei Production-Requests an.
  // Lokal sind sie null, das ist ok.
  const country = req.headers.get('x-vercel-ip-country') || null
  const region = req.headers.get('x-vercel-ip-country-region') || null
  return { country, region }
}

export function safeReferrer(req: NextRequest): string | null {
  const ref = req.headers.get('referer') || null
  if (!ref) return null
  // Nur Origin behalten, keine Query-Parameter (DSGVO-freundlicher)
  try {
    const u = new URL(ref)
    return `${u.protocol}//${u.host}${u.pathname}`
  } catch {
    return null
  }
}

export function safeUserAgent(req: NextRequest): string | null {
  const ua = req.headers.get('user-agent') || null
  if (!ua) return null
  // Auf 255 Zeichen kürzen
  return ua.slice(0, 255)
}
