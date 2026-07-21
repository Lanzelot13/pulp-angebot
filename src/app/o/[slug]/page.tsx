import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSessionFromCookies } from '@/lib/admin-auth'
import { mergeSnapshotIntoOffer } from '@/lib/publish'
import { OfferPage } from './OfferPage'
import { OfferPage2 } from './OfferPage2'
import { OfferUnavailable } from './OfferUnavailable'

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

  // Zugriffs-Check: Wenn das Angebot manuell gesperrt oder abgelaufen ist,
  // sehen nur eingeloggte Admins und Aufrufe mit gültigem edit-Token es
  // weiterhin. Alle anderen bekommen die Info-Seite.
  const offerAny = offer as unknown as {
    blockedAt?: Date | null
    validUntil?: Date | null
    publishedSnapshot?: Record<string, unknown> | null
    publishedAt?: Date | null
  }
  const editToken = searchParams.edit
  const hasEditToken = editToken && editToken === offer.editToken
  const adminUser = hasEditToken ? null : await getSessionFromCookies()
  const bypass = hasEditToken || adminUser
  const isBlocked = !!offerAny.blockedAt
  const isExpired = !!(offerAny.validUntil && new Date(offerAny.validUntil) < new Date())
  if (!bypass && (isBlocked || isExpired)) {
    return (
      <OfferUnavailable
        reason={isExpired ? 'expired' : 'blocked'}
        contact={offer.contact ?? null}
        clientCompany={offer.clientCompany}
      />
    )
  }

  // Draft-Modus: Wenn das Angebot explizit "nicht mehr veröffentlicht" wurde
  // (publishedAt gesetzt, aber publishedSnapshot null), sieht der Kunde
  // ebenfalls die Info-Seite. Bestandsangebote (beide null) sind davon nicht
  // betroffen und rendern weiter Live.
  const isUnpublished =
    !offerAny.publishedSnapshot && !!offerAny.publishedAt
  if (!bypass && isUnpublished) {
    return (
      <OfferUnavailable
        reason="blocked"
        contact={offer.contact ?? null}
        clientCompany={offer.clientCompany}
      />
    )
  }

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

  // Draft/Publish-Logik: der Kunde sieht den publishedSnapshot (falls
  // vorhanden), Admins und der Editor sehen immer den Live-Zustand.
  // Bestandsangebote ohne Snapshot fallen in den Live-Modus zurück.
  const isClean = searchParams.clean === '1'
  const isEdit = !isClean && !!hasEditToken
  const isEditorOrAdmin = isEdit || !!adminUser
  const displayOffer = isEditorOrAdmin
    ? offer
    : (mergeSnapshotIntoOffer(
        offer as unknown as Record<string, unknown>,
        offerAny.publishedSnapshot ?? null
      ) as unknown as typeof offer)

  // Resolve references and channels — die IDs kommen aus dem sichtbaren
  // Objekt (Snapshot oder Live), damit der Kunde die richtigen Referenzen sieht.
  const displayRefIds = (displayOffer as unknown as { referenceIds?: string[] }).referenceIds || []
  const displayChIds = (displayOffer as unknown as { channelIds?: string[] }).channelIds || []
  const references = displayRefIds.length > 0
    ? await prisma.reference.findMany({
        where: { id: { in: displayRefIds } },
        orderBy: { sortOrder: 'asc' },
      })
    : []

  const channels = displayChIds.length > 0
    ? await prisma.channel.findMany({
        where: { id: { in: displayChIds } },
        orderBy: { sortOrder: 'asc' },
      })
    : []

  const tpl2 = (offer as unknown as { template?: string }).template
  const TemplateComponent = tpl2 === 'TEMPLATE2' ? OfferPage2 : OfferPage
  return (
    <TemplateComponent
      offer={JSON.parse(JSON.stringify(displayOffer))}
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
