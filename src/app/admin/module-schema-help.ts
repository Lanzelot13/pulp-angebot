import { PitchModuleType } from '@/lib/pitch-types'

// =========================================================
// Schema-Hilfe pro Modul-Typ
// =========================================================
//
// Statische Beschreibung jedes Felds, das im content-JSON erlaubt
// ist. Wird im Modul-Editor unter dem JSON-Block als kollabierbare
// Box angezeigt, damit man nicht raten muss.

export interface SchemaField {
  name: string
  type: string
  required?: boolean
  description: string
  example?: string
}

const STANDARD_HEADER: SchemaField[] = [
  { name: 'eyebrow', type: 'string', description: 'Kleiner Augenbrauen-Text über der Überschrift', example: '"Pulp · Lovebrands"' },
  { name: 'headline', type: 'string', description: 'Hauptüberschrift. `**Text**` wird rot.', example: '"So bauen wir **Lovebrands**"' },
  { name: 'sub', type: 'string', description: 'Untertitel oder kurzer Body unter der Überschrift', example: '"Konkrete Vorschläge, die wir umsetzen würden"' },
]

const EMBED_FIELD: SchemaField = {
  name: 'embed',
  type: 'object',
  required: true,
  description: 'Video-Embed. type: youtube | tiktok | instagram | video. Bei YouTube: id. Bei TikTok/Instagram: url. mute/loop/autoplay optional.',
  example: '{ type: "youtube", id: "abc123", mute: true }',
}

