import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { OfferPage } from './OfferPage'
import { OfferPage2 } from './OfferPage2'

interface PageProps {
  params: { slug: string }
  searchParams: { clean?: string; edit?: string; version?: string }
}

export default async function Page({ params, searchParams }: PageProps) {
  const offer = await prisma.offer.findUnique({
    where: { slug: params.slug },
    include: { contact: true },
  })

  if (!offer) notFound()

  // Archived offers are not reachable for customers
  if ((offer as unknown as { archivedAt?: Date | null }).archivedAt) notFound()

  // If a specific version is requested, load from version snapshot
  if (searchParams.version) {
    const versionNum = parseInt(searchParams.version, 10)
    const offerVersion = await prisma.offerVersion.findFirst({
      where: { offerId: offer.id, version: versionNum },
    })

    if (offerVersion && offerVersion.data) {
      const versionData = offerVersion.data as Record<string, unknown>
      const versionOffer = { ...offer, ...versionData, version: versionNum }

      // Resolve references and channels from the snapshot
      const refIds = (versionData.referenceIds as string[]) || offer.referenceIds || []
      const chIds = (versionData.channelIds as string[]) || offer.channelIds || []

      const references = refIds.length > 0
        ? await prisma.reference.findMany({ where: { id: { in: refIds } }, orderBy: { sortOrder: 'asc' } })
        : []
      const channels = chIds.length > 0
        ? await prisma.channel.findMany({ where: { id: { in: chIds } }, orderBy: { sortOrder: 'asc' } })
        : []

      const tpl = (offer as unknown as { template?: string }).template
      const TemplateComponent = tpl === 'TEMPLATE2' ? OfferPage2 : OfferPage
      return (
        <TemplateComponent
          offer={JSON.parse(JSON.stringify(versionOffer))}
          references={JSON.parse(JSON.stringify(references))}
          channels={JSON.parse(JSON.stringify(channels))}
          mode="view"
        />
      )
    }
  }

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

  const tpl2 = (offer as unknown as { template?: string }).template
  const TemplateComponent = tpl2 === 'TEMPLATE2' ? OfferPage2 : OfferPage
  return (
    <TemplateComponent
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
  })

  if (!offer) return { title: 'Angebot nicht gefunden' }
  if ((offer as unknown as { archivedAt?: Date | null }).archivedAt) {
    return { title: 'Angebot nicht gefunden' }
  }

  return {
    title: `${offer.projectName} | Pulpmedia`,
    description: `Angebot für ${offer.clientCompany}`,
  }
}
