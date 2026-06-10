import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getActivePulpies } from '@/lib/pulpies'
import { PitchPage } from './PitchPage'

interface PageProps {
  params: { slug: string }
  searchParams: { edit?: string }
}

export const dynamic = 'force-dynamic'

export default async function Page({ params, searchParams }: PageProps) {
  const pitch = await prisma.pitch.findUnique({
    where: { slug: params.slug },
    include: { contact: true },
  })
  if (!pitch) notFound()
  if (pitch.archivedAt) notFound()

  const editToken = searchParams.edit
  const isEdit = !!editToken && editToken === pitch.editToken

  const modules = Array.isArray(pitch.modules) ? pitch.modules : []
  const hasType = (type: string) =>
    modules.some((m) => m && typeof m === 'object' && (m as { type?: string }).type === type)

  // Pulpies aus dem lokalen DB-Cache (kein Live-Fetch, kein Loading-Wait).
  // Sync läuft über /admin/pulpies.
  const pulpiesData = hasType('team') ? await getActivePulpies() : []
  const team = pulpiesData.map((p) => ({
    slug: p.slug,
    name: p.name,
    role: p.role || '',
    imageUrl: p.imageUrl || '',
    email: p.email,
    phone: p.phone,
  }))

  // Lovebrand-Pool für das love-brands-Modul (Lookup per Slug beim Render).
  const lovebrandsData = hasType('love-brands')
    ? await prisma.loveBrand.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: 'asc' } })
    : []
  const lovebrands = lovebrandsData.map((b) => ({
    slug: b.slug,
    name: b.name,
    logoUrl: b.logoUrl,
    shape: (b.shape as 'default' | 'badge' | 'tall') || 'default',
  }))

  return (
    <PitchPage
      pitch={JSON.parse(JSON.stringify(pitch))}
      team={team}
      lovebrands={lovebrands}
      mode={isEdit ? 'edit' : 'view'}
    />
  )
}

export async function generateMetadata({ params }: PageProps) {
  const pitch = await prisma.pitch.findUnique({
    where: { slug: params.slug },
  })
  if (!pitch || pitch.archivedAt) {
    return { title: 'Pitch nicht gefunden' }
  }
  return {
    title: `Pulpmedia × ${pitch.clientCompany}`,
    description: `Pulpmedia Agenturpräsentation für ${pitch.clientCompany}`,
  }
}
