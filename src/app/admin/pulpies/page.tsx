'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminShell } from '../AdminShell'
import { SlidedecksSubnav } from '../SlidedecksSubnav'
import styles from '../admin.module.css'

interface Pulpie {
  id: string
  slug: string
  name: string
  role: string | null
  imageUrl: string | null
  email: string | null
  phone: string | null
  sortOrder: number
  archivedAt: string | null
  lastSyncedAt: string | null
}

export default function PulpiesPage() {
  const [pulpies, setPulpies] = useState<Pulpie[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const load = useCallback(() => {
    fetch('/api/admin/pulpies')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setPulpies(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const sync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/admin/pulpies/refresh', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setSyncResult(
          `Sync OK: ${data.total} Pulpies (${data.created} neu, ${data.updated} aktualisiert, ${data.unarchived} reaktiviert, ${data.archived} archiviert)${data.fromCache ? ' · aus Cache' : ''}`
        )
      } else {
        setSyncResult(`Fehler: ${data.error || 'unbekannt'}`)
      }
    } catch (e) {
      setSyncResult(`Fehler: ${e instanceof Error ? e.message : 'Sync fehlgeschlagen'}`)
    }
    setSyncing(false)
    load()
  }

  const visible = showArchived ? pulpies : pulpies.filter((p) => !p.archivedAt)
  const activeCount = pulpies.filter((p) => !p.archivedAt).length
  const archivedCount = pulpies.length - activeCount
  const lastSync = pulpies
    .map((p) => p.lastSyncedAt)
    .filter((s): s is string => !!s)
    .sort()
    .pop()

  return (
    <AdminShell>
      <SlidedecksSubnav />
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Pulpies</h1>
        <div className={styles.pageSub}>
          Lokaler Cache der pulpmedia.at-Belegschaft. Wird beim Anzeigen einer
          Pitch sofort aus der DB gelesen, damit nichts auf einen externen Fetch
          warten muss. Aktualisierung läuft manuell per Button.
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          {activeCount} aktive Pulpies
          {archivedCount > 0 && (
            <span style={{ marginLeft: 12, fontSize: 13, color: '#888', fontWeight: 400 }}>
              {archivedCount} archiviert
            </span>
          )}
          {lastSync && (
            <span style={{ marginLeft: 16, fontSize: 12, color: '#aaa', fontWeight: 400 }}>
              · zuletzt synchronisiert: {new Date(lastSync).toLocaleString('de-AT')}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#666', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Archivierte zeigen
          </label>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={sync}
            disabled={syncing}
            title="Lädt die aktuelle Belegschaft von pulpmedia.at/people"
          >
            {syncing ? 'Synchronisiere...' : 'Aus pulpmedia.at synchronisieren'}
          </button>
        </div>
      </div>

      {syncResult && (
        <div
          style={{
            padding: '12px 16px',
            background: syncResult.startsWith('Fehler') ? '#ffe9e6' : '#eefbf4',
            color: syncResult.startsWith('Fehler') ? '#a8201a' : '#1a7341',
            border: '1px solid',
            borderColor: syncResult.startsWith('Fehler') ? '#ffb8b1' : '#a4e2bc',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {syncResult}
        </div>
      )}

      <div className={styles.card}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Laden...</div>
        ) : visible.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
            Noch keine Pulpies im Cache. Klick auf &quot;Synchronisieren&quot; oben rechts.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 16,
              padding: 16,
            }}
          >
            {visible.map((p) => (
              <div
                key={p.id}
                style={{
                  textAlign: 'center',
                  opacity: p.archivedAt ? 0.4 : 1,
                  filter: p.archivedAt ? 'grayscale(1)' : undefined,
                }}
                title={p.archivedAt ? `Archiviert am ${new Date(p.archivedAt).toLocaleDateString('de-AT')}` : p.role || ''}
              >
                <div
                  style={{
                    width: 96,
                    height: 96,
                    margin: '0 auto 8px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: '#eee',
                  }}
                >
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                {p.role && <div style={{ fontSize: 11, color: '#888' }}>{p.role}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
