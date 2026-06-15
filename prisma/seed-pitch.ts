// =========================================================
// Seed-Skript für die Pulpmedia-Standard-Präsentation (v7-Deck)
// =========================================================
//
// Legt den Modul-Pool mit den 18 v7-Modul-Typen an und baut daraus
// eine fertige Demo-Pitch in der korrekten v7-Reihenfolge.
//
// Idempotent: Module werden anhand von Name+Typ erkannt und nicht
// doppelt angelegt. Die Demo-Pitch hat einen festen Slug
// ("pulpmedia-standard-praesentation") und wird beim Re-Run mit
// frischen Snapshots aufgefüllt.
//
// Aufruf:
//   npx tsx prisma/seed-pitch.ts
//   (oder: npm run db:seed:pitch)

// ---------------------------------------------------------
// Env loading
// ---------------------------------------------------------
// Prisma lädt automatisch nur `.env`, aber unsere echten Neon-Credentials
// liegen in `.env.local` (Next.js-Konvention). Wir parsen `.env.local`
// zu Fuß, damit das Skript ohne extra Dependency läuft.
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  const content = readFileSync(path, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

loadEnvFile(join(process.cwd(), '.env.local'))

import { PrismaClient, Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'
import {
  DEFAULT_CONTENT,
  PITCH_MODULE_TYPES,
  PITCH_MODULE_LABELS,
  type PitchModuleType,
} from '../src/lib/pitch-types'

const prisma = new PrismaClient()

// ---------------------------------------------------------
// Modul-Definitionen
// ---------------------------------------------------------
// Pro v7-Typ legen wir genau EIN Standard-Modul an, das die Default-Inhalte
// trägt. Pro Pitch wird dieses Modul später kopiert und angepasst.

interface ModuleDef {
  type: PitchModuleType
  name: string
  description: string
}

const MODULES: ModuleDef[] = [
  { type: 'hero',         name: 'Hero · Begrüßung',                description: 'Erste Folie. Eyebrow oben, "HALLO" groß, Beteiligte (zwei freie Listen "Wir"/"Ihr") + Ort unten.' },
  { type: 'team',         name: 'Team · Alle Pulpies',             description: 'Bild-Grid aller Pulpies aus dem lokalen Cache. Pro Pitch markieren welche heute dabei sind.' },
  { type: 'numbers',      name: 'Drei Zahlen · Counter',           description: 'Drei Counter-Zahlen mit Hochzähl-Animation: Jahre, Produktionen, Lovebrands.' },
  { type: 'manifest',     name: 'Manifest · Don\'t make Ads',      description: '"DON\'T MAKE ADS. MAKE LOVE." mit Pulp-Pixel-Herz.' },
  { type: 'uw',           name: 'Origin Story · Unnützes Wissen',  description: 'Drei-Spalten-Editorial: Logo, Bücherstapel, Jauch-Foto.' },
  { type: 'spotlight',    name: 'Spotlight · Phone + Big Numbers', description: 'Phone-Frame mit Vertikalvideo plus großen Aufmerksamkeits-Zahlen (Counter). Channel-Link optional. Wassertransferdruck als Default-Beispiel.' },
  { type: 'love-brands',  name: 'Love Brands · Logo-Grid',         description: '6x2 Logo-Grid mit Marken, mit denen wir arbeiten.' },
  { type: 'saeulen',      name: 'Fünf Säulen · Hover-Reveal',      description: 'Video, Social, Influencer, Live, Merch. Hover fährt eine Säule groß auf.' },
  { type: 'leistungen',   name: 'Leistungen · 3x3 Pakete',         description: 'Neun konkrete Leistungspakete im 3x3-Raster.' },
  { type: 'case-video',   name: 'Case · Hero Video (16:9)',        description: 'Full-bleed 16:9 Video mit Overlay-Quote oben und Metriken unten. Default: Rosenbauer.' },
  { type: 'case-social',  name: 'Case · Social (Phone)',           description: 'Phone-Frame links/rechts, KPIs daneben. Default: Zipfer Instagram-Reel.' },
  { type: 'monitor',      name: 'TikTok Brand Monitor',             description: 'Scorecard mit Rank-Badge, Big Stats, Vergleichsbalken.' },
  { type: 'quote',        name: 'Quote · Testimonial',             description: 'Eine Kunden-Stimme groß und ruhig.' },
  { type: 'process',      name: 'Process · Timeline',              description: 'Sieben Schritte von Angebot bis Review.' },
  { type: 'fragen',       name: 'Fragen · Flip-Cards (3)',         description: 'Drei Karten, die sich beim Antippen drehen.' },
  { type: 'tipps',        name: 'Tipps · Flip-Cards (3)',          description: 'Drei Tipps für die Empfänger. Flip-Cards mit Icon.' },
  { type: 'ideas',        name: 'Vorschläge · Pro Pitch ausfüllen', description: 'Vier konkrete Ideen, was wir für genau diesen Kunden tun würden. Pro Karte Säulen-Icon, Headline, Body und optional Bild.' },
  { type: 'optionen',     name: 'Optionen · Drei Pakete',          description: 'Einstieg, Projekt, Partner. Drei Karten mit Icon.' },
  { type: 'outro',        name: 'Outro · Let\'s talk',             description: 'Abschluss mit Email, Telefon, Web und Pulp-Sig.' },
]

// Konsistenz-Check: alle 18 Typen müssen ein Modul haben.
const seenTypes = new Set(MODULES.map((m) => m.type))
for (const t of PITCH_MODULE_TYPES) {
  if (!seenTypes.has(t)) {
    throw new Error(
      `Modul-Typ "${t}" ist in PITCH_MODULE_TYPES, aber nicht in seed-pitch.ts MODULES.`
    )
  }
}

// ---------------------------------------------------------
// Demo-Pitch
// ---------------------------------------------------------

const DEMO_PITCH = {
  slug: 'pulpmedia-standard-praesentation',
  clientCompany: 'Pulpmedia Demo',
  occasion: 'Standard-Pitch · Live-Vorschau',
}

// Reihenfolge der Module in der Demo-Pitch (= v7-Folien-Reihenfolge).
const DEMO_ORDER: PitchModuleType[] = [
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

// ---------------------------------------------------------
// Run
// ---------------------------------------------------------

// ---------------------------------------------------------
// Default-Lovebrands (Pool für die Lovebrands-Folie)
// ---------------------------------------------------------
const DEFAULT_LOVEBRANDS: Array<{
  slug: string
  name: string
  logoUrl: string
  shape: 'default' | 'badge' | 'tall'
}> = [
  { slug: 'zipfer',     name: 'Zipfer',     logoUrl: '/pitch/lovebrands/zipfer.svg' },
  { slug: 'lidl',       name: 'Lidl',       logoUrl: '/pitch/lovebrands/lidl.svg',       shape: 'badge' },
  { slug: 'rosenbauer', name: 'Rosenbauer', logoUrl: '/pitch/lovebrands/rosenbauer.svg' },
  { slug: 'efko',       name: 'Efko',       logoUrl: '/pitch/lovebrands/efko.png',       shape: 'tall' },
  { slug: 'husqvarna',  name: 'Husqvarna',  logoUrl: '/pitch/lovebrands/husqvarna.svg' },
  { slug: 'hornbach',   name: 'Hornbach',   logoUrl: '/pitch/lovebrands/hornbach.svg' },
  { slug: 'weber',      name: 'Weber',      logoUrl: '/pitch/lovebrands/weber.png' },
  { slug: 'internorm',  name: 'Internorm',  logoUrl: '/pitch/lovebrands/internorm.svg' },
  { slug: 'pez',        name: 'PEZ',        logoUrl: '/pitch/lovebrands/pez.svg' },
  { slug: 'pago',       name: 'Pago',       logoUrl: '/pitch/lovebrands/pago.svg' },
  { slug: 'yo',         name: 'YO',         logoUrl: '/pitch/lovebrands/yo.png',         shape: 'badge' },
  { slug: 'hohes-c',    name: 'Hohes C',    logoUrl: '/pitch/lovebrands/hohes-c.png' },
].map((b) => ({ ...b, shape: (b as { shape?: 'default' | 'badge' | 'tall' }).shape || 'default' }))

async function main() {
  console.log('Seede Pitch-System …\n')

  // 0) Beim Roll-out vom v7-System komplett zurücksetzen.
  //    Per Env-Flag, damit das nicht ungefragt produktive Daten löscht.
  if (process.env.PITCH_RESET === '1') {
    console.log('PITCH_RESET=1 erkannt – lösche alle Pitches und Pitch-Module …')
    const dp = await prisma.pitch.deleteMany({})
    const dm = await prisma.pitchModule.deleteMany({})
    console.log(`  gelöscht: ${dp.count} Pitches, ${dm.count} Module\n`)
  }

  // 0b) Lovebrands idempotent anlegen
  console.log('Lovebrand-Pool …')
  for (let i = 0; i < DEFAULT_LOVEBRANDS.length; i++) {
    const b = DEFAULT_LOVEBRANDS[i]
    await prisma.loveBrand.upsert({
      where: { slug: b.slug },
      create: { slug: b.slug, name: b.name, logoUrl: b.logoUrl, shape: b.shape, sortOrder: i },
      update: { name: b.name, logoUrl: b.logoUrl, shape: b.shape, sortOrder: i, archivedAt: null },
    })
  }
  console.log(`  ${DEFAULT_LOVEBRANDS.length} Lovebrands im Pool\n`)

  // 0c) Pulpies sind beim ersten Lauf evtl. leer. Hinweis ausgeben statt zu blockieren.
  const pulpieCount = await prisma.pulpie.count({ where: { archivedAt: null } })
  if (pulpieCount === 0) {
    console.log('Hinweis: Pulpie-Pool ist leer. Im Admin auf /admin/pulpies den')
    console.log('Sync-Button klicken, damit die Team-Folie befüllt wird.\n')
  } else {
    console.log(`Pulpie-Pool hat ${pulpieCount} aktive Einträge.\n`)
  }


  // 1) Module idempotent anlegen
  const moduleByType = new Map<PitchModuleType, Awaited<ReturnType<typeof prisma.pitchModule.create>>>()
  for (const def of MODULES) {
    const existing = await prisma.pitchModule.findFirst({
      where: { type: def.type, name: def.name, archivedAt: null },
    })
    const content = DEFAULT_CONTENT[def.type]
    if (existing) {
      const updated = await prisma.pitchModule.update({
        where: { id: existing.id },
        data: {
          description: def.description,
          content: content as unknown as Prisma.InputJsonValue,
        },
      })
      moduleByType.set(def.type, updated)
      console.log(`  aktualisiert: ${def.name}`)
    } else {
      const created = await prisma.pitchModule.create({
        data: {
          type: def.type,
          name: def.name,
          description: def.description,
          content: content as unknown as Prisma.InputJsonValue,
          createdBy: 'seed-script',
        },
      })
      moduleByType.set(def.type, created)
      console.log(`  angelegt:     ${def.name}`)
    }
  }

  // 2) Pulpmedia-Kontakt finden (für die Demo-Pitch)
  const contact =
    (await prisma.contact.findUnique({ where: { slug: 'paul' } })) ||
    (await prisma.contact.findFirst())
  if (!contact) {
    console.error(
      '\nKein Kontakt in der DB. Bitte zuerst `npm run db:seed` ausführen.'
    )
    process.exit(1)
  }

  // 3) Demo-Pitch upserten
  const existingPitch = await prisma.pitch.findUnique({
    where: { slug: DEMO_PITCH.slug },
  })
  const pitch = existingPitch
    ? await prisma.pitch.update({
        where: { slug: DEMO_PITCH.slug },
        data: {
          clientCompany: DEMO_PITCH.clientCompany,
          occasion: DEMO_PITCH.occasion,
          contactSlug: contact.slug,
          archivedAt: null,
        },
      })
    : await prisma.pitch.create({
        data: {
          slug: DEMO_PITCH.slug,
          clientCompany: DEMO_PITCH.clientCompany,
          occasion: DEMO_PITCH.occasion,
          contactSlug: contact.slug,
          modules: [],
        },
      })
  console.log(
    `\n${existingPitch ? 'Aktualisierte' : 'Erstellte'} Demo-Pitch: ${pitch.slug}`
  )

  // 4) Module als Snapshots in die Pitch packen (in DEMO_ORDER)
  const snapshots = DEMO_ORDER.map((type, i) => {
    const m = moduleByType.get(type)
    if (!m) throw new Error(`Modul für Typ "${type}" wurde nicht gefunden`)
    return {
      instanceId: randomUUID(),
      moduleId: m.id,
      type: m.type,
      name: m.name,
      content: m.content,
      sourceUpdatedAt: m.updatedAt.toISOString(),
      sortOrder: i,
    }
  })

  await prisma.pitch.update({
    where: { id: pitch.id },
    data: { modules: snapshots as unknown as Prisma.InputJsonValue },
  })
  console.log(`Pitch enthält jetzt ${snapshots.length} Modul-Snapshots.\n`)

  console.log(`Fertig. ${MODULES.length} Module im Pool, ${snapshots.length} in der Demo-Pitch.`)
  console.log('\nDemo-Pitch ansehen:')
  console.log(`  • lokal:      http://localhost:3000/p/${pitch.slug}`)
  console.log(`  • production: https://angebot.pulpmedia.at/p/${pitch.slug}`)

  // ---------------------------------------------------------
  // 5) Konkrete Pitch: Fritz Holter GmbH
  //
  // Eine echte Beispiel-Pitch mit individuell befüllten Modul-Snapshots.
  // Hier werden die Inhalte direkt zusammengebaut (nicht aus dem Modul-Pool
  // kopiert), damit Holter-spezifische Texte und Zahlen sofort drin sind.
  // ---------------------------------------------------------

  const HOLTER_SLUG = 'holter'
  const holterModules = [
    // 1 · Hero
    {
      type: 'hero', name: 'Hero · Holter', content: {
        kicker1: 'ERSTGESPRÄCH',
        kicker2: '',
        kicker3: 'FRITZ HOLTER GMBH',
        greeting: 'HALLO',
        fromPulp: [{ name: 'Theresa Janda' }],
        fromClient: [{ name: 'Andrea Helfenschneider' }],
        meetingPlace: 'Holter Wels oder online',
      },
    },
    // 2 · Team (Pulpies)
    {
      type: 'team', name: 'Team · Theresa anwesend', content: {
        attendingSlugs: ['theresa-janda'],
      },
    },
    // 3 · Numbers (Pulp in Zahlen)
    {
      type: 'numbers', name: 'Drei Zahlen', content: {
        items: [
          { iconKey: 'skull',       target: 21,  suffix: '+', label: 'Jahre Agentur',       description: 'Seit 2005. Inhabergeführt.' },
          { iconKey: 'smiley',      target: 500, suffix: '+', label: 'Produktionen',        description: 'Hero Videos, Brand Stories, Social Cuts seit 2012.' },
          { iconKey: 'pixel-heart', target: 30,  suffix: '+', label: 'Betreute Lovebrands', description: 'Im DACH-Raum.' },
        ],
      },
    },
    // 4 · Monitor (Holter-Daten · @arbeitenbeiholter)
    {
      type: 'monitor', name: 'Brand Monitor · Holter', content: {
        brand: 'Holter',
        handle: 'arbeitenbeiholter',
        rank: 'a',
        placement: 'Platz 3 von 66',
        posts: '155',
        views: '865,9K',
        interactions: '41,9K',
        engagementRate: '4,835%',
        comparison: [
          { name: '@arbeitenbeiholter',     percent: 60, value: '4,835%', focus: true },
          { name: '@zotterschokolade · #1', percent: 88, value: '7,006%', ghost: true },
          { name: '@rosenbauergroup · #2',  percent: 81, value: '6,500%', ghost: true },
          { name: 'Ø aller 66 Marken',      percent: 24, value: '1,9%',   ghost: true },
        ],
      },
    },
    // 5 · Manifest
    {
      type: 'manifest', name: 'Manifest', content: {
        line1: "DON'T MAKE ADS.",
        line2: 'MAKE LOVE',
        body: 'Wir bauen keine Werbung. Wir bauen Beziehung zwischen Menschen und Marken, über Geschichten, die jemand sehen will, nicht sehen muss.',
      },
    },
    // 6 · Säulen
    {
      type: 'saeulen', name: 'Fünf Säulen', content: {
        pillars: [
          { iconKey: 'explosion',    title: 'Video',         subtitle: 'Brandlove fühlen',     body: 'Vom 6-Sekunden-Bumper bis zum Cinema-Cut. Wir konzipieren, produzieren und schneiden Markenfilme, die den Unterschied machen.' },
          { iconKey: 'smiley',       title: 'Social Media',  subtitle: 'Brandlove-Community',  body: 'Tägliche Betreuung von Marken-Kanälen. Content, der Menschen anspricht, nicht Algorithmen.' },
          { iconKey: 'heart',        title: 'Influencer',    subtitle: 'Brandlove-Trust',       body: 'Echte Stimmen, langfristige Partnerschaften, kein Reichweiten-Roulette.' },
          { iconKey: 'bomb',         title: 'Live Marketing', subtitle: 'Brandlove erleben',    body: 'Events, Pop-ups, Messeauftritte, Aktivierungen. Marken werden erlebt, nicht gelesen.' },
          { iconKey: 'pixel-heart',  title: 'Merchandise',   subtitle: 'Brandlove zeigen',     body: 'Wenn jemand freiwillig dein Logo trägt, ist das der größte Liebesbeweis.' },
        ],
      },
    },
    // 7 · Leistungen
    {
      type: 'leistungen', name: 'Leistungen', content: {
        items: [
          { iconKey: 'explosion',   title: 'Workshops',                description: 'Kick-off, Strategie-Tag, Format-Sprint. Wir holen ab, wo ihr steht.' },
          { iconKey: 'smiley',      title: 'Strategie-Paper',          description: 'Markenführung, Content-Strategie, Kanalstrategie. Schriftlich, klar, umsetzbar.' },
          { iconKey: 'heart',       title: 'Content-Day',              description: 'Ein Drehtag, mehrere Wochen Material. Effizient produziert, plattformgerecht geschnitten.' },
          { iconKey: 'blitz',       title: 'Videoproduktion',          description: 'Konzept, Dreh, Schnitt, Postproduktion. Eigenes Studio in Linz.' },
          { iconKey: 'bomb',        title: 'Social Media Redaktion',   description: 'Laufende Betreuung eurer Kanäle. Planung, Produktion, Veröffentlichung.' },
          { iconKey: 'pixel-heart', title: 'Community Marketing',      description: 'Aufbau und Pflege eurer Fan-Gemeinde. Antworten, Moderation, Aktivierung.' },
          { iconKey: 'horn',        title: 'Influencer Relationship',  description: 'Scouting, Briefing, Verträge, Kampagnen, Reporting.' },
          { iconKey: 'blume',       title: 'Live-Aktivierungen',       description: 'Events, Pop-ups, Messen, Aktionen. Inklusive Content-Verwertung danach.' },
          { iconKey: 'rocket',      title: 'Merchandise',              description: 'Design und Produktion. Auch kleine Auflagen, eigener Shop möglich.' },
        ],
      },
    },
    // 8 · Case-Video (Rosenbauer als Beispiel "sowas können wir für euch")
    {
      type: 'case-video', name: 'Case · Rosenbauer-Markenfilm', content: {
        embed: { type: 'youtube', id: 'sbzBRcDysLs', mute: true },
      },
    },
    // 9 · Ideas (Einschub: 4 Vorschläge für Holter)
    {
      type: 'ideas', name: 'Vorschläge · Holter', content: {
        eyebrow: 'Was wir uns überlegt haben',
        headline: 'Vier Ideen, wie Holter zur',
        headlineAccent: 'Lovebrand wird',
        sub: 'Konkret und auf Holter zugeschnitten. Eine Idee pro Säule (Social Media läuft bei euch ja schon richtig stark, daher der Fokus auf die anderen vier).',
        items: [
          {
            iconKey: 'explosion',
            title: 'Hero-Film über Holter',
            body: 'Ein Marken-Film, wie wir ihn für Rosenbauer gemacht haben (gerade gesehen). Nicht der Imagefilm-Klassiker mit Drohne und Voiceover, sondern Geschichten von den Leuten, die bei euch ein- und ausgehen. Das könnten wir genau so für Holter aufziehen.',
          },
          {
            iconKey: 'horn',
            title: 'Corporate Ambassadors',
            body: 'Die Gesichter aus "Arbeiten bei Holter" sind schon Stars eures TikTok-Kanals (Platz 3 im Brand Monitor). Wir bauen sie schrittweise zu echten Markenbotschaftern aus, mit eigenen Kanälen und langfristigem Coaching.',
          },
          {
            iconKey: 'bomb',
            title: 'Holter-Klo Live-Aktivierung',
            body: 'Eure Bäder dort aufstellen, wo eure Zielgruppe sowieso ist: öffentliche Schwimmbäder oder ein begehbares Holter-Bad auf Festivals (Frequency, Electric Love). Erleb-Marketing, das man fotografiert und teilt.',
          },
          {
            iconKey: 'pixel-heart',
            title: 'Auto-Folierung für Partner',
            body: 'Mit-finanzierte Folierung für Holter-Partner und Installateure: Werbeflächen, die jeden Tag durch ganz Österreich fahren, getragen von Menschen, die euer Produkt schon lieben.',
          },
        ],
      },
    },
    // 10 · Fragen (3 Stück, Holter-spezifisch)
    {
      type: 'fragen', name: 'Drei Fragen an Holter', content: {
        items: [
          { title: 'Wie viel',  titleAccent: 'Brandlove',  body: 'steckt schon drin? "Arbeiten bei Holter" zeigt: ihr habt eine Bühne und eine Audience. Wie wichtig ist euch die externe Markenwirkung im Vergleich zur Recruiting-Wirkung?' },
          { title: 'Wer macht', titleAccent: 'was bei euch?', body: 'Wie ist Marketing intern aufgestellt? Eigene Produktion, Agenturen, Inhouse-Kreativ-Team? Wer entscheidet, wer setzt um?' },
          { title: 'Welche',    titleAccent: 'KPIs',       body: 'zählen für Holter wirklich? Reichweite, Recruiting, Verkaufsleads, Marken-Image, Mitarbeiter-Stolz? Worauf schaut der Vorstand am Ende?' },
        ],
      },
    },
    // 11 · Optionen
    {
      type: 'optionen', name: 'Optionen', content: {
        options: [
          { pkgName: '01 · EINSTIEG', iconKey: 'smiley',      title: 'Workshop + Strategie',  description: 'Brand-Sprint, Positionierungs-Workshop, Konzept-Papier. Eine geschlossene Lieferung, klarer Output. Ihr könnt damit weiterarbeiten, mit oder ohne uns.' },
          { pkgName: '02 · PROJEKT',  iconKey: 'explosion',   title: 'Ein konkretes Projekt', description: 'Eine der vier Ideen herausgreifen und voll durchziehen. Hero-Film, Ambassador-Programm, Holter-Klo oder Folierungs-Aktion. Klarer Scope, klarer Zeitraum.' },
          { pkgName: '03 · PARTNER',  iconKey: 'pixel-heart', title: 'Laufende Betreuung',    description: 'Als verlängerte Brand-Abteilung an eurer Seite. Strategie-Reviews, fortlaufende Produktion, Performance-Optimierung. Wir lernen Holter über die Zeit kennen.' },
        ],
      },
    },
    // 12 · Outro
    {
      type: 'outro', name: 'Outro · Let\'s talk', content: {
        email: 'theresa@pulpmedia.at',
        phone: '+43 732 6300',
        web: 'pulpmedia.at',
        sig: "DON'T MAKE ADS. MAKE LOVE.",
      },
    },
  ]

  const existingHolter = await prisma.pitch.findUnique({ where: { slug: HOLTER_SLUG } })
  const holterPitch = existingHolter
    ? await prisma.pitch.update({
        where: { slug: HOLTER_SLUG },
        data: {
          clientCompany: 'Fritz Holter GmbH',
          occasion: 'Erstgespräch',
          contactSlug: contact.slug,
          archivedAt: null,
        },
      })
    : await prisma.pitch.create({
        data: {
          slug: HOLTER_SLUG,
          clientCompany: 'Fritz Holter GmbH',
          occasion: 'Erstgespräch',
          contactSlug: contact.slug,
          modules: [],
        },
      })

  const holterSnapshots = holterModules.map((m, i) => ({
    instanceId: randomUUID(),
    moduleId: null,           // Custom-Snapshots (nicht aus dem Pool)
    type: m.type,
    name: m.name,
    content: m.content as unknown as Record<string, unknown>,
    sourceUpdatedAt: null,
    sortOrder: i,
  }))

  await prisma.pitch.update({
    where: { id: holterPitch.id },
    data: { modules: holterSnapshots as unknown as Prisma.InputJsonValue },
  })
  console.log(`\n${existingHolter ? 'Aktualisierte' : 'Erstellte'} Holter-Pitch (${holterSnapshots.length} Folien).`)
  console.log(`  • lokal:      http://localhost:3000/p/${HOLTER_SLUG}`)
  console.log(`  • production: https://angebot.pulpmedia.at/p/${HOLTER_SLUG}`)

  // Label-Übersicht für Paul
  console.log('\nModul-Pool:')
  for (const def of MODULES) {
    console.log(`  ${def.type.padEnd(14)} → ${PITCH_MODULE_LABELS[def.type]}`)
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
