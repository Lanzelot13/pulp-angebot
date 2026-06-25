import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getActivePulpies } from '@/lib/pulpies'
import { PitchPage } from './PitchPage'

interface PageProps {
  params: { slug: string }
  searchParams: { edit?: string; version?: string }
}

export const dynamic = 'force-dynamic'

export default async function Page({ params, searchParams }: PageProps) {
  const baseRecord = await prisma.pitch.findUnique({
    where: { slug: params.slug },
    include: { contact: true },
  })
  if (!baseRecord) notFound()
  if (baseRecord.archivedAt) notFound()

  const editToken = searchParams.edit
  const isEdit = !!editToken && editToken === baseRecord.editToken

  // Historische Version anzeigen, wenn `?version=N` gesetzt ist.
  // Wir laden den Snapshot und überlagern damit die aktuelle Pitch.
  // contact-Verknüpfung bleibt (die ist nicht teil des Snapshots).
  // Defensiv: wenn die PitchVersion-Tabelle noch nicht existiert (Schema-Lag),
  // schlucken wir den Fehler und zeigen die aktuelle Version.
  let pitch = baseRecord
  if (searchParams.version) {
    const versionNum = parseInt(searchParams.version, 10)
    if (Number.isFinite(versionNum) && versionNum >= 1 && versionNum !== baseRecord.version) {
      try {
        const pv = await prisma.pitchVersion.findFirst({
          where: { pitchId: baseRecord.id, version: versionNum },
        })
        if (pv) {
          const snap = pv.data as Record<string, unknown>
          pitch = {
            ...baseRecord,
            clientCompany: (snap.clientCompany as string) ?? baseRecord.clientCompany,
            occasion: (snap.occasion as string | null) ?? baseRecord.occasion,
            modules: (snap.modules as typeof baseRecord.modules) ?? baseRecord.modules,
            version: versionNum,
          }
        }
      } catch (err) {
        console.warn('PitchVersion lookup failed (Schema-Lag?):', err)
      }
    }
  }

  const modules = Array.isArray(pitch.modules) ? pitch.modules : []
  const hasType = (type: string) =>
    modules.some((m) => m && typeof m === 'object' && (m as { type?: string }).type === type)

  // Pulpies aus dem lokalen DB-Cache (kein Live-Fetch, kein Loading-Wait).
  // Sync läuft über /admin/pulpies. Bei Schema-Lag soft-failen.
  let team: Array<{ slug: string; name: string; role: string; imageUrl: string; email: string | null; phone: string | null }> = []
  if (hasType('team')) {
    try {
      const pulpiesData = await getActivePulpies()
      team = pulpiesData.map((p) => ({
        slug: p.slug,
        name: p.name,
        role: p.role || '',
        imageUrl: p.imageUrl || '',
        email: p.email,
        phone: p.phone,
      }))
    } catch (err) {
      console.warn('Pulpie lookup failed (Schema-Lag?):', err)
    }
  }

  // Lovebrand-Pool für das love-brands-Modul (Lookup per Slug beim Render).
  // Bei Schema-Lag (zb fehlende invertOnDark-Spalte) soft-failen.
  let lovebrands: Array<{ slug: string; name: string; logoUrl: string; shape: 'default' | 'badge' | 'tall'; invertOnDark: boolean }> = []
  if (hasType('love-brands')) {
    try {
      const lovebrandsData = await prisma.loveBrand.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: 'asc' } })
      lovebrands = lovebrandsData.map((b) => ({
        slug: b.slug,
        name: b.name,
        logoUrl: b.logoUrl,
        shape: (b.shape as 'default' | 'badge' | 'tall') || 'default',
        invertOnDark: (b as { invertOnDark?: boolean }).invertOnDark ?? true,
      }))
    } catch (err) {
      console.warn('LoveBrand lookup failed (Schema-Lag?):', err)
    }
  }

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
