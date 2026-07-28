'use client'

// =========================================================
// ModuleContentFields
// =========================================================
// Wiederverwendbare Felder rund um den content-JSON eines Moduls.
// Wird sowohl im Modul-Editor (Vorlage im Pool) als auch im Pitch-
// Snapshot-Editor verwendet, damit beide Editoren konsistent sind.

import { useState } from 'react'
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
// BackgroundFields – imageUrl / align / focalPoint / darkness + Header
// =========================================================
export function BackgroundFields({
  contentJson,
  onChange,
}: {
  contentJson: string
  onChange: (json: string) => void
}) {
  let parsed: Record<string, unknown> = {}
  try {
    const p = JSON.parse(contentJson || '{}')
    if (p && typeof p === 'object') parsed = p as Record<string, unknown>
  } catch {
    parsed = {}
  }
  const imageUrl = typeof parsed.imageUrl === 'string' ? parsed.imageUrl : ''
  const align =
    parsed.align === 'bottom-left' || parsed.align === 'bottom-center'
      ? parsed.align
      : 'center'
  const focalPoint = typeof parsed.focalPoint === 'string' ? parsed.focalPoint : 'center center'
  const overlayDarkness =
    typeof parsed.overlayDarkness === 'number'
      ? parsed.overlayDarkness
      : 0.4

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const update = (patch: Record<string, unknown>) => {
    const next = { ...parsed, ...patch }
    onChange(JSON.stringify(next, null, 2))
  }

  const upload = async (file: File) => {
    setUploadError(null)
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name)
    try {
      const res = await fetch('/api/admin/slide-assets/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setUploadError(err.error || `Upload fehlgeschlagen (${res.status})`)
        return
      }
      const data = await res.json()
      if (data.url) update({ imageUrl: data.url })
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
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
        Hintergrund-Bild
      </div>

      {imageUrl && (
        <div
          style={{
            marginBottom: 12,
            aspectRatio: '16 / 6',
            background: `url("${imageUrl}") ${focalPoint} / cover no-repeat, #111`,
            borderRadius: 6,
            border: '1px solid #ddd',
          }}
        />
      )}

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Bild-URL</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className={styles.formInput}
            value={imageUrl}
            onChange={(e) => update({ imageUrl: e.target.value })}
            placeholder="https://... oder /pitch/…jpg"
            style={{ flex: 1 }}
          />
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              background: uploading ? '#ccc' : '#FF1900',
              color: '#fff',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: uploading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {uploading ? 'Lädt…' : 'Bild hochladen'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) upload(f)
                e.target.value = ''
              }}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        {uploadError && (
          <div style={{ color: '#a8201a', fontSize: 12, marginTop: 6 }}>{uploadError}</div>
        )}
        <div className={styles.formHint}>
          Max 10 MB. Format JPG, PNG oder WEBP. Landet in Vercel Blob unter slide-assets/.
        </div>
      </div>

      <div
        className={styles.formGroup}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
      >
        <div>
          <label className={styles.formLabel}>Text-Position</label>
          <select
            className={styles.formInput}
            value={align}
            onChange={(e) => update({ align: e.target.value })}
            style={{ appearance: 'auto' }}
          >
            <option value="center">Zentriert</option>
            <option value="bottom-left">Unten links</option>
            <option value="bottom-center">Unten mittig</option>
          </select>
        </div>
        <div>
          <label className={styles.formLabel}>
            Bildausschnitt <span style={{ color: '#888', fontWeight: 400 }}>(CSS)</span>
          </label>
          <input
            className={styles.formInput}
            value={focalPoint}
            onChange={(e) => update({ focalPoint: e.target.value })}
            placeholder="z.B. center center, top center, 30% 70%"
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Bild-Abdunkelung ({Math.round(overlayDarkness * 100)}%)
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={overlayDarkness}
          onChange={(e) => update({ overlayDarkness: parseFloat(e.target.value) })}
          style={{ width: '100%' }}
        />
        <div className={styles.formHint}>
          0 % = Bild klar, 100 % = schwarz. Höher wenn der Text schlecht lesbar ist.
        </div>
      </div>
    </div>
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
    'background',
  ].includes(type)
}

export function casePlatformsFor(type: PitchModuleType): CasePlatform[] | null {
  if (type === 'case-video') return ['youtube']
  if (type === 'case-social' || type === 'spotlight') return ['tiktok', 'instagram']
  return null
}
