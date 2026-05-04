/**
 * Creates a URL-safe slug from company name and optional offer number.
 * e.g. "Rosenberger Telematics GmbH" + "DRAFT-RT-2026-001"
 *   → "rosenberger-telematics-gmbh-draft-rt-2026-001"
 */
export function createSlug(companyName: string, offerNumber?: string): string {
  const base = companyName
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  if (offerNumber) {
    const num = offerNumber
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    return `${base}-${num}`
  }

  return base
}
