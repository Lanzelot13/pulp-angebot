// =========================================================
// Pitch module types — v2 (basierend auf v7-Deck "Cinema Noir")
// =========================================================
//
// Pitch-Module sind die wiederverwendbaren Bausteine der
// Agenturpräsentation. Jedes Modul hat einen Typ, der
// festlegt, wie es im Frontend gerendert wird, und einen
// `content`-JSON, dessen Struktur vom Typ abhängt.
//
// Beim Hinzufügen zu einem Pitch wird der Content statisch
// reinkopiert (Snapshot). Änderungen am globalen Modul
// werden im Pitch nur per "Aktualisieren"-Button übernommen.

export type PitchModuleType =
  | 'hero'
  | 'team'
  | 'numbers'
  | 'manifest'
  | 'uw'              // Unnützes Wissen · Origin Story
  | 'spotlight'       // Spotlight (Wassertransferdruck-Style): Phone-Video + Big Numbers
  | 'love-brands'
  | 'saeulen'         // 5 Säulen Hover-Reveal
  | 'leistungen'      // 9 Pakete 3x3
  | 'case-video'      // Hero-Case: Full-bleed 16:9 (clean, ohne Overlay)
  | 'case-social'     // Social-Case: Phone-Frame + KPIs
  | 'monitor'         // TikTok Brand Monitor Scorecard
  | 'quote'           // Testimonial
  | 'process'         // Process Timeline
  | 'fragen'          // 3 Flip-Card Fragen
  | 'tipps'           // 3 Flip-Card Tipps
  | 'optionen'        // 3 Pakete
  | 'outro'

export const PITCH_MODULE_TYPES: PitchModuleType[] = [
  'hero',
  'team',
  'numbers',
  'manifest',
  'uw',
  'spotlight',
  'love-brands',
  'saeulen',
  'leistungen',
  'case-video',
  'case-social',
  'monitor',
  'quote',
  'process',
  'fragen',
  'tipps',
  'optionen',
  'outro',
]

export const PITCH_MODULE_LABELS: Record<PitchModuleType, string> = {
  'hero': 'Hero · Begrüßung',
  'team': 'Team · Pulpies',
  'numbers': 'Drei Zahlen · Counter',
  'manifest': 'Manifest · Don\'t make Ads',
  'uw': 'Unnützes Wissen · Origin Story',
  'spotlight': 'Spotlight · Phone + Big Numbers',
  'love-brands': 'Love Brands · Logo-Grid',
  'saeulen': 'Fünf Säulen · Brandlove-System',
  'leistungen': 'Leistungen · 3x3 Pakete',
  'case-video': 'Case · Hero Video (16:9)',
  'case-social': 'Case · Social (Phone-Frame)',
  'monitor': 'TikTok Brand Monitor',
  'quote': 'Quote · Testimonial',
  'process': 'Process · Timeline',
  'fragen': 'Fragen · Flip-Cards',
  'tipps': 'Tipps · Flip-Cards',
  'optionen': 'Optionen · Drei Pakete',
  'outro': 'Outro · Let\'s talk',
}

export const PITCH_MODULE_DESCRIPTIONS: Record<PitchModuleType, string> = {
  'hero': 'Begrüßungsfolie mit Anlass, Datum, Kunde und Beteiligten.',
  'team': 'Alle Pulpies als Bild-Grid, die heute Anwesenden farbig hervorgehoben.',
  'numbers': 'Drei Counter-Zahlen mit Hochzähl-Animation beim Reinscrollen.',
  'manifest': '"Don\'t make Ads. Make Love." — unser Manifest groß.',
  'uw': 'Origin Story: 3-Spalten-Editorial mit Logo, Buchstapel und Jauch-Foto.',
  'spotlight': 'Phone-Frame mit Vertical-Video plus große Aufmerksamkeits-Zahlen daneben (Counter mit Mio/Mrd). Optionaler Fließtext und Channel-Link.',
  'love-brands': 'Logo-Grid mit den Marken, mit denen wir arbeiten.',
  'saeulen': 'Fünf Säulen interaktiv, fährt eine auseinander wenn man drüber hovert.',
  'leistungen': 'Neun Leistungspakete im 3x3-Raster.',
  'case-video': 'Full-bleed Case-Video (16:9) mit Overlay-Quote oben und Metriken unten.',
  'case-social': 'Phone-Frame-Case für TikTok oder Instagram mit Engagement-Zahlen.',
  'monitor': 'Live-Scorecard aus dem Pulp TikTok Brand Monitor.',
  'quote': 'Ein Kunden-Zitat groß und ruhig.',
  'process': 'Zeitliche Schritte vom Erstgespräch bis zum Go-Live.',
  'fragen': 'Drei Fragen, die wir als Anfang gerne stellen. Antippen dreht die Karte.',
  'tipps': 'Drei Tipps für die Pitch-Empfänger. Antippen dreht die Karte.',
  'optionen': 'Drei Einstiegs-Pakete als Karten.',
  'outro': 'Abschluss-Folie mit Kontaktdaten.',
}

