// =========================================================
// Seed-Skript für die Pulpmedia-Standard-Präsentation
// =========================================================
//
// Legt den Modul-Pool an (Hero, Manifest, Stats, Team, Fun Facts,
// Services Grid, 5x Service Detail, Outro) und baut daraus eine
// fertige Demo-Pitch. Idempotent: Module werden anhand von Name+Typ
// erkannt und nicht doppelt angelegt. Die Demo-Pitch hat einen festen
// Slug ("pulpmedia-standard-praesentation") und wird beim Re-Run neu
// mit Snapshots aufgefüllt.
//
// Aufruf:
//   npx tsx prisma/seed-pitch.ts
//   (oder: npm run db:seed:pitch)

// ---------------------------------------------------------
// Env loading
// ---------------------------------------------------------
// Prisma lädt automatisch nur `.env`, aber bei uns liegen die echten
// Neon-Credentials in `.env.local` (Next.js-Konvention). Wir parsen
// `.env.local` zu Fuß, damit das Skript ohne extra Dependency läuft.
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
    // Strip wrapping quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    // .env.local soll .env überschreiben (gleiche Reihenfolge wie Next.js)
    process.env[key] = value
  }
}

loadEnvFile(join(process.cwd(), '.env.local'))

import { PrismaClient, Prisma } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

// ---------------------------------------------------------
// Modul-Definitionen
// ---------------------------------------------------------
// type, name, description, content

const MODULES: Array<{
  type: string
  name: string
  description: string
  content: Record<string, unknown>
}> = [
  {
    type: 'hero',
    name: 'Standard Hero',
    description: 'Begrüßung am Anfang jeder Präsentation. Pro Pitch optional anpassen ("Hallo Fronius!").',
    content: {
      eyebrow: 'Hallo!',
      title: 'Wir sind Pulpmedia.',
      subtitle: 'Nice to meet you. Dürfen wir uns vorstellen?',
    },
  },
  {
    type: 'manifest',
    name: 'Manifest: Make love, not ads.',
    description: 'Unser Markenversprechen als Statement.',
    content: {
      statement: 'Make love. Not ads.',
      attribution: 'Pulpmedia Manifest',
    },
  },
  {
    type: 'stats-grid',
    name: 'Pulpmedia Eckdaten',
    description: 'Gründung, Größe, Reichweite. Einmal pro Jahr aktualisieren.',
    content: {
      headline: 'Pulpmedia in Zahlen',
      items: [
        { number: '2005', label: 'Gegründet' },
        { number: '25', label: 'Pulpies' },
        { number: '1 Mio+', label: 'Fans betreut' },
        { number: '500+', label: 'Projekte' },
      ],
    },
  },
  {
    type: 'team-grid',
    name: 'Wer ist heute da',
    description: 'Pro Pitch einkopieren und individuell anpassen — wer ist beim Termin dabei?',
    content: {
      headline: 'Wer ist heute da',
      personSlugs: [],
    },
  },
  {
    type: 'fun-facts',
    name: 'Unnützes Wissen',
    description: 'Vier kurze Eigenheiten, die Pulpmedia ausmachen.',
    content: {
      headline: 'Unnützes Wissen',
      items: [
        { emoji: '🎯', text: 'Über 1 Mio. Fans auf den Kanälen unserer Kund:innen' },
        { emoji: '📚', text: '3 Bücher geschrieben (und gelesen)' },
        { emoji: '💸', text: 'Mehrere Millionärsmacher-Kampagnen umgesetzt' },
        { emoji: '🎲', text: 'Brettspiel-Abende sind unbezahltes Pflichtprogramm' },
      ],
    },
  },
  {
    type: 'services-grid',
    name: 'Unsere fünf Säulen',
    description: 'Übersicht aller fünf Pulpmedia-Säulen mit Kurztagline.',
    content: {
      headline: 'Unsere fünf Säulen',
      items: [
        { title: 'Hero Videos', tagline: 'User fesseln, Geschichten erzählen', icon: '🎬' },
        { title: 'Social Media', tagline: 'Community, Content, Conversation', icon: '📱' },
        { title: 'Ambassadors', tagline: 'Glaubwürdige Stimmen, echte Reichweite', icon: '🎤' },
        { title: 'Experiences', tagline: 'Events, Pop-ups, Aktivierungen', icon: '🎪' },
        { title: 'Merchandise', tagline: 'Konzept, Design, Shop', icon: '👕' },
      ],
    },
  },
  {
    type: 'service-detail',
    name: 'Service: Hero Videos',
    description: 'Detail-Folie zu Säule 1.',
    content: {
      eyebrow: 'Säule 01',
      headline: 'Hero Videos',
      slogan: 'User fesseln, statt nur zu unterhalten.',
      body: 'Wir produzieren Bewegtbild, das hängen bleibt. Vom ersten Konzept-Workshop bis zum finalen Schnitt — Storytelling ist kein Etikett, sondern unser Handwerk. Distribution denken wir mit, damit dein Video nicht nur schön ist, sondern auch wirkt.',
      promises: [
        'Konzept, das deine Zielgruppe abholt',
        'Produktion in voller Bandbreite, vom Schnellbeitrag bis zum Kino-Look',
        'Schnitt mit Gefühl für Rhythmus und Plattform',
        'Distribution mitgedacht, nicht angeflanscht',
      ],
    },
  },
  {
    type: 'service-detail',
    name: 'Service: Social Media',
    description: 'Detail-Folie zu Säule 2.',
    content: {
      eyebrow: 'Säule 02',
      headline: 'Social Media',
      slogan: 'Wir bauen Communities, keine Reichweiten-Friedhöfe.',
      body: 'Tägliche Betreuung deiner Kanäle. Content, der Menschen anspricht, nicht nur Algorithmen. Wir kombinieren Redaktion, Design und Performance zu einer Marke, die jeden Tag stärker wird.',
      promises: [
        'Redaktion und Content-Planung im Pulpmedia-Takt',
        'Performance-Mediabudgets effizient eingesetzt',
        'Community Management mit Haltung',
        'Reporting, das tatsächlich Aufschluss gibt',
      ],
    },
  },
  {
    type: 'service-detail',
    name: 'Service: Ambassadors',
    description: 'Detail-Folie zu Säule 3 (Influencer / Corporate Ambassadors).',
    content: {
      eyebrow: 'Säule 03',
      headline: 'Ambassadors',
      slogan: 'Echte Stimmen schlagen jedes Werbeplakat.',
      body: 'Wir finden Menschen, die zu deiner Marke passen, und bringen ihre Glaubwürdigkeit auf die Spur deiner Botschaft. Von der Selektion über Briefing bis zur Performance-Auswertung.',
      promises: [
        'Sorgsame Auswahl statt Reichweiten-Roulette',
        'Briefings, die Kreativität nicht abwürgen',
        'Faire, transparente Kooperationen',
        'Wirkungs-Reporting auf Augenhöhe',
      ],
    },
  },
  {
    type: 'service-detail',
    name: 'Service: Experiences',
    description: 'Detail-Folie zu Säule 4 (Events & Aktivierungen).',
    content: {
      eyebrow: 'Säule 04',
      headline: 'Experiences',
      slogan: 'Marken werden erlebt, nicht gelesen.',
      body: 'Events, Pop-ups, Aktivierungen. Wir bauen Momente, an die sich Menschen erinnern. Vom Konzept über Produktion bis zur Inszenierung vor Ort.',
      promises: [
        'Konzept, das genau deine Zielgruppe trifft',
        'Produktion mit Liebe zum Detail',
        'Live-Inszenierung, die hängenbleibt',
        'Content für den After-Glow auf Social',
      ],
    },
  },
  {
    type: 'service-detail',
    name: 'Service: Merchandise',
    description: 'Detail-Folie zu Säule 5.',
    content: {
      eyebrow: 'Säule 05',
      headline: 'Merchandise',
      slogan: 'Vom Werbeartikel zum Liebhaberstück.',
      body: 'Merch, das deine Fans gerne tragen, kaufen, verschenken. Von Konzept über Design bis zum eigenen Shop — alles aus einer Hand.',
      promises: [
        'Konzept entlang der Markenwelt',
        'Design, das Lust auf Träger:innen macht',
        'Produktion mit verantwortungsvollen Partnern',
        'Shop-Lösung inklusive Fulfillment',
      ],
    },
  },
  {
    type: 'outro',
    name: 'Standard Outro',
    description: 'Letzte Folie. Klare Aufforderung, in den Dialog zu gehen.',
    content: {
      headline: 'Danke!',
      text: 'Lass uns sprechen. Wir freuen uns auf den nächsten Schritt mit euch.',
    },
  },
]

