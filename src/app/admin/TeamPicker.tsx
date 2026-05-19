'use client'

// Helper zum Auswählen von Personen für ein team-grid Modul.
// Zieht sich die aktuelle Pulpmedia-Belegschaft von /api/team und
// bietet eine Checkbox-Liste. Funktioniert sowohl in der Modul-
// Verwaltung als auch im Pitch-Editor.

import { useEffect, useState } from 'react'
import styles from './admin.module.css'

interface Person {
  slug: string
  name: string
  role: string
  imageUrl: string
}

interface Props {
  headline: string
  personSlugs: string[]
  onChange: (next: { headline: string; personSlugs: string[] }) => void
}

export function TeamPicker({ headline, personSlugs, onChange }: Props) {
  const [team, setTeam] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.people)) setTeam(d.people)
        if (d.error) setError(d.error)
        setFromCache(!!d.fromCache)
        setLoading(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Team konnte nicht geladen werden')
        setLoading(false)
      })
  }, [])

  const togglePerson = (slug: string) => {
    const next = personSlugs.includes(slug)
      ? personSlugs.filter((s) => s !== slug)
      : [...personSlugs, slug]
    onChange({ headline, personSlugs: next })
  }

  const movePerson = (slug: string, dir: -1 | 1) => {
    const idx = personSlugs.indexOf(slug)
    if (idx === -1) return
    const swap = idx + dir
    if (swap < 0 || swap >= personSlugs.length) return
    const next = [...personSlugs]
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    onChange({ headline, personSlugs: next })
  }

  const filteredTeam = team.filter((p) => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)
    )
  })

  // Ausgewählte oben, in der gewählten Reihenfolge. Danach die anderen,
  // alphabetisch nach Namen.
  const selectedPeople = personSlugs
    .map((slug) => team.find((p) => p.slug === slug))
    .filter((p): p is Person => !!p)
  const unselectedPeople = filteredTeam
    .filter((p) => !personSlugs.includes(p.slug))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Headline</label>
        <input
          className={styles.formInput}
          value={headline}
          onChange={(e) => onChange({ headline: e.target.value, personSlugs })}
          placeholder="z.B. Wer ist heute da"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Personen ({personSlugs.length} ausgewählt)
        </label>

        {error && !fromCache && (
          <div
            style={{
              padding: '8px 12px',
              background: '#fff0ed',
              color: '#c52a00',
              fontSize: 13,
              borderRadius: 4,
              marginBottom: 8,
            }}
          >
            {error}
          </div>
        )}
        {fromCache && (
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
            pulpmedia.at gerade nicht erreichbar, zeige zuletzt geladene Liste.
          </div>
        )}

        {loading && <div style={{ color: '#888', fontSize: 13 }}>Lädt Team von pulpmedia.at …</div>}

        {!loading && team.length === 0 && !error && (
          <div className={styles.emptyText}>Keine Personen gefunden.</div>
        )}

        {!loading && selectedPeople.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
              Ausgewählt — Reihenfolge bestimmt die Anzeige in der Pitch
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 8,
              }}
            >
              {selectedPeople.map((p, i) => (
                <div
                  key={p.slug}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    border: '1px solid #FF1900',
                    borderRadius: 6,
                    background: '#fff5f3',
                  }}
                >
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      width={32}
                      height={32}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.role}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button
                      type="button"
                      onClick={() => movePerson(p.slug, -1)}
                      disabled={i === 0}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: i === 0 ? 'default' : 'pointer',
                        color: i === 0 ? '#ccc' : '#666',
                        fontSize: 10,
                        padding: '0 2px',
                      }}
                      title="Nach oben"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => movePerson(p.slug, 1)}
                      disabled={i === selectedPeople.length - 1}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor:
                          i === selectedPeople.length - 1 ? 'default' : 'pointer',
                        color:
                          i === selectedPeople.length - 1 ? '#ccc' : '#666',
                        fontSize: 10,
                        padding: '0 2px',
                      }}
                      title="Nach unten"
                    >
                      ▼
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePerson(p.slug)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#c0392b',
                      fontSize: 14,
                      padding: '0 4px',
                    }}
                    title="Entfernen"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && team.length > 0 && (
          <>
            <input
              className={styles.formInput}
              placeholder="Suchen nach Name oder Rolle …"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 6,
                maxHeight: 280,
                overflowY: 'auto',
                padding: 4,
                border: '1px solid #eee',
                borderRadius: 6,
              }}
            >
              {unselectedPeople.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => togglePerson(p.slug)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '6px 8px',
                    background: '#fafafa',
                    border: '1px solid #eee',
                    borderRadius: 4,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {p.imageUrl && (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      width={28}
                      height={28}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        objectFit: 'cover',
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13 }}>{p.name}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#888',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.role}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#FF1900' }}>+ wählen</span>
                </button>
              ))}
              {unselectedPeople.length === 0 && (
                <div style={{ padding: 12, color: '#888', fontSize: 13, textAlign: 'center', gridColumn: '1 / -1' }}>
                  {filter ? 'Keine Treffer' : 'Alle bereits ausgewählt'}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