// =========================================================
// Embed-Typen für Video-Slots
// =========================================================

export interface EmbedConfig {
  type: 'youtube' | 'video' | 'tiktok' | 'instagram' | ''
  id?: string         // YouTube-Video-ID oder TikTok-Video-ID
  url?: string        // Plattform-URL (TikTok-Permalink, Instagram-Permalink, MP4-URL für native video)
  autoplay?: boolean
  mute?: boolean
  loop?: boolean
  controls?: boolean
}

// =========================================================
// Content-Strukturen pro Typ
// =========================================================

export interface HeroPerson {
  name: string
}

export interface HeroContent {
  kicker1?: string             // "ERSTGESPRÄCH"
  kicker2?: string             // "27.05.2026 · 14:00"
  kicker3?: string             // "FRONIUS"
  greeting?: string            // "HALLO"
  // Zwei flexible Personen-Listen. Pulp-Seite zuerst, Kundenseite kann leer
  // bleiben (zb wenn wir nicht wissen, wer da kommt). Layout passt sich an.
  fromPulp?: HeroPerson[]
  fromClient?: HeroPerson[]
  meetingPlace?: string
}

export interface TeamContent {
  // Slug-Liste der heute Anwesenden. Die volle Pulpie-Liste wird live
  // von pulpmedia.at/people gefetcht; nur die hier genannten werden farbig
  // hervorgehoben.
  attendingSlugs: string[]
  // Optionaler Override für die Headline ("28 Pulpies, 4 sind heute dabei").
  headline?: string
}

export interface NumberItem {
  iconKey?: string         // z.B. "skull", "blitz", "heart", "smiley", "explosion"
  target: number           // Counter-Ziel
  suffix?: string          // "+", "K", "M"
  label: string            // "Jahre Agentur"
  description?: string     // "Seit 2005. Inhabergeführt."
}

export interface NumbersContent {
  items: NumberItem[]      // typischerweise 3
}

export interface ManifestContent {
  line1: string            // "DON'T MAKE ADS."
  line2: string            // "MAKE LOVE"
  body?: string
}

export interface UwColumn {
  imageUrl?: string        // einzelnes Bild
  imageStack?: string[]    // mehrere Bücher überlappend
  heading: string
  sub: string
}

export interface UwContent {
  cols: UwColumn[]         // typischerweise 3
}

export interface SpotlightContent {
  title: string                    // "Wassertransferdruck"
  body?: string                    // optionaler Fließtext
  channelUrl?: string              // Klickbarer Channel-Link
  channelLabel?: string            // Label für den Link, zb "@wassertransferdruck auf TikTok"
  // Big Counter-Metriken mit Mio/Mrd-Suffix.
  metrics: { target: number; unit?: string; label: string }[]
  embed: EmbedConfig
}

// Lovebrands kommen aus dem LoveBrand-Pool (siehe Prisma-Model). Pro Pitch
// werden hier nur die Slugs der gezeigten Brands gespeichert. Beim Render
// wird auf den Pool ge-join-t. So sind Logo, Name und Form zentral pflegbar.
export interface LoveBrandsContent {
  brandSlugs: string[]
}

// Render-Helper-Type für die Public-Page nach dem Pool-Join
export interface RenderedLoveBrand {
  slug: string
  name: string
  logoUrl: string
  shape: 'default' | 'badge' | 'tall'
  invertOnDark: boolean
}

export interface PillarItem {
  iconKey: string
  title: string            // "Video"
  subtitle: string         // "Brandlove fühlen"
  body: string
}

export interface SaeulenContent {
  pillars: PillarItem[]    // typischerweise 5
}

export interface LeistungItem {
  iconKey?: string
  title: string
  description: string
}

export interface LeistungenContent {
  items: LeistungItem[]    // typischerweise 9 für 3x3
}

