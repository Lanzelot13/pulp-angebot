'use client'

// =========================================================
// CasePicker – wählt aus den Admin-CaseReferences einen Case aus
// =========================================================
//
// Setzt direkt das embed-Feld im Modul-Content. Für `case-video`
// wird nach YouTube gefiltert, für `case-social` und `spotlight`
// nach TikTok/Instagram. Du kannst auch nichts auswählen, dann
// bleibt der bestehende embed unangetastet.

import { useEffect, useState } from 'react'

export type CasePlatform = 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'other'

interface CaseReference {
  id: string
  slug: string
  name: string
  url: string
  platform: CasePlatform
  description: string | null
  tags: string[]
}

const PLATFORM_LABEL: Record<CasePlatform, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  other: 'Sonstiges',
}

// YouTube-ID aus URL ziehen, sowohl youtu.be als auch youtube.com unterstützen
function extractYoutubeId(url: string): string {
  const m1 = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/)
  if (m1) return m1[1]
  const m2 = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/)
  if (m2) return m2[1]
  const m3 = url.match(/\/shorts\/([A-Za-z0-9_-]{6,})/)
  if (m3) return m3[1]
  return ''
}

// TikTok-Video-ID aus URL ziehen (numerische ID am Pfadende)
function extractTiktokId(url: string): string {
  const m = url.match(/\/video\/(\d{6,})/)
  return m ? m[1] : ''
}

// Erzeugt einen embed-Block aus einer Case-Referenz, passend zum Modul-Typ
export function embedFromCase(ref: CaseReference): {
  type: 'youtube' | 'tiktok' | 'instagram' | 'video'
  id?: string
  url?: string
  mute?: boolean
  loop?: boolean
} {
  if (ref.platform === 'youtube') {
    return {
      type: 'youtube',
      id: extractYoutubeId(ref.url),
      mute: true,
    }
  }
  if (ref.platform === 'tiktok') {
    return {
      type: 'tiktok',
      id: extractTiktokId(ref.url),
      url: ref.url,
      mute: true,
    }
  }
  if (ref.platform === 'instagram') {
    return {
      type: 'instagram',
      url: ref.url,
      mute: true,
      loop: true,
    }
  }
  // Fallback: roher Video-Link
  return { type: 'video', url: ref.url, mute: true }
}

interface CasePickerProps {
  allowedPlatforms: CasePlatform[]
  // Wird mit dem ausgewählten Case aufgerufen. Der Caller schreibt
  // den embed selbst in den content-JSON.
  onSelect: (ref: CaseReference) => void
}

export function CasePicker({ allowedPlatforms, onSelect }: CasePickerProps) {
  const [refs, setRefs] = useState<CaseReference[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string>('')

  useEffect(() => {
    fetch('/api/case-references')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (Array.isArray(d)) setRefs(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = refs.filter((r) => allowedPlatforms.includes(r.platform))

  return (
    <div
      style={{
        border: '1px solid #eee',
        background: '#fafafa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: '#666',
          marginBottom: 8,
        }}
      >
        Aus Case-Referenzen wählen ({allowedPlatforms.map((p) => PLATFORM_LABEL[p]).join(' · ')})
      </div>
      {loading ? (
        <div style={{ fontSize: 13, color: '#888' }}>Lädt…</div>
      ) : filtered.length === 0 ? (
        <div style={{ fontSize: 13, color: '#888' }}>
          Noch keine passenden Cases. Leg welche unter Admin → Case-Referenzen an.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 13,
              background: '#fff',
            }}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">— Case auswählen —</option>
            {filtered.map((r) => (
              <option key={r.id} value={r.id}>
                [{PLATFORM_LABEL[r.platform]}] {r.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!selected}
            onClick={() => {
              const ref = filtered.find((r) => r.id === selected)
              if (ref) onSelect(ref)
            }}
            style={{
              padding: '8px 14px',
              background: selected ? '#FF1900' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: selected ? 'pointer' : 'not-allowed',
            }}
          >
            Übernehmen
          </button>
        </div>
      )}
    </div>
  )
}
