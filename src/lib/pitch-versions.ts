// Helper: bei jedem Edit an einer Pitch wird der aktuelle Zustand
// als Snapshot in PitchVersion abgelegt und die version-Nummer auf
// dem Pitch hochgezählt. Analog zur Versions-Logik bei Angeboten.

import { prisma } from './prisma'

interface SnapshotOpts {
  pitchId: string
  changedBy: string
}

/**
 * Legt einen Snapshot der aktuellen Pitch in `PitchVersion` ab. Returnt die
 * neue version-Nummer, die der Caller anschließend selbst beim Pitch-Update
 * mitschicken muss (per `version: { increment: 1 }` oder direkter Zuweisung).
 *
 * Wird **vor** dem eigentlichen Update aufgerufen, damit der Snapshot den
 * Zustand "vor dem Edit" einfriert.
 */
export async function snapshotPitch({ pitchId, changedBy }: SnapshotOpts): Promise<void> {
  const current = await prisma.pitch.findUnique({ where: { id: pitchId } })
  if (!current) return
  await prisma.pitchVersion.create({
    data: {
      pitchId: current.id,
      version: current.version,
      data: JSON.parse(JSON.stringify(current)),
      changedBy,
    },
  })
}