// Case-Video ist absichtlich minimalistisch: nur das Video, kein Overlay-Text.
// Falls Begleittext gewünscht ist, wird der case-social Typ verwendet.
export interface CaseVideoContent {
  embed: EmbedConfig
}

export interface CaseSocialContent {
  client: string                   // "CASE · ZIPFER · TIKTOK"
  title: string
  titleAccent?: string             // Akzent-Teil in Rot
  body?: string                    // Fließtext, jetzt optional
  metrics: { value: string; label: string; accent?: boolean }[]
  platform: string                 // "TIKTOK · @ZIPFER" (Anzeige-Label)
  channelUrl?: string              // Klick öffnet Channel im neuen Tab
  embed: EmbedConfig
}

export interface MonitorRow {
  name: string
  percent: number          // 0..100, für Vergleichsbalken
  value: string            // "6,51%"
  focus?: boolean          // markiert die eigene Marke
  ghost?: boolean          // grau dargestellt
}

export interface MonitorContent {
  brand: string                    // "Rosenbauer"
  handle: string                   // "rosenbauergroup"
  rank: 'a' | 'b' | 'c' | 'd'
  placement?: string               // "Platz 12 von 66" – neben dem Rank-Badge
  posts: string
  views: string
  interactions: string
  engagementRate: string
  comparison: MonitorRow[]
}

export interface QuoteContent {
  text: string
  name: string
  role: string
}

export interface ProcessStep {
  when: string             // "Diese Woche", "Woche 1-2"
  title: string            // "Angebot & Abstimmung"
}

export interface ProcessContent {
  steps: ProcessStep[]
}

export interface FragenItem {
  title: string
  titleAccent?: string
  body: string
}

export interface FragenContent {
  items: FragenItem[]      // typischerweise 3
}

export interface TippsItem {
  iconKey?: string
  title: string
  titleAccent?: string
  body: string
}

export interface TippsContent {
  items: TippsItem[]       // typischerweise 3
}

export interface OptionenItem {
  pkgName: string          // "01 · EINSTIEG"
  iconKey?: string
  title: string
  description: string
}

export interface OptionenContent {
  options: OptionenItem[]  // typischerweise 3
}

export interface OutroContent {
  email: string
  phone: string
  web: string
  sig?: string             // "DON'T MAKE ADS. MAKE LOVE."
}

export type ModuleContent =
  | HeroContent
  | TeamContent
  | NumbersContent
  | ManifestContent
  | UwContent
  | SpotlightContent
  | LoveBrandsContent
  | SaeulenContent
  | LeistungenContent
  | CaseVideoContent
  | CaseSocialContent
  | MonitorContent
  | QuoteContent
  | ProcessContent
  | FragenContent
  | TippsContent
  | OptionenContent
  | OutroContent

// =========================================================
// Verfügbare Icon-Keys (Mapping zu public/pitch/*.svg)
// =========================================================
//
// Diese SVGs liegen in public/pitch/ und werden überall im Deck
// verwendet (Säulen, Leistungen, Number-Cards, etc).

export const PITCH_ICON_KEYS = [
  'skull',           // 33371e7b
  'heart',           // 26724611
  'smiley',          // a4ffa05a
  'blitz',           // e356859b -- wait, das ist heart-pixel. Mapping unten korrigiert.
  'pixel-heart',
  'cursor-hand',
  'explosion',
  'bomb',
  'blume',
  'horn',
] as const

export type PitchIconKey = typeof PITCH_ICON_KEYS[number]

// Mapping aus dem v7-Asset-Inventory:
//   33371e7b → Skull (Pulp)
//   a4ffa05a → Smiley
//   e356859b → Pixel-Herz
//   55613670 → ?
//   26724611 → Smiley-Variante
//   6e4617af → Explosion
//   d68a31e7 → ? (Anführungszeichen)
//   8ae2a4da → ?
//   da3d628b → ?
//   984b8ba2 → Cursor-Hand
//   ae3c7022 → Bombe
//   52151548 → ? (Outro)
//   e8818af3 → ? (Cursor)
//
// Da wir die SVGs nicht doppelt namen, behalten wir die UUID-Filenames
// und verweisen per Mapping. Erweitert sich mit der Zeit.

