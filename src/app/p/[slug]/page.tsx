import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { fetchTeam } from '@/lib/team'
import type { Person } from '@/lib/team'
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

  // Archived pitches sind nicht öffentlich erreichbar
  if (pitch.archivedAt) notFound()

  const editToken = searchParams.edit
  const isEdit = !!editToken && editToken === pitch.editToken

  // Team-Daten nur laden, wenn ein team-Modul vorkommt.
  // Soft-Fail: bei Scrape-Fehlern liefern wir ein leeres Array,
  // das Modul rendert dann einen kleinen Hinweis statt zu crashen.
  const modules = Array.isArray(pitch.modules) ? pitch.modules : []
  const needsTeam = modules.some(
    (m) => m && typeof m === 'object' && (m as { type?: string }).type === 'team'
  )
  let team: Person[] = []
  if (needsTeam) {
    try {
      const result = await fetchTeam()
      team = result.people
    } catch {
      team = []
    }
  }

  return (
    <PitchPage
      pitch={JSON.parse(JSON.stringify(pitch))}
      team={team}
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
