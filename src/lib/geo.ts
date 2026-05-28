/**
 * Geo-Helper: ISO-3166-1 Country-Codes + ISO-3166-2 Region-Codes in
 * lesbaren Text mit Flag-Emoji umwandeln.
 *
 * Wir liefern Klartext-Mappings für DACH (Pulpmedia-Hauptmarkt). Für andere
 * Länder bleibt der rohe Code als Fallback erhalten, damit nichts verloren
 * geht.
 */

// ISO 3166-2:AT — Bundesländer Österreichs
const AT_REGIONS: Record<string, string> = {
  '1': 'Burgenland',
  '2': 'Kärnten',
  '3': 'Niederösterreich',
  '4': 'Oberösterreich',
  '5': 'Salzburg',
  '6': 'Steiermark',
  '7': 'Tirol',
  '8': 'Vorarlberg',
  '9': 'Wien',
}

// ISO 3166-2:DE — Bundesländer Deutschlands
const DE_REGIONS: Record<string, string> = {
  BW: 'Baden-Württemberg',
  BY: 'Bayern',
  BE: 'Berlin',
  BB: 'Brandenburg',
  HB: 'Bremen',
  HH: 'Hamburg',
  HE: 'Hessen',
  MV: 'Mecklenburg-Vorpommern',
  NI: 'Niedersachsen',
  NW: 'Nordrhein-Westfalen',
  RP: 'Rheinland-Pfalz',
  SL: 'Saarland',
  SN: 'Sachsen',
  ST: 'Sachsen-Anhalt',
  SH: 'Schleswig-Holstein',
  TH: 'Thüringen',
}

// ISO 3166-2:CH — Kantone der Schweiz
const CH_REGIONS: Record<string, string> = {
  AG: 'Aargau',
  AR: 'Appenzell Ausserrhoden',
  AI: 'Appenzell Innerrhoden',
  BL: 'Basel-Landschaft',
  BS: 'Basel-Stadt',
  BE: 'Bern',
  FR: 'Freiburg',
  GE: 'Genf',
  GL: 'Glarus',
  GR: 'Graubünden',
  JU: 'Jura',
  LU: 'Luzern',
  NE: 'Neuenburg',
  NW: 'Nidwalden',
  OW: 'Obwalden',
  SH: 'Schaffhausen',
  SZ: 'Schwyz',
  SO: 'Solothurn',
  SG: 'St. Gallen',
  TG: 'Thurgau',
  TI: 'Tessin',
  UR: 'Uri',
  VS: 'Wallis',
  VD: 'Waadt',
  ZG: 'Zug',
  ZH: 'Zürich',
}

const REGION_MAPS: Record<string, Record<string, string>> = {
  AT: AT_REGIONS,
  DE: DE_REGIONS,
  CH: CH_REGIONS,
}

const COUNTRY_NAMES: Record<string, string> = {
  AT: 'Österreich',
  DE: 'Deutschland',
  CH: 'Schweiz',
  // Häufige Nachbarländer / EU
  IT: 'Italien',
  FR: 'Frankreich',
  ES: 'Spanien',
  NL: 'Niederlande',
  BE: 'Belgien',
  PL: 'Polen',
  CZ: 'Tschechien',
  SK: 'Slowakei',
  HU: 'Ungarn',
  SI: 'Slowenien',
  HR: 'Kroatien',
  DK: 'Dänemark',
  SE: 'Schweden',
  FI: 'Finnland',
  NO: 'Norwegen',
  GB: 'Großbritannien',
  IE: 'Irland',
  PT: 'Portugal',
  GR: 'Griechenland',
  US: 'USA',
  CA: 'Kanada',
}

/**
 * Wandelt einen 2-Buchstaben-Country-Code in das passende Flaggen-Emoji um.
 * Z.B. "AT" → "🇦🇹". Funktioniert für jedes valide ISO-Land.
 */
export function countryFlag(country: string | null | undefined): string {
  if (!country || country.length !== 2) return ''
  const code = country.toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return ''
  // Regional Indicator Symbols beginnen bei U+1F1E6 (für "A")
  const base = 0x1f1e6
  return String.fromCodePoint(
    base + code.charCodeAt(0) - 65,
    base + code.charCodeAt(1) - 65
  )
}

/**
 * Liefert einen lesbaren Geo-String mit Flagge.
 * Beispiele:
 *   formatGeo('AT', '9')  → "🇦🇹 Wien, Österreich"
 *   formatGeo('DE', 'BY') → "🇩🇪 Bayern, Deutschland"
 *   formatGeo('IE', 'D')  → "🇮🇪 Irland (D)"     (kein Region-Mapping)
 *   formatGeo('IE', null) → "🇮🇪 Irland"
 *   formatGeo(null, null) → "–"
 */
export function formatGeo(
  country: string | null | undefined,
  region: string | null | undefined
): string {
  if (!country) return '–'
  const cc = country.toUpperCase()
  const flag = countryFlag(cc)
  const countryName = COUNTRY_NAMES[cc] || cc

  // Region normalisieren: "AT-9" → "9", "DE-BY" → "BY"
  const rawRegion = (region || '').toUpperCase().replace(/^[A-Z]{2}-/, '')
  const regionMap = REGION_MAPS[cc]
  const regionName = rawRegion && regionMap ? regionMap[rawRegion] : null

  const prefix = flag ? `${flag} ` : ''
  if (regionName) {
    return `${prefix}${regionName}, ${countryName}`
  }
  if (rawRegion) {
    // Region vorhanden, aber kein Mapping: rohen Code in Klammern beibehalten,
    // damit die Info nicht verloren geht
    return `${prefix}${countryName} (${rawRegion})`
  }
  return `${prefix}${countryName}`
}