export const ICON_FILES: Record<string, string> = {
  'skull':        'pitch/33371e7b-b495-4d4a-9bcc-bfa6895fa683.svg',
  'smiley':       'pitch/a4ffa05a-6509-4ad1-b687-aab420bdb195.svg',
  'pixel-heart':  'pitch/e356859b-c7c0-4aa1-8604-215c16858fba.svg',
  'heart':        'pitch/26724611-a3c8-4fc1-9d45-522ea2e61c56.svg',
  'explosion':    'pitch/6e4617af-3bde-4e6a-9d12-045aacb10240.svg',
  'cursor-hand':  'pitch/984b8ba2-b9bf-47e7-aa12-3b1f7c9212a7.svg',
  'bomb':         'pitch/ae3c7022-b02c-40e9-88d4-87cdce74158b.svg',
  'blitz':        'pitch/d68a31e7-538d-4c27-a31a-4620b597fd09.svg',
  'horn':         'pitch/8ae2a4da-c3a7-4319-a6bb-9d32ab88422f.svg',
  'blume':        'pitch/da3d628b-69ed-4784-9040-0e48b0eaa459.svg',
  'rocket':       'pitch/984b8ba2-b9bf-47e7-aa12-3b1f7c9212a7.svg',  // fallback
}

// =========================================================
// Default-Templates pro Typ
// =========================================================

