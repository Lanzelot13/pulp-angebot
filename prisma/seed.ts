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
    { name: 'TGW Logistics', description: 'Videoproduktion für TGW Logistics', tags: ['Videoproduktion', 'Industrie'], sortOrder: 1 },
    { name: 'Rosenbauer', description: 'Videoproduktionen für Rosenbauer', tags: ['Videoproduktion', 'Industrie'], sortOrder: 2 },
    { name: 'Kramp', description: 'Videoproduktion für Kramp', tags: ['Videoproduktion'], sortOrder: 3 },
    { name: 'Weber', description: 'Social Media & Content für Weber', tags: ['Social Media', 'Content'], sortOrder: 4 },
    { name: 'hali', description: 'Markenführung für hali', tags: ['Branding', 'Content'], sortOrder: 5 },
    { name: 'Husqvarna', description: 'Content & Social Media für Husqvarna', tags: ['Social Media', 'Video'], sortOrder: 6 },
    { name: 'Zipfer', description: 'Kampagnen für Zipfer', tags: ['Kampagne', 'Video', 'Social Media'], sortOrder: 7 },
    { name: 'efko', description: 'Content-Produktion für efko', tags: ['Content', 'Video'], sortOrder: 8 },
    { name: 'Raiffeisen Versicherung', description: 'Video & Content für Raiffeisen Versicherung', tags: ['Video', 'Content', 'Finanz'], sortOrder: 9 },
    { name: 'Internorm', description: 'Videoproduktion für Internorm', tags: ['Videoproduktion', 'Industrie'], sortOrder: 10 },
    { name: 'Jessas Marie', description: 'Brand-Aufbau für Jessas Marie', tags: ['Branding', 'Social Media'], sortOrder: 11 },
    { name: 'OÖ Tourismus', description: 'Content & Kampagnen für OÖ Tourismus', tags: ['Tourismus', 'Content', 'Video'], sortOrder: 12 },
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
