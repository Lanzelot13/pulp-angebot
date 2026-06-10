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