export const MODULE_SCHEMA: Record<PitchModuleType, SchemaField[]> = {
  hero: [
    { name: 'kicker1', type: 'string', description: 'Erster Zeilen-Kicker', example: '"ERSTGESPRÄCH"' },
    { name: 'kicker2', type: 'string', description: 'Datum/Zeit-Kicker', example: '"27.05.2026 · 14:00"' },
    { name: 'kicker3', type: 'string', description: 'Kunden-Kicker', example: '"FRONIUS"' },
    { name: 'greeting', type: 'string', description: 'Begrüßung', example: '"HALLO"' },
    { name: 'fromPulp', type: 'array', description: 'Personen von Pulp-Seite. Items: { name }', example: '[{ name: "Paul" }]' },
    { name: 'fromClient', type: 'array', description: 'Personen Kundenseite. Items: { name }', example: '[{ name: "Max Mustermann" }]' },
    { name: 'meetingPlace', type: 'string', description: 'Ort/Online-Hinweis', example: '"HQ Linz oder online"' },
  ],
  team: [
    { name: 'attendingSlugs', type: 'string[]', required: true, description: 'Slugs der heute Anwesenden. Werden farbig hervorgehoben.', example: '["paul-lanzerstorfer", "robert-bogner"]' },
    { name: 'headline', type: 'string', description: 'Überschrift. `**Text**` wird rot.', example: '"28 Pulpies, 2 sind **heute dabei**"' },
  ],
  numbers: [
    { name: 'items', type: 'array', required: true, description: 'Liste von Counter-Items: { iconKey, target, suffix, label, description }', example: '[{ iconKey: "skull", target: 21, suffix: "+", label: "Jahre Agentur" }]' },
  ],
  manifest: [
    { name: 'line1', type: 'string', required: true, description: 'Erste Zeile', example: '"DON\'T MAKE ADS."' },
    { name: 'line2', type: 'string', required: true, description: 'Zweite Zeile (wird rot)', example: '"MAKE LOVE"' },
    { name: 'body', type: 'string', description: 'Optionaler Fließtext darunter', example: '"Wir bauen keine Werbung..."' },
  ],
  uw: [
    ...STANDARD_HEADER,
    { name: 'cols', type: 'array', required: true, description: '3 Spalten mit Bild/Bildstapel + Heading + Sub', example: '[{ imageUrl, heading, sub }]' },
  ],
  spotlight: [
    { name: 'title', type: 'string', required: true, description: 'Überschrift in der Copy-Spalte', example: '"Wassertransferdruck"' },
    { name: 'body', type: 'string', description: 'Fließtext darunter', example: '"945 Mio Views auf einem Video..."' },
    { name: 'channelUrl', type: 'string', description: 'Klickbarer Link zum Kanal', example: '"https://tiktok.com/@..."' },
    { name: 'channelLabel', type: 'string', description: 'Anzeigetext für den Channel-Link', example: '"@wassertransferdruck"' },
    { name: 'metrics', type: 'array', required: true, description: 'Big Counter: { target, unit, label }', example: '[{ target: 945, unit: "Mio", label: "Views" }]' },
    EMBED_FIELD,
  ],
  'love-brands': [
    ...STANDARD_HEADER,
    { name: 'brandSlugs', type: 'string[]', required: true, description: 'Slugs der Brands aus dem Lovebrand-Pool', example: '["zipfer", "lidl", "rosenbauer"]' },
  ],
  saeulen: [
    ...STANDARD_HEADER,
    { name: 'pillars', type: 'array', required: true, description: 'Säulen: { iconKey, title, subtitle, body }', example: '[{ iconKey: "explosion", title: "Video", ... }]' },
  ],
  leistungen: [
    ...STANDARD_HEADER,
    { name: 'items', type: 'array', required: true, description: '9 Pakete: { iconKey, title, description }', example: '[{ iconKey: "explosion", title: "Workshops", ... }]' },
  ],
  'case-video': [
    EMBED_FIELD,
  ],
  'case-social': [
    { name: 'client', type: 'string', required: true, description: 'Kunden-Label oben', example: '"CASE · ZIPFER · INSTAGRAM"' },
    { name: 'title', type: 'string', required: true, description: 'Überschrift', example: '"Bier-Content, der"' },
    { name: 'titleAccent', type: 'string', description: 'Roter Akzent-Teil der Überschrift', example: '"angeschaut wird"' },
    { name: 'body', type: 'string', description: 'Fließtext', example: '"Native-Series mit fünf Creators..."' },
    { name: 'metrics', type: 'array', required: true, description: 'Kennzahlen: { value, label, accent? }', example: '[{ value: "8.4M", label: "Views", accent: true }]' },
    { name: 'platform', type: 'string', required: true, description: 'Plattform-Label unten', example: '"@zipferbier auf Instagram"' },
    { name: 'channelUrl', type: 'string', description: 'Link zum Kanal', example: '"https://instagram.com/zipferbier"' },
    EMBED_FIELD,
  ],
  monitor: [
    ...STANDARD_HEADER,
    { name: 'brand', type: 'string', required: true, description: 'Markenname. {brand} im headline wird damit ersetzt', example: '"Rosenbauer"' },
    { name: 'handle', type: 'string', required: true, description: 'TikTok-Handle ohne @', example: '"rosenbauergroup"' },
    { name: 'rank', type: 'a|b|c|d', required: true, description: 'Rang-Badge', example: '"a"' },
    { name: 'placement', type: 'string', description: 'Z.B. "Platz 12 von 66"', example: '"Platz 12 von 66"' },
    { name: 'posts', type: 'string', required: true, description: 'Anzahl Posts', example: '"105"' },
    { name: 'views', type: 'string', required: true, description: 'Views', example: '"10,2M"' },
    { name: 'interactions', type: 'string', required: true, description: 'Interaktionen', example: '"664,2K"' },
    { name: 'engagementRate', type: 'string', required: true, description: 'Eng.-Rate als String', example: '"6,51%"' },
    { name: 'comparison', type: 'array', required: true, description: 'Vergleichs-Reihen: { name, percent, value, focus?, ghost? }', example: '[{ name: "@brand", percent: 81, value: "6,51%", focus: true }]' },
  ],
  quote: [
    { name: 'text', type: 'string', required: true, description: 'Zitat-Text', example: '"„Dieter Pichler ist der Al Bundy..."' },
    { name: 'name', type: 'string', required: true, description: 'Name der zitierten Person', example: '"Gunnar Mursch"' },
    { name: 'role', type: 'string', required: true, description: 'Rolle/Funktion', example: '"Marketing-Leitung · Instadrive"' },
  ],
  process: [
    ...STANDARD_HEADER,
    { name: 'steps', type: 'array', required: true, description: 'Process-Schritte: { when, title }', example: '[{ when: "Woche 1", title: "Kick-off" }]' },
  ],
  fragen: [
    ...STANDARD_HEADER,
    { name: 'items', type: 'array', required: true, description: '3 Fragen: { title, titleAccent, body }', example: '[{ title: "Wie viel", titleAccent: "Brandlove", body: "..." }]' },
  ],
  tipps: [
    ...STANDARD_HEADER,
    { name: 'items', type: 'array', required: true, description: '3 Tipps: { iconKey, title, titleAccent, body }', example: '[{ iconKey: "smiley", title: "Bla", titleAccent: "Akzent", body: "..." }]' },
  ],
  ideas: [
    { name: 'eyebrow', type: 'string', description: 'Augenbrauen-Text', example: '"Was wir uns überlegt haben"' },
    { name: 'headline', type: 'string', description: 'Hauptüberschrift', example: '"Vier Ideen für"' },
    { name: 'headlineAccent', type: 'string', description: 'Roter Akzent-Teil', example: '"[Kunde] als Lovebrand"' },
    { name: 'sub', type: 'string', description: 'Untertitel', example: '"Konkrete Vorschläge..."' },
    { name: 'items', type: 'array', required: true, description: 'Idea-Items: { iconKey, title, body, imageUrl? }', example: '[{ iconKey: "explosion", title: "Hero-Film", body: "..." }]' },
  ],
  optionen: [
    ...STANDARD_HEADER,
    { name: 'options', type: 'array', required: true, description: '3 Pakete: { pkgName, iconKey, title, description }', example: '[{ pkgName: "01 · EINSTIEG", iconKey: "smiley", title: "...", description: "..." }]' },
  ],
  outro: [
    { name: 'email', type: 'string', required: true, description: 'Kontakt-E-Mail', example: '"hallo@pulpmedia.at"' },
    { name: 'phone', type: 'string', required: true, description: 'Telefon', example: '"+43 732 6300"' },
    { name: 'web', type: 'string', required: true, description: 'Web-URL', example: '"pulpmedia.at"' },
    { name: 'sig', type: 'string', description: 'Signatur-Spruch', example: '"DON\'T MAKE ADS. MAKE LOVE."' },
  ],
}

// Welche Module unterstützen den Standard-Header-Block (eyebrow/headline/sub)?
// Wird im Editor genutzt, um die Standard-Felder einzublenden.
export const MODULES_WITH_STANDARD_HEADER = new Set<PitchModuleType>([
  'uw',
  'love-brands',
  'saeulen',
  'leistungen',
  'monitor',
  'process',
  'fragen',
  'tipps',
  'optionen',
])