export const DEFAULT_CONTENT: Record<PitchModuleType, ModuleContent> = {
  'hero': {
    kicker1: 'ERSTGESPRÄCH',
    kicker2: 'TT.MM.JJJJ · HH:MM',
    kicker3: 'KUNDE',
    greeting: 'HALLO',
    fromPulp: [
      { name: 'Paul Lanzerstorfer' },
      { name: 'Robert Bogner' },
    ],
    fromClient: [],
    meetingPlace: 'HQ Linz oder online',
  } as HeroContent,
  'team': {
    attendingSlugs: [],   // pro Pitch im TeamPicker befüllen
  } as TeamContent,
  'numbers': {
    items: [
      { iconKey: 'skull',       target: 21,  suffix: '+', label: 'Jahre Agentur',       description: 'Seit 2005. Inhabergeführt.' },
      { iconKey: 'smiley',      target: 500, suffix: '+', label: 'Produktionen',        description: 'Hero Videos, Brand Stories, Social Cuts seit 2012.' },
      { iconKey: 'pixel-heart', target: 30,  suffix: '+', label: 'Betreute Lovebrands', description: 'Im DACH-Raum.' },
    ],
  } as NumbersContent,
  'manifest': {
    line1: "DON'T MAKE ADS.",
    line2: 'MAKE LOVE',
    body: 'Wir bauen keine Werbung. Wir bauen Beziehung zwischen Menschen und Marken, über Geschichten, die jemand sehen will, nicht sehen muss.',
  } as ManifestContent,
  'uw': {
    cols: [
      { imageUrl: 'pitch/be5620f5-40ab-4e17-adf0-a2f2fe92df5b.png', heading: 'Facebook-Seite', sub: '1 Mio Fans' },
      { imageStack: ['pitch/9df450ba-b7ae-4c34-810e-d57c5e97ce1b.png', 'pitch/a93d7893-c239-468b-b806-b63f60587e86.png', 'pitch/8629c299-211f-4924-a301-a5ba923ea3aa.png'], heading: '3 Bücher', sub: '2 davon Spiegel-Bestseller' },
      { imageUrl: 'pitch/30f097ff-2056-487e-8813-f707717c571d.jpg', heading: 'Millionärsmacher', sub: 'Sebastian Langrock bei Günther Jauch' },
    ],
  } as UwContent,
  'spotlight': {
    title: 'Wassertransferdruck',
    body: '',
    channelUrl: 'https://www.tiktok.com/@wassertransferdruck',
    channelLabel: '@wassertransferdruck auf TikTok',
    metrics: [
      { target: 945, unit: 'Mio', label: 'Views auf 1 Video' },
      { target: 6,   unit: 'Mio', label: 'Follower' },
      { target: 6,   unit: 'Mrd', label: 'Aufrufe gesamt' },
    ],
    embed: {
      type: 'tiktok',
      id: '7605516061701672214',
      url: 'https://www.tiktok.com/@wassertransferdruck/video/7605516061701672214',
      mute: true,
    },
  } as SpotlightContent,
  'love-brands': {
    // Pro Pitch entscheidet der Editor welche Brands gezeigt werden. Standard:
    // alle aktiven aus dem Pool — wird beim Render gefiltert.
    brandSlugs: [
      'zipfer', 'lidl', 'rosenbauer', 'efko', 'husqvarna', 'hornbach',
      'weber', 'internorm', 'pez', 'pago', 'yo', 'hohes-c',
    ],
  } as LoveBrandsContent,
  'saeulen': {
    pillars: [
      { iconKey: 'explosion',    title: 'Video',         subtitle: 'Brandlove fühlen',     body: 'Vom 6-Sekunden-Bumper bis zum Cinema-Cut. Wir konzipieren, produzieren und schneiden Markenfilme, die den Unterschied machen. Storytelling ist Handwerk, keine Tool-Frage.' },
      { iconKey: 'smiley',       title: 'Social Media',  subtitle: 'Brandlove-Community',  body: 'Tägliche Betreuung von Marken-Kanälen. Content, der Menschen anspricht, nicht Algorithmen. Strategie, Redaktion, Produktion, Community-Management aus einer Hand.' },
      { iconKey: 'heart',        title: 'Influencer',    subtitle: 'Brandlove-Trust',       body: 'Echte Stimmen, langfristige Partnerschaften, kein Reichweiten-Roulette. Wir scouten, briefen und steuern Creator und Mitarbeiter:innen, die für deine Marke sprechen.' },
      { iconKey: 'bomb',         title: 'Live Marketing', subtitle: 'Brandlove erleben',    body: 'Events, Pop-ups, Messeauftritte, Aktivierungen. Marken werden erlebt, nicht gelesen. Wir denken Live-Format und Content-Verwertung in einem Schritt.' },
      { iconKey: 'pixel-heart',  title: 'Merchandise',   subtitle: 'Brandlove zeigen',     body: 'Wenn jemand freiwillig dein Logo trägt, ist das der größte Liebesbeweis. Wir designen, produzieren und verteilen Marken-Merchandise auch in kleinen Auflagen.' },
    ],
  } as SaeulenContent,
  'leistungen': {
    items: [
      { iconKey: 'explosion',   title: 'Workshops',                description: 'Kick-off, Strategie-Tag, Format-Sprint. Wir holen ab, wo ihr steht.' },
      { iconKey: 'smiley',      title: 'Strategie-Paper',          description: 'Markenführung, Content-Strategie, Kanalstrategie. Schriftlich, klar, umsetzbar.' },
      { iconKey: 'heart',       title: 'Content-Day',              description: 'Ein Drehtag, mehrere Wochen Material. Effizient produziert, plattformgerecht geschnitten.' },
      { iconKey: 'blitz',       title: 'Videoproduktion',          description: 'Konzept, Dreh, Schnitt, Postproduktion. Eigenes Studio in Linz.' },
      { iconKey: 'bomb',        title: 'Social Media Redaktion',   description: 'Laufende Betreuung eurer Kanäle. Planung, Produktion, Veröffentlichung.' },
      { iconKey: 'pixel-heart', title: 'Community Marketing',      description: 'Aufbau und Pflege eurer Fan-Gemeinde. Antworten, Moderation, Aktivierung.' },
      { iconKey: 'horn',        title: 'Influencer Relationship',  description: 'Scouting, Briefing, Verträge, Kampagnen, Reporting. Langfristige Beziehungen statt Spot-Buchung.' },
      { iconKey: 'blume',       title: 'Live-Aktivierungen',       description: 'Events, Pop-ups, Messen, Aktionen. Inklusive Content-Verwertung danach.' },
      { iconKey: 'rocket',      title: 'Merchandise',              description: 'Design und Produktion. Auch kleine Auflagen, eigener Shop möglich.' },
    ],
  } as LeistungenContent,
  'case-video': {
    embed: {
      type: 'youtube',
      id: 'sbzBRcDysLs',
      mute: true,
    },
  } as CaseVideoContent,
  'case-social': {
    client: 'CASE · ZIPFER · INSTAGRAM',
    title: 'Bier-Content, der',
    titleAccent: 'angeschaut wird',
    body: 'Native-Series mit fünf Creators, 12 Wochen, 0 Werbeblock-Feel. Vom Sport-Stammtisch bis zur WG-Küche – Zipfer als Begleiter, nicht als Sponsor.',
    metrics: [
      { value: '8.4M',  label: 'Views · 90 Tage' },
      { value: '12,8%', label: 'Engagement-Rate', accent: true },
      { value: '+24k',  label: 'Follower-Lift' },
    ],
    platform: '@zipferbier auf Instagram',
    channelUrl: 'https://www.instagram.com/zipferbier/',
    embed: {
      type: 'instagram',
      url: 'https://www.instagram.com/reel/DSPIlM1iPy1/',
      mute: true,
      loop: true,
    },
  } as CaseSocialContent,
  'monitor': {
    brand: 'Rosenbauer',
    handle: 'rosenbauergroup',
    rank: 'a',
    placement: 'Platz 12 von 66',
    posts: '105',
    views: '10,2M',
    interactions: '664,2K',
    engagementRate: '6,51%',
    comparison: [
      { name: '@rosenbauergroup',       percent: 81, value: '6,51%', focus: true },
      { name: '@zotterschokolade · #1', percent: 88, value: '7,01%', ghost: true },
      { name: 'Ø aller 66 Marken',      percent: 24, value: '1,9%',  ghost: true },
    ],
  } as MonitorContent,
  'quote': {
    text: '„Dieter Pichler ist der Al Bundy der 2020er Jahre."',
    name: 'Gunnar Mursch',
    role: 'Marketing-Leitung · Instadrive GmbH',
  } as QuoteContent,
  'process': {
    steps: [
      { when: 'Diese Woche',                 title: 'Angebot & Abstimmung' },
      { when: 'Woche 1',                     title: 'Kick-off & Termin-Fixierung' },
      { when: 'Woche 2 – 4',                 title: 'Workshop' },
      { when: '2 Wochen nach Workshop',      title: 'Strategie-Paper' },
      { when: 'Woche 6 – 8',                 title: 'Produktion' },
      { when: '1 – 2 Wochen nach Produktion', title: 'Anlieferung Content' },
      { when: 'Nach 2 – 3 Monaten',          title: 'Review & nächste Schritte' },
    ],
  } as ProcessContent,
  'fragen': {
    items: [
      { title: 'Wie viel',  titleAccent: 'Brandlove',  body: 'steckt schon drin? Welchen Stellenwert hat das Thema bei euch — Herzensprojekt, Pflichtübung oder noch ganz frisch?' },
      { title: 'Wie seid ihr', titleAccent: 'aufgestellt?', body: 'Größe, Abläufe, Ressourcen in-house, eigene Produktion, Agenturlandschaft — wer macht bei euch was?' },
      { title: 'Welche', titleAccent: 'KPIs', body: 'zählen wirklich? Auf welche Zahlen schaut ihr besonders — und woran macht ihr Erfolg am Ende fest?' },
    ],
  } as FragenContent,
  // Tipps werden PRO KUNDE konkret befüllt. Default ist nur Platzhalter.
  'tipps': {
    items: [
      { iconKey: 'smiley',   title: 'Hier individuell für', titleAccent: '[Kunde] anpassen.', body: 'Konkreter Vorschlag, den der Kunde mit oder ohne uns umsetzen kann. Beispiel: "Langfristige Kooperationen mit drei bis fünf Creators statt One-Shots."' },
      { iconKey: 'bomb',     title: 'Zweiter konkreter', titleAccent: 'Vorschlag.', body: 'Etwas das auffällt wenn man die Kommunikation des Kunden beobachtet. Kein generisches Wissen.' },
      { iconKey: 'heart',    title: 'Dritter konkreter', titleAccent: 'Vorschlag.', body: 'Beispiel: "Eure Techniker-Insights auf LinkedIn aktivieren, das authentische Material liegt schon da."' },
    ],
  } as TippsContent,
  'optionen': {
    options: [
      { pkgName: '01 · EINSTIEG', iconKey: 'smiley',      title: 'Workshop + Strategie',  description: 'Brand-Sprint, Positionierungs-Workshop, Konzept-Papier. Eine geschlossene Lieferung, klarer Output — ihr könnt damit weiterarbeiten, mit oder ohne uns.' },
      { pkgName: '02 · PROJEKT',  iconKey: 'explosion',   title: 'Ein konkretes Projekt', description: 'Ein Hero-Cut, eine Social-Serie, ein Brand-Film, ein Event. Klarer Scope, klarer Zeitraum, klare Lieferung — mit unseren fünf Säulen als Toolbox.' },
      { pkgName: '03 · PARTNER',  iconKey: 'pixel-heart', title: 'Laufende Betreuung',    description: 'Als verlängerte Brand-Abteilung an eurer Seite. Strategie-Reviews, fortlaufende Produktion, Performance-Optimierung — ein eingespieltes Team, das eure Marke kennt.' },
    ],
  } as OptionenContent,
  'outro': {
    email: 'hallo@pulpmedia.at',
    phone: '+43 732 6300',
    web: 'pulpmedia.at',
    sig: "DON'T MAKE ADS. MAKE LOVE.",
  } as OutroContent,
}
