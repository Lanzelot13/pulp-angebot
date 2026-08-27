/**
 * Helpers für den Publish-Workflow (Draft/Freigabe).
 *
 * Der Snapshot enthält alle Section-Felder plus die referenceIds/channelIds
 * zum Zeitpunkt der Freigabe. Der Editor bearbeitet die Live-Felder direkt,
 * der Snapshot bleibt bis zum nächsten "Freigeben"-Klick unverändert.
 */

// Felder, die der Snapshot einfriert. Meta-Felder wie id, slug, createdAt,
// editToken, contactSlug, template und der Status bleiben LIVE — das sind
// keine inhaltlichen Änderungen für den Kunden. blockedAt und validUntil
// gelten technisch, nicht inhaltlich.
export const PUBLISHABLE_FIELDS = [
  'clientName',
  'clientCompany',
  'projectName',
  'offerNumber',
  'hero',
  'understanding',
  'services',
  'packages',
  'notIncluded',
  'timeline',
  'stats',
  'statsHeadline',
  'statsHidden',
  'referenceIds',
  'referencesHeadline',
  'referencesHidden',
  'channelIds',
  'channelsHidden',
  'channelsHeadline',
  'moodboard',
  'moodboardHidden',
  'legal',
] as const

type Publishable = (typeof PUBLISHABLE_FIELDS)[number]

/**
 * Baut aus einem Offer-Objekt den Snapshot, der als publishedSnapshot
 * gespeichert wird. Nur die Publish-relevanten Felder werden übernommen.
 */
export function buildPublishSnapshot(
  offer: Record<string, unknown>
): Record<string, unknown> {
  const snap: Record<string, unknown> = {}
  for (const field of PUBLISHABLE_FIELDS) {
    if (field in offer) {
      snap[field] = (offer as Record<string, unknown>)[field]
    }
  }
  return snap
}

/**
 * Erwartet den Live-Offer aus DB (mit allen Feldern) und den optionalen
 * publishedSnapshot. Wenn Snapshot vorhanden: die Werte aus dem Snapshot
 * überschreiben die Live-Werte. Sonst gibt's das Live-Offer unverändert.
 *
 * Verwenden wir im Public-Route für die Kundenansicht.
 */
export function mergeSnapshotIntoOffer<T extends Record<string, unknown>>(
  offer: T,
  snapshot: Record<string, unknown> | null | undefined
): T {
  if (!snapshot) return offer
  const merged = { ...offer } as Record<string, unknown>
  for (const field of PUBLISHABLE_FIELDS) {
    if (field in snapshot) {
      merged[field] = snapshot[field]
    }
  }
  return merged as T
}

/**
 * Vergleicht den Live-Zustand mit dem Snapshot. Gibt true zurück, wenn
 * es unveröffentlichte Änderungen gibt (Live weicht vom Snapshot ab).
 */
export function hasUnpublishedChanges(
  live: Record<string, unknown>,
  snapshot: Record<string, unknown> | null | undefined
): boolean {
  if (!snapshot) return false // Wenn kein Snapshot: Legacy-Modus, kein Diff
  for (const field of PUBLISHABLE_FIELDS) {
    const a = live[field]
    const b = snapshot[field]
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      return true
    }
  }
  return false
}

// Publish-Zustand fürs UI. Vier klare Zustände statt vager Kombinationen.
export type PublishState =
  | 'legacy' // Kein Snapshot, kein publishedAt → Bestandsangebot (Live-Modus)
  | 'in-sync' // Snapshot vorhanden, Live = Snapshot
  | 'has-changes' // Snapshot vorhanden, Live weicht ab
  | 'unpublished' // Nach explicit-unpublish (Snapshot leer, publishedAt aber gesetzt)

export function getPublishState(
  live: Record<string, unknown>,
  snapshot: Record<string, unknown> | null | undefined,
  publishedAt: Date | string | null | undefined
): PublishState {
  if (!snapshot && !publishedAt) return 'legacy'
  if (!snapshot && publishedAt) return 'unpublished'
  if (hasUnpublishedChanges(live, snapshot)) return 'has-changes'
  return 'in-sync'
}
export type { Publishable }
