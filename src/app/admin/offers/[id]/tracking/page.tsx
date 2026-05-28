'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { AdminShell } from '../../../AdminShell'
import { IconArrowLeft, IconExternalLink } from '../../../Icons'
import styles from '../../../admin.module.css'
import { STATUS_LABELS, type OfferStatus } from '@/lib/types'
import { formatGeo } from '@/lib/geo'

interface SessionRow {
  id: string
  openedAt: string
  lastEventAt: string
  activeSeconds: number
  targetStatus: string | null
  country: string | null
  region: string | null
  device: string | null
  referrer: string | null
  eventCount: number
  sectionsSeen: number
}

interface TrackingResponse {
  offer: {
    id: string
    slug: string
    projectName: string
    clientCompany: string
    status: OfferStatus
  }
  stats: {
    sessionCount: number
    uniqueDays: number
    totalActiveSeconds: number
    lastEventAt: string | null
  }
  statusBreakdown: Record<string, number>
  sessions: SessionRow[]
}

interface EventRow {
  id: string
  type: string
  payload: Record<string, unknown> | null
  at: string
}

interface DetailResponse {
  view: SessionRow & { events: EventRow[] }
}

function formatDuration(totalSec: number) {
  if (totalSec < 60) return `${totalSec}s`
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return `${h}h ${rest}m`
}

function formatDate(iso: string | null) {
  if (!iso) return '–'
  const d = new Date(iso)
  return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })
}

function statusLabel(s: string | null) {
  if (!s) return '–'
  return STATUS_LABELS[s as OfferStatus] || s
}

