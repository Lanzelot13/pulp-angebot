/**
 * Slug-Generator für Angebots-URLs.
 *
 * Verwende immer mindestens Firmenname + Projektname, damit der Link den
 * Inhalt verrät. Beispiele:
 *   buildSlug({ company: "Brau Union", project: "Gösser Saurer Radler Soda Zitrone" })
 *     → "brauunion-goesser-saurer-radler-soda-zitrone"
 *   buildSlug({ company: "Linz Tourismus", project: "LinkedIn Workshop" })
 *     → "linz-tourismus-linkedin-workshop"
 *
 * Lange Slugs werden auf MAX_LEN Zeichen gekürzt (Wort-grenzen-bewusst).
 */

const MAX_LEN = 70

function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function trimAtWord(input: string, max: number): string {
  if (input.length <= max) return input
  const cut = input.slice(0, max)
  const lastDash = cut.lastIndexOf('-')
  return lastDash > max / 2 ? cut.slice(0, lastDash) : cut.replace(/-$/, '')
}

export function buildSlug(parts: {
  company: string
  project?: string
  offerNumber?: string
}): string {
  const segments: string[] = []
  const company = slugify(parts.company)
  if (company) segments.push(company)

  const project = slugify(parts.project || '')
  if (project && project !== company) segments.push(project)

  const number = slugify(parts.offerNumber || '')
  if (number) segments.push(number)

  const joined = segments.join('-').replace(/-+/g, '-')
  return trimAtWord(joined, MAX_LEN)
}

/**
 * @deprecated Verwende `buildSlug({ company, project, offerNumber })`.
 * Bleibt nur für Abwärtskompatibilität bestehender Aufrufer.
 */
export function createSlug(companyName: string, offerNumber?: string): string {
  return buildSlug({ company: companyName, offerNumber })
}
