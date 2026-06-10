'use client'

// Multi-Select-Picker für die Lovebrand-Bibliothek. Wird im love-brands Modul
// benutzt, um pro Pitch festzulegen welche Brands gezeigt werden.

import { useEffect, useState } from 'react'

interface LoveBrand {
  id: string
  slug: string
  name: string
  logoUrl: string
  shape: 'default' | 'badge' | 'tall'
  archivedAt: string | null
}

interface Props {
  brandSlugs: string[]
  onChange: (next: { brandSlugs: string[] }) => void
}

export function LoveBrandPicker({ brandSlugs, onChange }: Props) {
  const [brands, setBrands] = useState<LoveBrand[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/lovebrands')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (Array.isArray(d)) setBrands(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const toggle = (slug: string) => {
    const next = brandSlugs.includes(slug)
      ? brandSlugs.filter((s) => s !== slug)
      : [...brandSlugs, slug]
    onChange({ brandSlugs: next })
  }

  const move = (slug: string, dir: -1 | 1) => {
    const idx = brandSlugs.indexOf(slug)
    if (idx === -1) return
    const swap = idx + dir
    if (swap < 0 || swap >= brandSlugs.length) return
    const next = [...brandSlugs]
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    onChange({ brandSlugs: next })
  }

  if (loading) {
    return <div style={{ padding: 16, color: '#888' }}>Lade Lovebrand-Pool...</div>
  }
  if (brands.length === 0) {
    return (
      <div style={{ padding: 16, color: '#888' }}>
        Noch keine Lovebrands im Pool. Lege erst welche unter
        <a href="/admin/lovebrands" style={{ color: '#FF1900', marginLeft: 6 }}>/admin/lovebrands</a> an.
      </div>
    )
  }

  // Ausgewählte zuerst, in selektierter Reihenfolge. Danach der Rest, alphabetisch.
  const selected = brandSlugs
    .map((slug) => brands.find((b) => b.slug === slug))
    .filter((b): b is LoveBrand => !!b)
  const unselected = brands
    .filter((b) => !brandSlugs.includes(b.slug))
    .sort((a, b) => a.name.localeCompare(b.name))

  const Tile = ({ b, isSelected, idx }: { b: LoveBrand; isSelected: boolean; idx?: number }) => (
    <div
      key={b.slug}
      style={{
        position: 'relative',
        background: isSelected ? '#0a0a0a' : '#f5f5f5',
        border: isSelected ? '2px solid #FF1900' : '1px solid #ddd',
        borderRadius: 6,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
      }}
      onClick={() => toggle(b.slug)}
    >
      <div style={{ width: '100%', height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {b.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={b.logoUrl}
            alt={b.name}
            style={{ maxWidth: '90%', maxHeight: '100%', filter: isSelected ? 'grayscale(1) invert(1)' : 'grayscale(1) brightness(0.6)' }}
          />
        )}
      </div>
      <div style={{ fontSize: 11, color: isSelected ? '#fff' : '#666' }}>{b.name}</div>
      {isSelected && idx !== undefined && (
        <div style={{ position: 'absolute', top: 4, left: 6, color: '#FF1900', fontSize: 10, fontWeight: 700 }}>
          #{idx + 1}
        </div>
      )}
      {isSelected && (
        <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 2 }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); move(b.slug, -1) }}
            style={{ background: 'rgba(255,255,255,0.15)', border: 0, color: '#fff', width: 18, height: 18, borderRadius: 3, cursor: 'pointer', fontSize: 10 }}
          >↑</button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); move(b.slug, 1) }}
            style={{ background: 'rgba(255,255,255,0.15)', border: 0, color: '#fff', width: 18, height: 18, borderRadius: 3, cursor: 'pointer', fontSize: 10 }}
          >↓</button>
        </div>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
          Ausgewählt ({selected.length})
        </div>
        {selected.length === 0 ? (
          <div style={{ padding: 12, color: '#888', fontSize: 13, fontStyle: 'italic' }}>Nichts ausgewählt</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
            {selected.map((b, i) => <Tile key={b.slug} b={b} isSelected idx={i} />)}
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>
          Verfügbar ({unselected.length})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          {unselected.map((b) => <Tile key={b.slug} b={b} isSelected={false} />)}
        </div>
      </div>
    </div>
  )
}

// Brücke zwischen JSON-Editor und LoveBrandPicker. Liest brandSlugs aus
// dem JSON, schreibt sie zurück.
export function LoveBrandFields({
  contentJson,
  onChange,
}: {
  contentJson: string
  onChange: (json: string) => void
}) {
  let parsed: { brandSlugs?: string[] } = {}
  try {
    const p = JSON.parse(contentJson || '{}')
    if (p && typeof p === 'object') parsed = p
  } catch {
    parsed = {}
  }
  const brandSlugs = Array.isArray(parsed.brandSlugs)
    ? parsed.brandSlugs.filter((x): x is string => typeof x === 'string')
    : []
  return (
    <LoveBrandPicker
      brandSlugs={brandSlugs}
      onChange={(next) => onChange(JSON.stringify(next, null, 2))}
    />
  )
}