export default function OfferTrackingPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<TrackingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailView, setDetailView] = useState<DetailResponse['view'] | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const trackRes = await fetch(`/api/admin/offers/${params.id}/tracking`)
      if (trackRes.ok) {
        const j: TrackingResponse = await trackRes.json()
        setData(j)
      }
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    void load()
  }, [load])

  async function openDetail(viewId: string) {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/offers/${params.id}/tracking?viewId=${viewId}`)
      if (res.ok) {
        const j: DetailResponse = await res.json()
        setDetailView(j.view)
      }
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <AdminShell>
      <div className={styles.pageHeader}>
        <Link href="/admin/offers" className={styles.backLink}>
          <IconArrowLeft />
          Zur Übersicht
        </Link>
        <h1 className={styles.pageTitle}>Tracking</h1>
        {data?.offer && (
          <div className={styles.pageSub}>
            {data.offer.projectName} · {data.offer.clientCompany}{' '}
            <Link href={`/o/${data.offer.slug}`} target="_blank" className={styles.inlineLink}>
              <IconExternalLink /> Angebot ansehen
            </Link>
          </div>
        )}
      </div>

      {loading && <div className={styles.muted}>Lade Tracking-Daten…</div>}

      {!loading && data && data.stats.sessionCount === 0 && (
        <div className={styles.emptyState}>
          Noch keine Aufrufe registriert. Sobald jemand das Angebot öffnet, erscheinen
          die Daten hier.
        </div>
      )}

      {!loading && data && data.stats.sessionCount > 0 && (
        <>
          {/* Stats */}
          <div className={styles.trackStatsGrid}>
            <div className={styles.trackStatCard}>
              <div className={styles.trackStatLabel}>Aufrufe</div>
              <div className={styles.trackStatValue}>{data.stats.sessionCount}</div>
              <div className={styles.trackStatSub}>{data.stats.uniqueDays} {data.stats.uniqueDays === 1 ? 'Tag' : 'Tage'}</div>
            </div>
            <div className={styles.trackStatCard}>
              <div className={styles.trackStatLabel}>Verweildauer gesamt</div>
              <div className={styles.trackStatValue}>{formatDuration(data.stats.totalActiveSeconds)}</div>
              <div className={styles.trackStatSub}>
                Ø {formatDuration(Math.round(data.stats.totalActiveSeconds / Math.max(1, data.stats.sessionCount)))} / Aufruf
              </div>
            </div>
            <div className={styles.trackStatCard}>
              <div className={styles.trackStatLabel}>Letzte Aktivität</div>
              <div className={styles.trackStatValueSmall}>{formatDate(data.stats.lastEventAt)}</div>
            </div>
          </div>

          {/* Status-Breakdown */}
          {Object.keys(data.statusBreakdown).length > 0 && (
            <div className={styles.trackBreakdown}>
              <div className={styles.trackBreakdownLabel}>Aufrufe nach Status zum Zeitpunkt des Öffnens:</div>
              <div className={styles.trackBreakdownItems}>
                {Object.entries(data.statusBreakdown).map(([status, count]) => (
                  <div key={status} className={styles.trackBreakdownPill}>
                    <span className={styles.trackBreakdownStatus}>{statusLabel(status)}</span>
                    <span className={styles.trackBreakdownCount}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session-Tabelle */}
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Datum</th>
                <th>Verweildauer</th>
                <th>Sections</th>
                <th>Events</th>
                <th>Status</th>
                <th>Geo / Device</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s) => (
                <tr key={s.id}>
                  <td>{formatDate(s.openedAt)}</td>
                  <td>{formatDuration(s.activeSeconds)}</td>
                  <td>{s.sectionsSeen}</td>
                  <td>{s.eventCount}</td>
                  <td>{statusLabel(s.targetStatus)}</td>
                  <td>
                    {formatGeo(s.country, s.region)}
                    {s.device && <span className={styles.muted}> · {s.device}</span>}
                  </td>
                  <td>
                    <button className={styles.linkBtn} onClick={() => openDetail(s.id)}>
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Detail-Drawer */}
      {detailView && (
        <div className={styles.modalOverlay} onClick={() => setDetailView(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Session-Details</h2>
              <button className={styles.modalClose} onClick={() => setDetailView(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.trackSessionMeta}>
                <div><strong>Geöffnet:</strong> {formatDate(detailView.openedAt)}</div>
                <div><strong>Letzte Aktivität:</strong> {formatDate(detailView.lastEventAt)}</div>
                <div><strong>Aktive Zeit:</strong> {formatDuration(detailView.activeSeconds)}</div>
                <div><strong>Status zum Zeitpunkt:</strong> {statusLabel(detailView.targetStatus)}</div>
                <div><strong>Geo:</strong> {formatGeo(detailView.country, detailView.region)}</div>
                <div><strong>Device:</strong> {detailView.device || '–'}</div>
                {detailView.referrer && <div><strong>Referrer:</strong> {detailView.referrer}</div>}
              </div>

              {detailLoading && <div className={styles.muted}>Lade Events…</div>}

              {detailView.events && detailView.events.length > 0 && (
                <table className={styles.tableCompact}>
                  <thead>
                    <tr>
                      <th>Zeit</th>
                      <th>Event</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailView.events.map((e) => (
                      <tr key={e.id}>
                        <td>{new Date(e.at).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                        <td>{e.type}</td>
                        <td className={styles.muted}>
                          {e.type === 'section_view' && (e.payload as { sectionId?: string })?.sectionId}
                          {e.type === 'link_click' && (
                            <>
                              {(e.payload as { label?: string })?.label}
                              {(e.payload as { href?: string })?.href && (
                                <span className={styles.muted}> → {(e.payload as { href?: string })?.href}</span>
                              )}
                            </>
                          )}
                          {e.type === 'video_progress' && `${(e.payload as { percent?: number })?.percent}% · ${(e.payload as { videoId?: string })?.videoId || ''}`}
                          {e.type === 'video_play' && `${(e.payload as { videoId?: string })?.videoId || ''}`}
                          {e.type === 'heartbeat' && `+${(e.payload as { activeSeconds?: number })?.activeSeconds || 0}s`}
                          {e.type === 'view_close' && `Gesamt: ${(e.payload as { totalActiveSeconds?: number })?.totalActiveSeconds || 0}s`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
