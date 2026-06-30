'use client'

// =========================================================
// ModuleContentFields
// =========================================================
// Wiederverwendbare Felder rund um den content-JSON eines Moduls.
// Wird sowohl im Modul-Editor (Vorlage im Pool) als auch im Pitch-
// Snapshot-Editor verwendet, damit beide Editoren konsistent sind.

import { PitchIconKey, PitchModuleType, PITCH_ICON_KEYS } from '@/lib/pitch-types'
import { sanitizeRichText } from '@/lib/sanitize-html'
import { RichTextEditor } from './RichTextEditor'
import { CasePicker, CasePlatform, embedFromCase } from './CasePicker'
import styles from './admin.module.css'

// =========================================================
// StandardHeaderFields
// =========================================================
// Eyebrow / Headline (mit **rot**) / Icon (optional) / Body als Brücke
// zwischen Formular und JSON-Content.
export function StandardHeaderFields({
  contentJson,
  onChange,
  hasIcon = false,
}: {
  contentJson: string
  onChange: (json: string) => void
  hasIcon?: boolean
}) {
  let parsed: Record<string, unknown> = {}
  try {
    const p = JSON.parse(contentJson || '{}')
    if (p && typeof p === 'object') parsed = p as Record<string, unknown>
  } catch {
    parsed = {}
  }
  const eyebrow = typeof parsed.eyebrow === 'string' ? parsed.eyebrow : ''
  const headline = typeof parsed.headline === 'string' ? parsed.headline : ''
  const sub = typeof parsed.sub === 'string' ? parsed.sub : ''
  const iconKey = typeof parsed.iconKey === 'string' ? parsed.iconKey : ''

  const update = (patch: Record<string, unknown>) => {
    const next = { ...parsed, ...patch }
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v === null || v === undefined) delete next[k]
    }
    onChange(JSON.stringify(next, null, 2))
  }

  return (
    <div
      style={{
        border: '1px solid #eee',
        background: '#fafafa',
        borderRadius: 8,
        padding: 14,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: '#888',
          marginBottom: 12,
        }}
      >
        Slide-Header
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Eyebrow</label>
        <input
          className={styles.formInput}
          value={eyebrow}
          onChange={(e) => update({ eyebrow: e.target.value })}
          placeholder="Kleiner Augenbrauen-Text, optional"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Titel <span style={{ color: '#888', fontWeight: 400 }}>(`**Text**` wird rot)</span>
        </label>
        <input
          className={styles.formInput}
          value={headline}
          onChange={(e) => update({ headline: e.target.value })}
          placeholder="z.B. So bauen wir **Lovebrands**"
        />
      </div>

      {hasIcon && (
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Icon am Ende der Überschrift</label>
          <select
            className={styles.formInput}
            value={iconKey}
            onChange={(e) => update({ iconKey: e.target.value })}
            style={{ appearance: 'auto' }}
          >
            <option value="">— Keines —</option>
            {(PITCH_ICON_KEYS as readonly PitchIconKey[]).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Body</label>
        <RichTextEditor
          value={sub}
          onChange={(html) => update({ sub: sanitizeRichText(html) })}
          placeholder="Untertitel oder kurzer Body, optional. Fett, kursiv, unterstrichen, Link verfügbar."
        />
      </div>
    </div>
  )
}

// =========================================================
// CaseEmbedField – setzt content.embed über den CasePicker
// =========================================================
export function CaseEmbedField({
  contentJson,
  onChange,
  allowedPlatforms,
}: {
  contentJson: string
  onChange: (json: string) => void
  allowedPlatforms: CasePlatform[]
}) {
  return (
    <CasePicker
      allowedPlatforms={allowedPlatforms}
      onSelect={(ref) => {
        let parsed: Record<string, unknown> = {}
        try {
          const p = JSON.parse(contentJson || '{}')
          if (p && typeof p === 'object') parsed = p as Record<string, unknown>
        } catch {
          parsed = {}
        }
        parsed.embed = embedFromCase(ref)
        onChange(JSON.stringify(parsed, null, 2))
      }}
    />
  )
}

// =========================================================
// Per Modul-Typ entscheiden, welche Felder im Editor passen
// =========================================================
export function showsStandardHeader(type: PitchModuleType): boolean {
  return [
    'uw',
    'love-brands',
    'saeulen',
    'leistungen',
    'monitor',
    'process',
    'fragen',
    'tipps',
    'optionen',
  ].includes(type)
}

export function casePlatformsFor(type: PitchModuleType): CasePlatform[] | null {
  if (type === 'case-video') return ['youtube']
  if (type === 'case-social' || type === 'spotlight') return ['tiktok', 'instagram']
  return null
}
