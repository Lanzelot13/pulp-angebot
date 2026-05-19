// =========================================================
// Pitch module types
// =========================================================
//
// Pitch-Module sind die wiederverwendbaren Bausteine der
// Agenturpräsentation. Jedes Modul hat einen Typ, der
// festlegt, wie es im Frontend gerendert wird, und einen
// `content`-JSON, dessen Struktur vom Typ abhängt.
//
// Beim Hinzufügen zu einer Pitch wird der Content statisch
// reinkopiert (Snapshot) – Änderungen am globalen Modul
// werden im Pitch nur per "Aktualisieren"-Button übernommen.

export type PitchModuleType =
  | 'hero'
  | 'manifest'
  | 'text'
  | 'stats-grid'
  | 'team-grid'
  | 'fun-facts'
  | 'services-grid'
  | 'service-detail'
  | 'video'
  | 'image'
  | 'outro'

export const PITCH_MODULE_TYPES: PitchModuleType[] = [
  'hero',
  'manifest',
  'text',
  'stats-grid',
  'team-grid',
  'fun-facts',
  'services-grid',
  'service-detail',
  'video',
  'image',
  'outro',
]

export const PITCH_MODULE_LABELS: Record<PitchModuleType, string> = {
  'hero': 'Hero / Begrüßung',
  'manifest': 'Manifest / Claim',
  'text': 'Freitext-Block',
  'stats-grid': 'Zahlen-Grid',
  'team-grid': 'Team / Pulpies',
  'fun-facts': 'Fun Facts',
  'services-grid': 'Services Übersicht',
  'service-detail': 'Service Detail',
  'video': 'Video',
  'image': 'Bild',
  'outro': 'Outro / Abschluss',
}

// =========================================================
// Content-Strukturen pro Typ
// =========================================================

export interface HeroContent {
  eyebrow?: string
  title: string
  subtitle?: string
  image?: string
}

export interface ManifestContent {
  statement: string
  attribution?: string
}

export interface TextContent {
  headline?: string
  body: string
}

export interface StatItem {
  number: string
  label: string
}

export interface StatsGridContent {
  headline?: string
  items: StatItem[]
}

export interface TeamGridContent {
  headline?: string
  personSlugs: string[]
}

export interface FunFactItem {
  emoji?: string
  text: string
}

export interface FunFactsContent {
  headline?: string
  items: FunFactItem[]
}

export interface ServicesGridItem {
  title: string
  tagline: string
  icon?: string
}

export interface ServicesGridContent {
  headline?: string
  items: ServicesGridItem[]
}

export interface ServiceDetailContent {
  eyebrow?: string
  headline: string
  slogan: string
  body: string
  promises: string[]
}

export interface VideoContent {
  url: string
  caption?: string
  poster?: string
}

export interface ImageContent {
  url: string
  caption?: string
  alt?: string
}

export interface OutroContent {
  headline?: string
  text?: string
}

export type ModuleContent =
  | HeroContent
  | ManifestContent
  | TextContent
  | StatsGridContent
  | TeamGridContent
  | FunFactsContent
  | ServicesGridContent
  | ServiceDetailContent
  | VideoContent
  | ImageContent
  | OutroContent

// =========================================================
// Default-Templates pro Typ
// =========================================================
//
// Beim Anlegen eines neuen Moduls wird das passende Default-
// Template in den Content-Editor geladen, damit der User
// sofort eine Struktur hat, die er bearbeiten kann.

export const DEFAULT_CONTENT: Record<PitchModuleType, ModuleContent> = {
  'hero': {
    eyebrow: 'Hallo!',
    title: 'Wir sind Pulpmedia.',
    subtitle: 'Nice to meet you. Dürfen wir uns vorstellen?',
  },
  'manifest': {
    statement: 'Make love. Not ads.',
    attribution: 'Pulpmedia Manifest',
  },
  'text': {
    headline: 'Überschrift',
    body: 'Hier kommt dein Text.',
  },
  'stats-grid': {
    headline: 'Pulpmedia in Zahlen',
    items: [
      { number: '2005', label: 'Gegründet' },
      { number: '25', label: 'Pulpies' },
      { number: '1 Mio+', label: 'Fans' },
      { number: '150+', label: 'Projekte' },
    ],
  },
  'team-grid': {
    headline: 'Wer ist heute da',
    personSlugs: [],
  },
  'fun-facts': {
    headline: 'Unnützes Wissen',
    items: [
      { emoji: '📚', text: '3 Bücher geschrieben' },
      { emoji: '🎲', text: 'Brettspiele-Liebhaber' },
      { emoji: '💸', text: 'Millionärsmacher' },
      { emoji: '🎯', text: '1 Mio Fans betreut' },
    ],
  },
  'services-grid': {
    headline: 'Unsere fünf Säulen',
    items: [
      { title: 'Hero Videos', tagline: 'User fesseln, Geschichten erzählen' },
      { title: 'Social Media', tagline: 'Community, Content, Conversation' },
      { title: 'Influencer', tagline: 'Glaubwürdige Stimmen, echte Reichweite' },
      { title: 'Experience', tagline: 'Events, Pop-ups, Aktivierungen' },
      { title: 'Merchandise', tagline: 'Konzept, Design, Shop' },
    ],
  },
  'service-detail': {
    eyebrow: 'Service',
    headline: 'Hero Videos',
    slogan: 'User fesseln, statt nur zu unterhalten.',
    body: 'Wir produzieren Videos, die Aufmerksamkeit halten, weil sie Geschichten erzählen statt Botschaften zu schreien. Vom Konzept bis zum finalen Schnitt aus einer Hand.',
    promises: [
      'Konzept, das hängen bleibt',
      'Produktion auf den Punkt',
      'Schnitt mit Gefühl',
      'Distribution mitgedacht',
    ],
  },
  'video': {
    url: 'https://example.com/video.mp4',
    caption: 'Beschreibung des Videos',
  },
  'image': {
    url: 'https://example.com/image.jpg',
    alt: 'Beschreibung',
    caption: 'Optionale Bildunterschrift',
  },
  'outro': {
    headline: 'Danke!',
    text: 'Wir freuen uns auf den nächsten Schritt mit euch.',
  },
}
