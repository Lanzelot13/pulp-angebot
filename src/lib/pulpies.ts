// =========================================================
// Pulpies — lokaler DB-Cache der pulpmedia.at-Belegschaft
// =========================================================
//
// Statt bei jedem Pitch-Page-Load pulpmedia.at zu scrapen, lesen wir
// aus der lokalen `Pulpie`-Tabelle. Aktualisiert wird per Admin-Button
// (siehe /admin/pulpies und /api/admin/pulpies/refresh).

import { prisma } from './prisma'
import { fetchTeam, type Person } from './team'

export type PulpieDb = {
  id: string
  slug: string
  name: string
  role: string | null
  imageUrl: string | null
  email: string | null
  phone: string | null
  sortOrder: number
  archivedAt: Date | null
  lastSyncedAt: Date | null
}

/** Alle aktiven Pulpies aus der DB, sortiert. */
export async function getActivePulpies(): Promise<PulpieDb[]> {
  return prisma.pulpie.findMany({
    where: { archivedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

/**
 * Sync von pulpmedia.at in die lokale DB.
 *
 * Strategie:
 *  - Bestehende Pulpies (per Slug gematcht): name/role/imageUrl/etc updaten,
 *    archivedAt auf null setzen (falls vorher archiviert), lastSyncedAt aktuell.
 *  - Neue Pulpies (nicht in DB): anlegen.
 *  - Fehlende Pulpies (in DB aber nicht im Scrape): mit archivedAt markieren,
 *    NICHT löschen, damit ältere Pitches mit alten attendingSlugs weiter matchen.
 *
 * Returnt eine Zusammenfassung für die Admin-UI.
 */
export interface SyncResult {
  total: number
  created: number
  updated: number
  archived: number
  unarchived: number
  fromCache: boolean
}

export async function syncPulpiesFromWebsite(): Promise<SyncResult> {
  // forceFresh: umgeht Next.js-Cache, damit der Sync wirklich den aktuellen
  // Stand von pulpmedia.at/people zieht und nicht eine bis zu 1h alte Version.
  const { people, fromCache } = await fetchTeam({ forceFresh: true })
  const incomingSlugs = new Set(people.map((p: Person) => p.slug))

  // Bestehende DB-Einträge laden (auch archivierte – damit wir un-archivieren können)
  const existing = await prisma.pulpie.findMany()
  const existingBySlug = new Map(existing.map((e) => [e.slug, e]))

  let created = 0
  let updated = 0
  let unarchived = 0
  const now = new Date()

  for (let i = 0; i < people.length; i++) {
    const p = people[i]
    const exist = existingBySlug.get(p.slug)
    if (exist) {
      const wasArchived = !!exist.archivedAt
      await prisma.pulpie.update({
        where: { id: exist.id },
        data: {
          name: p.name,
          role: p.role,
          imageUrl: p.imageUrl,
          email: p.email,
          phone: p.phone,
          sortOrder: i,
          archivedAt: null,
          lastSyncedAt: now,
        },
      })
      if (wasArchived) unarchived++
      else updated++
    } else {
      await prisma.pulpie.create({
        data: {
          slug: p.slug,
          name: p.name,
          role: p.role,
          imageUrl: p.imageUrl,
          email: p.email,
          phone: p.phone,
          sortOrder: i,
          lastSyncedAt: now,
        },
      })
      created++
    }
  }

  // Fehlende archivieren
  let archived = 0
  for (const e of existing) {
    if (!incomingSlugs.has(e.slug) && !e.archivedAt) {
      await prisma.pulpie.update({
        where: { id: e.id },
        data: { archivedAt: now },
      })
      archived++
    }
  }

  return {
    total: people.length,
    created,
    updated,
    archived,
    unarchived,
    fromCache,
  }
}