// Reihenfolge der Demo-Pitch (gleich wie das Fronius-Deck)
const DEMO_ORDER = [
  'Standard Hero',
  'Manifest: Make love, not ads.',
  'Pulpmedia Eckdaten',
  'Wer ist heute da',
  'Unnützes Wissen',
  'Unsere fünf Säulen',
  'Service: Hero Videos',
  'Service: Social Media',
  'Service: Ambassadors',
  'Service: Experiences',
  'Service: Merchandise',
  'Standard Outro',
]

const DEMO_PITCH = {
  slug: 'pulpmedia-standard-praesentation',
  clientCompany: 'Pulpmedia Standard-Präsentation',
  occasion: 'Beispiel-Pitch (Demo)',
}

// ---------------------------------------------------------
// Run
// ---------------------------------------------------------

async function main() {
  console.log('Seede Pulpmedia-Standard-Präsentation …\n')

  // 1) Module pflegen
  const moduleByName = new Map<string, { id: string; type: string; name: string; content: unknown; updatedAt: Date }>()
  for (const def of MODULES) {
    const existing = await prisma.pitchModule.findFirst({
      where: { name: def.name, type: def.type },
    })
    if (existing) {
      // Bei Re-Run aktualisieren wir Content + Description, damit das Seed
      // wirklich Quelle der Wahrheit bleibt.
      const updated = await prisma.pitchModule.update({
        where: { id: existing.id },
        data: {
          description: def.description,
          content: def.content as Prisma.InputJsonValue,
        },
      })
      moduleByName.set(def.name, updated)
      console.log(`  aktualisiert: ${def.name}`)
    } else {
      const created = await prisma.pitchModule.create({
        data: {
          type: def.type,
          name: def.name,
          description: def.description,
          content: def.content as Prisma.InputJsonValue,
          createdBy: 'seed-script',
        },
      })
      moduleByName.set(def.name, created)
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
  const snapshots = DEMO_ORDER.map((name, i) => {
    const m = moduleByName.get(name)
    if (!m) throw new Error(`Modul "${name}" wurde nicht gefunden`)
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

  console.log('Fertig. Demo-Pitch ansehen:')
  console.log(`  • lokal:      http://localhost:3000/p/${pitch.slug}`)
  console.log(`  • production: https://angebot.pulpmedia.at/p/${pitch.slug}`)
  console.log('\nTipp: Die Demo-Pitch hat kein "Wer ist heute da" befüllt –')
  console.log('öffne sie im Editor und wähle Personen aus.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
