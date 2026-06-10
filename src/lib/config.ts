/**
 * Globale URL-/Config-Konstanten.
 *
 * Die Public-Base-URL ist die Pulpmedia-Custom-Domain — niemals die
 * Vercel-Default-Domain. Sie wird in API-Responses verwendet, damit der
 * Skill (und alles andere) immer den Branded-Link zurückbekommt.
 */

export const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || 'https://angebot.pulpmedia.at'

export function fullOfferUrl(slug: string): string {
  return `${PUBLIC_BASE_URL}/o/${slug}`
}

export function fullEditUrl(slug: string, editToken: string): string {
  return `${PUBLIC_BASE_URL}/o/${slug}?edit=${editToken}`
}

export function fullCleanUrl(slug: string): string {
  return `${PUBLIC_BASE_URL}/o/${slug}?clean=1`
}
