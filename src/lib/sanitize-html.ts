// =========================================================
// Minimaler HTML-Sanitizer für den Module-Body-WYSIWYG
// =========================================================
//
// Erlaubt: <b>, <strong>, <i>, <em>, <u>, <a href> mit http(s)/mailto/tel,
// <br>. Alle anderen Tags werden entfernt, sämtliche Event-Handler und
// "javascript:"-URLs werden ausgefiltert. Keine externe Dependency
// damit das Build-Bundle schlank bleibt.

const ALLOWED_TAGS = new Set(['b', 'strong', 'i', 'em', 'u', 'a', 'br'])
const ALLOWED_HREF_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']

function sanitizeHref(rawHref: string): string | null {
  const trimmed = rawHref.trim()
  if (!trimmed) return null
  // Versuche zu parsen, akzeptiere relative URLs nur wenn sie mit / starten
  try {
    const u = new URL(trimmed, 'https://example.invalid')
    if (u.origin === 'https://example.invalid') {
      // relative URL — nur mit führendem / oder # erlauben
      if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed
      return null
    }
    if (!ALLOWED_HREF_PROTOCOLS.includes(u.protocol)) return null
    return u.toString()
  } catch {
    return null
  }
}

export function sanitizeRichText(input: string | null | undefined): string {
  if (!input) return ''
  // Schneller Pfad: kein < drin -> kein HTML
  if (!input.includes('<')) return input

  // Sehr einfacher Tag-Parser: ersetzt alle <tag attr...> und </tag>
  // gegen sanitisierte Versionen, alles andere wird stehen gelassen
  // (Text-Knoten bleiben unangetastet).
  return input.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g,
    (match, rawTag: string, rawAttrs: string) => {
      const tag = rawTag.toLowerCase()
      if (!ALLOWED_TAGS.has(tag)) return ''

      const isClosing = match.startsWith('</')
      if (isClosing) return `</${tag}>`

      if (tag === 'br') return '<br>'

      if (tag === 'a') {
        // Attributes vorsichtig parsen: nur href akzeptieren
        const hrefMatch = rawAttrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)')/i)
        const href = hrefMatch?.[2] ?? hrefMatch?.[3] ?? ''
        const safeHref = sanitizeHref(href)
        if (!safeHref) return '<a>'
        const isExternal =
          /^https?:\/\//i.test(safeHref) ||
          /^mailto:/i.test(safeHref) ||
          /^tel:/i.test(safeHref)
        return isExternal
          ? `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">`
          : `<a href="${safeHref}">`
      }

      return `<${tag}>`
    }
  )
}
