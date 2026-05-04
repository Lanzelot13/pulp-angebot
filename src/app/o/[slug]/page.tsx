import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { OfferPage } from './OfferPage'

interface PageProps {
  params: { slug: string }
  searchParams: { clean?: string; edit?: string }
}

export default async function Page({ params, searchParams }: PageProps) {
  const offer = await prisma.offer.findUnique({
    where: { slug: params.slug },
    include: { contact: true },
  })

  if (!offer) notFound()

  // Resolve references and channels
  const references = offer.referenceIds.length > 0
    ? await prisma.reference.findMany({
        where: { id: { in: offer.referenceIds } },
        orderBy: { sortOrder: 'asc' },
      })
    : []

  const channels = offer.channelIds.length > 0
    ? await prisma.channel.findMany({
        where: { id: { in: offer.channelIds } },
        orderBy: { sortOrder: 'asc' },
      })
    : []

  // Determine mode
  const isClean = searchParams.clean === '1'
  const editToken = searchParams.edit
  const isEdit = !isClean && editToken === offer.editToken

  return (
    <OfferPage
      offer={JSON.parse(JSON.stringify(offer))}
      references={JSON.parse(JSON.stringify(references))}
      channels={JSON.parse(JSON.stringify(channels))}
      mode={isEdit ? 'edit' : 'view'}
    />
  )
}

export async function generateMetadata({ params }: PageProps) {
  const offer = await prisma.offer.findUnique({
    where: { slug: params.slug },
    select: { projectName: true, clientCompany: true },
  })

  if (!offer) return { title: 'Angebot nicht gefunden' }

  return {
    title: `${offer.projectName} | Pulpmedia`,
    description: `Angebot für ${offer.clientCompany}`,
  }
}
