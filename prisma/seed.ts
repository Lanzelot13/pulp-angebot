import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // ===== CONTACTS =====
  const contacts = [
    {
      slug: 'paul',
      name: 'Paul Lanzerstorfer',
      role: 'CEO',
      phone: '+43 699 15501006',
      email: 'paul@pulpmedia.at',
      avatarUrl: null,
    },
    {
      slug: 'robert',
      name: 'Robert Bogner',
      role: 'Head of Technology',
      phone: '+43 732 890208',
      email: 'robert@pulpmedia.at',
      avatarUrl: null,
    },
    {
      slug: 'jasmin',
      name: 'Jasmin Gerlinde Gattringer',
      role: 'Account Manager',
      phone: '+43 732 890208',
      email: 'jasmin@pulpmedia.at',
      avatarUrl: null,
    },
    {
      slug: 'theresa',
      name: 'Theresa Gattringer',
      role: 'Account Manager',
      phone: '+43 732 890208',
      email: 'theresa@pulpmedia.at',
      avatarUrl: null,
    },
    {
      slug: 'michael',
      name: 'Michael Katzlberger',
      role: 'Creative Director',
      phone: '+43 732 890208',
      email: 'michael@pulpmedia.at',
      avatarUrl: null,
    },
    {
      slug: 'franziska',
      name: 'Franziska Matern',
      role: 'Brand Strategist',
      phone: '+43 732 890208',
      email: 'franziska@pulpmedia.at',
      avatarUrl: null,
    },
  ]

  for (const contact of contacts) {
    await prisma.contact.upsert({
      where: { slug: contact.slug },
      update: contact,
      create: contact,
    })
  }
  console.log(`✓ ${contacts.length} contacts seeded`)

  // ===== REFERENCES =====
  const references = [
    { name: 'TGW Logistics', description: 'Videoproduktion für TGW Logistics', url: 'https://www.tgw-group.com', tags: ['Videoproduktion', 'Industrie'], sortOrder: 1 },
    { name: 'Rosenbauer', description: 'Videoproduktionen für Rosenbauer', url: 'https://www.rosenbauer.com', tags: ['Videoproduktion', 'Industrie'], sortOrder: 2 },
    { name: 'Kramp', description: 'Videoproduktion für Kramp', url: 'https://www.kramp.com', tags: ['Videoproduktion'], sortOrder: 3 },
    { name: 'Weber', description: 'Social Media & Content für Weber', url: 'https://www.weber.com', tags: ['Social Media', 'Content'], sortOrder: 4 },
    { name: 'hali', description: 'Markenführung für hali', url: 'https://www.hali.at', tags: ['Branding', 'Content'], sortOrder: 5 },
    { name: 'Husqvarna', description: 'Content & Social Media für Husqvarna', url: 'https://www.husqvarna.com/at/', tags: ['Social Media', 'Video'], sortOrder: 6 },
    { name: 'Zipfer', description: 'Kampagnen für Zipfer', url: 'https://www.zipfer.at', tags: ['Kampagne', 'Video', 'Social Media'], sortOrder: 7 },
    { name: 'efko', description: 'Content-Produktion für efko', url: 'https://www.efko.at', tags: ['Content', 'Video'], sortOrder: 8 },
    { name: 'Raiffeisen Versicherung', description: 'Video & Content für Raiffeisen Versicherung', url: 'https://www.raiffeisen-versicherung.at', tags: ['Video', 'Content', 'Finanz'], sortOrder: 9 },
    { name: 'Internorm', description: 'Videoproduktion für Internorm', url: 'https://www.internorm.com', tags: ['Videoproduktion', 'Industrie'], sortOrder: 10 },
    { name: 'Jessas Marie', description: 'Brand-Aufbau für Jessas Marie', url: 'https://www.jessasmarie.at', tags: ['Branding', 'Social Media'], sortOrder: 11 },
    { name: 'OÖ Tourismus', description: 'Content & Kampagnen für OÖ Tourismus', url: 'https://www.oberoesterreich.at', tags: ['Tourismus', 'Content', 'Video'], sortOrder: 12 },
  ]

  // Delete existing references and recreate
  await prisma.reference.deleteMany()
  for (const ref of references) {
    await prisma.reference.create({ data: ref })
  }
  console.log(`✓ ${references.length} references seeded`)

  // ===== CHANNELS (customer social media accounts) =====
  const channels = [
    { name: 'efko Instagram', url: 'https://www.instagram.com/efkoat/', platform: 'instagram', sortOrder: 1 },
    { name: 'efko Facebook', url: 'https://www.facebook.com/efko.at/', platform: 'facebook', sortOrder: 2 },
    { name: 'Zipfer Instagram', url: 'https://www.instagram.com/zipferbier/', platform: 'instagram', sortOrder: 3 },
    { name: 'Zipfer Facebook', url: 'https://www.facebook.com/Zipfer/', platform: 'facebook', sortOrder: 4 },
    { name: 'TGW LinkedIn', url: 'https://www.linkedin.com/company/tgw-logistics/', platform: 'linkedin', sortOrder: 5 },
    { name: 'TGW YouTube', url: 'https://www.youtube.com/@TGWLogistics', platform: 'youtube', sortOrder: 6 },
    { name: 'Husqvarna Instagram', url: 'https://www.instagram.com/husqvarna_at/', platform: 'instagram', sortOrder: 7 },
    { name: 'Weber Instagram', url: 'https://www.instagram.com/weber_at/', platform: 'instagram', sortOrder: 8 },
    { name: 'Rosenbauer LinkedIn', url: 'https://www.linkedin.com/company/rosenbauer/', platform: 'linkedin', sortOrder: 9 },
    { name: 'Rosenbauer YouTube', url: 'https://www.youtube.com/@RosenbauerGroup', platform: 'youtube', sortOrder: 10 },
  ]

  await prisma.channel.deleteMany()
  for (const ch of channels) {
    await prisma.channel.create({ data: ch })
  }
  console.log(`✓ ${channels.length} channels seeded`)

  // ===== DUMMY OFFER =====
  // Get some reference and channel IDs for the offer
  const allRefs = await prisma.reference.findMany({ take: 4 })
  const allChannels = await prisma.channel.findMany({ take: 3 })

  await prisma.offer.deleteMany()
  const offer = await prisma.offer.create({
    data: {
      slug: 'efko-social-media-2025',
      status: 'DRAFT',
      clientName: 'Markus Hinterberger',
      clientCompany: 'efko Frischfrucht und Delikatessen GmbH',
      projectName: 'Social Media Betreuung 2025',
      offerNumber: 'A-2025-042',
      contactSlug: 'paul',
      hero: {
        title: 'Social Media Betreuung 2025',
        subtitle: 'Strategie, Content & Community Management für efko',
        headerImage: null,
      },
      understanding: {
        headline: 'Wir verstehen euch',
        text: 'efko steht für österreichische Qualität, Regionalität und Frische. Eure Social-Media-Kanäle sollen genau das transportieren – authentisch, nahbar und mit dem gewissen Schmäh.',
        cards: [
          { title: 'Authentizität', text: 'Echte Geschichten aus der Produktion und von den Menschen hinter efko' },
          { title: 'Regionalität', text: 'Österreichische Wurzeln betonen, lokale Community ansprechen' },
          { title: 'Frische', text: 'Visuell ansprechender Content, der Appetit macht' },
        ],
      },
      services: {
        headline: 'Was wir für euch tun',
        items: [
          { title: 'Content-Strategie', description: 'Monatliche Redaktionsplanung mit Themencluster-Ansatz', features: ['Redaktionsplan', 'Themenrecherche', 'Trend-Monitoring'] },
          { title: 'Content-Produktion', description: 'Hochwertige Fotos, Reels und Stories direkt vor Ort', features: ['2 Drehtage/Monat', 'Reels & Stories', 'Fotografie'] },
          { title: 'Community Management', description: 'Tägliche Betreuung der Kanäle inkl. Reaktion auf Kommentare', features: ['Montag–Freitag', 'Kommentar-Management', 'DM-Handling'] },
        ],
      },
      packages: {
        intro: 'Wählt das Paket, das am besten zu euren Zielen passt.',
        showPrices: true,
        items: [
          { name: 'Basis', price: 2500, description: 'Ideal für den Einstieg', features: [
            { text: '8 Posts/Monat', included: true },
            { text: '4 Stories/Woche', included: true },
            { text: '1 Drehtag', included: true },
            { text: 'Community Management', included: true },
            { text: 'Monatsreporting', included: false },
            { text: 'Influencer-Koops', included: false },
          ] },
          { name: 'Professional', price: 4200, description: 'Für ambitionierte Marken', features: [
            { text: '12 Posts/Monat', included: true },
            { text: 'Tägliche Stories', included: true },
            { text: '2 Drehtage', included: true },
            { text: 'Community Management', included: true },
            { text: 'Monatsreporting', included: true },
            { text: 'Influencer-Koops', included: false },
          ] },
          { name: 'Premium', price: 6800, description: 'Full-Service ohne Kompromisse', features: [
            { text: '16 Posts/Monat', included: true },
            { text: 'Tägliche Stories', included: true },
            { text: '3 Drehtage', included: true },
            { text: 'Community Management', included: true },
            { text: 'Monatsreporting', included: true },
            { text: 'Influencer-Koops', included: true },
            { text: 'Paid-Social Betreuung', included: true },
          ] },
        ],
      },
      timeline: {
        headline: 'So starten wir',
        steps: [
          { label: 'Kick-off & Strategie', timeframe: 'Woche 1–2', icon: '🚀' },
          { label: 'Setup & Planung', timeframe: 'Woche 3–4', icon: '📋' },
          { label: 'Go-Live', timeframe: 'Woche 5', icon: '🎯' },
          { label: 'Optimierung', timeframe: 'Woche 8', icon: '📊' },
        ],
      },
      stats: [
        { number: '150+', label: 'Projekte', detail: 'erfolgreich umgesetzt' },
        { number: '12', label: 'Jahre', detail: 'Social Media Erfahrung' },
        { number: '30+', label: 'Kunden', detail: 'im DACH-Raum' },
      ],
      referenceIds: allRefs.map(r => r.id),
      channelIds: allChannels.map(c => c.id),
      legal: {
        paymentTerms: 'Zahlbar innerhalb von 14 Tagen nach Rechnungslegung. Alle Preise verstehen sich exkl. USt.',
      },
    },
  })
  console.log(`✓ Dummy offer seeded: /o/${offer.slug}`)
  console.log(`  Edit-Link: /o/${offer.slug}?edit=${offer.editToken}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
