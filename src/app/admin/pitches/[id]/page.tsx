import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSessionFromCookies } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import { PitchEditor } from './PitchEditor'

interface PageProps {
  params: { id: string }
}

export const dynamic = 'force-dynamic'

export default async function PitchEditPage({ params }: PageProps) {
  const user = await getSessionFromCookies()
  if (!user) redirect('/admin/login')

  const pitch = await prisma.pitch.findUnique({
    where: { id: params.id },
    include: { contact: true },
  })
  if (!pitch) notFound()

  const contacts = await prisma.contact.findMany({ orderBy: { name: 'asc' } })

  return (
    <PitchEditor
      initialPitch={JSON.parse(JSON.stringify(pitch))}
      contacts={JSON.parse(JSON.stringify(contacts))}
    />
  )
}
