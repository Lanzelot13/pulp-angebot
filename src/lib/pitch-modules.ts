// Helpers für die `modules` JSON-Liste auf einer Pitch.
// Die JSON-Spalte ist ein geordnetes Array von Snapshots, jedes mit:
//   instanceId, moduleId|null, type, name, content, sourceUpdatedAt|null, sortOrder

import { randomUUID } from 'crypto'
import type { Prisma } from '@prisma/client'
import type { PitchModuleType, ModuleContent } from './pitch-types'

export interface PitchModuleSnapshot {
  instanceId: string
  moduleId: string | null
  type: PitchModuleType
  name: string
  content: ModuleContent | Record<string, unknown>
  sourceUpdatedAt: string | null
  sortOrder: number
}

export function snapshotFromModule(opts: {
  moduleId: string
  type: PitchModuleType
  name: string
  content: unknown
  sourceUpdatedAt: Date | string
  sortOrder: number
}): PitchModuleSnapshot {
  return {
    instanceId: randomUUID(),
    moduleId: opts.moduleId,
    type: opts.type,
    name: opts.name,
    content: (opts.content as ModuleContent) ?? {},
    sourceUpdatedAt:
      typeof opts.sourceUpdatedAt === 'string'
        ? opts.sourceUpdatedAt
        : opts.sourceUpdatedAt.toISOString(),
    sortOrder: opts.sortOrder,
  }
}

export function snapshotFromCustom(opts: {
  type: PitchModuleType
  name: string
  content: unknown
  sortOrder: number
}): PitchModuleSnapshot {
  return {
    instanceId: randomUUID(),
    moduleId: null,
    type: opts.type,
    name: opts.name,
    content: (opts.content as ModuleContent) ?? {},
    sourceUpdatedAt: null,
    sortOrder: opts.sortOrder,
  }
}

export function parsePitchModules(raw: unknown): PitchModuleSnapshot[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (entry): entry is PitchModuleSnapshot =>
      !!entry &&
      typeof entry === 'object' &&
      typeof (entry as PitchModuleSnapshot).instanceId === 'string' &&
      typeof (entry as PitchModuleSnapshot).type === 'string'
  )
}

export function nextSortOrder(modules: PitchModuleSnapshot[]): number {
  if (modules.length === 0) return 0
  return Math.max(...modules.map((m) => m.sortOrder)) + 1
}

export function sortModules(modules: PitchModuleSnapshot[]): PitchModuleSnapshot[] {
  return [...modules].sort((a, b) => a.sortOrder - b.sortOrder)
}

// Prisma's JSON column input expects an indexable object/array. Our typed
// snapshots are JSON-compatible by construction (only primitive/array/object
// fields), so we cast them at the boundary instead of weakening the type
// everywhere.
export function serializeModules(
  modules: PitchModuleSnapshot[]
): Prisma.InputJsonValue {
  return modules as unknown as Prisma.InputJsonValue
}
