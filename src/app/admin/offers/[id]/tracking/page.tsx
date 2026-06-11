'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
    totalSectionsSeen: number
    totalEvents: number
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

// Minimal-SVG-Bar-Chart. Keine Library, damit der Bundle klein bleibt.
function BarChart({
  data,
  yFormat,
}: {
  data: { label: string; value: number; tooltip?: string }[]
  yFormat?: (v: number) => string
}) {
  if (data.length === 0) {
    return <div className={styles.muted}>Noch keine Daten</div>
  }
  const W = 400
  const H = 140
  const PAD_TOP = 8
  const PAD_BOTTOM = 18
  const PAD_LEFT = 4
  const max = Math.max(...data.map((d) => d.value), 1)
  const innerH = H - PAD_TOP - PAD_BOTTOM
  const slot = (W - PAD_LEFT) / data.length
  const barWidth = Math.min(slot * 0.75, 32)
  // Y-Achsen-Hilfslinien bei 0%, 50%, 100%
  const yLines = [0, 0.5, 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.chartSvg} role="img">
      {yLines.map((p, idx) => (
        <line
          key={idx}
          x1={PAD_LEFT}
          y1={PAD_TOP + innerH * (1 - p)}
          x2={W}
          y2={PAD_TOP + innerH * (1 - p)}
          stroke="#eee"
          strokeWidth={1}
        />
      ))}
      <text x={PAD_LEFT} y={PAD_TOP + 8} fontSize={9} fill="#999" fontFamily="'JetBrains Mono', monospace">
        {yFormat ? yFormat(max) : max}
      </text>
      {data.map((d, i) => {
        const h = (d.value / max) * innerH
        const x = PAD_LEFT + slot * i + (slot - barWidth) / 2
        const y = PAD_TOP + innerH - h
        return (
          <g key={i}>
            <title>{d.tooltip || `${d.label}: ${d.value}`}</title>
            <rect x={x} y={y} width={barWidth} height={Math.max(h, 1)} fill="#FF1900" rx={1.5} />
          </g>
        )
      })}
      {/* X-Achsen-Labels (max 8, sonst zu eng) */}
      {data.length <= 8 &&
        data.map((d, i) => {
          const x = PAD_LEFT + slot * i + slot / 2
          return (
            <text
              key={`l${i}`}
              x={x}
              y={H - 4}
              fontSize={9}
              fill="#888"
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
            >
              {d.label}
            </text>
          )
        })}
    </svg>
  )
}

// Klickbarer Spaltenheader. Zeigt einen Pfeil, wenn nach dieser Spalte sortiert wird.
function SortHeader({
  label,
  field,
  sortField,
  sortDir,
  onClick,
}: {
  label: string
  field: SortField
  sortField: SortField
  sortDir: SortDir
  onClick: (f: SortField) => void
}) {
  const active = sortField === field
  return (
    <th
      onClick={() => onClick(field)}
      className={styles.sortHeader}
      title={`Sortieren nach ${label}`}
    >
      {label}
      <span className={styles.sortIndicator}>
        {active ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ' '}
      </span>
    </th>
  )
}

function shortDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return s === 0 ? `${m}m` : `${m}m ${s}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function statusLabel(s: string | null) {
  if (!s) return '–'
  return STATUS_LABELS[s as OfferStatus] || s
}

type SortField = 'openedAt' | 'lastEventAt' | 'activeSeconds' | 'sectionsSeen' | 'eventCount' | 'targetStatus' | 'country'
type SortDir = 'asc' | 'desc'

export default function OfferTrackingPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<TrackingResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailView, setDetailView] = useState<DetailResponse['view'] | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [sortField, setSortField] = useState<SortField>('openedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Letzte Session = die zuletzt geöffnete (nach openedAt). Brauchen wir für
  // die "Letzte Aktivität"-Stat-Card und als Basis für sinnvolle Sub-Texte.
  const latestSession = useMemo(() => {
    if (!data || data.sessions.length === 0) return null
    return data.sessions.reduce((latest, s) =>
      !latest || new Date(s.openedAt) > new Date(latest.openedAt) ? s : latest,
      null as TrackingResponse['sessions'][number] | null
    )
  }, [data])

  // Client-seitige Sortierung der Tabelle nach Klick auf einen Header.
  const sortedSessions = useMemo(() => {
    if (!data) return []
    const arr = [...data.sessions]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      const va = a[sortField]
      const vb = b[sortField]
      // Strings (Datum als ISO, Status, Land): lexikografisch — bei ISO-Daten
      // ist das chronologisch korrekt.
      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb) * dir
      }
      const na = typeof va === 'number' ? va : 0
      const nb = typeof vb === 'number' ? vb : 0
      return (na - nb) * dir
    })
    return arr
  }, [data, sortField, sortDir])

  function clickSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

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
              <div className={styles.trackStatValueSmall}>
                {latestSession ? formatDate(latestSession.openedAt) : '–'}
              </div>
              <div className={styles.trackStatSub}>
                {latestSession
                  ? `${latestSession.sectionsSeen} Sections · ${latestSession.eventCount} Events`
                  : ''}
              </div>
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

          {/* Diagramme */}
          {(() => {
            // Zugriffe pro Tag (chronologisch)
            const byDay = new Map<string, number>()
            for (const s of data.sessions) {
              const day = new Date(s.openedAt).toISOString().slice(0, 10)
              byDay.set(day, (byDay.get(day) || 0) + 1)
            }
            const perDay = Array.from(byDay.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([day, count]) => {
                const d = new Date(day)
                const lbl = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`
                return {
                  label: lbl,
                  value: count,
                  tooltip: `${day}: ${count} ${count === 1 ? 'Aufruf' : 'Aufrufe'}`,
                }
              })
            // Verweildauer und Sections pro Zugriff (chronologisch, älteste zuerst)
            const chrono = [...data.sessions].reverse()
            const durations = chrono.map((s, i) => ({
              label: `#${i + 1}`,
              value: s.activeSeconds,
              tooltip: `${formatDate(s.openedAt)}: ${shortDuration(s.activeSeconds)}`,
            }))
            const sectionsArr = chrono.map((s, i) => ({
              label: `#${i + 1}`,
              value: s.sectionsSeen,
              tooltip: `${formatDate(s.openedAt)}: ${s.sectionsSeen} Sections`,
            }))
            return (
              <div className={styles.chartGrid}>
                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>Zugriffe pro Tag</div>
                  <BarChart data={perDay} />
                </div>
                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>Verweildauer pro Zugriff</div>
                  <BarChart data={durations} yFormat={shortDuration} />
                </div>
                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>Sections pro Zugriff</div>
                  <BarChart data={sectionsArr} />
                </div>
              </div>
            )
          })()}

          {/* Session-Tabelle */}
          <table className={styles.table}>
            <thead>
              <tr>
                <SortHeader label="Geöffnet" field="openedAt" sortField={sortField} sortDir={sortDir} onClick={clickSort} />
                <SortHeader label="Letzte Aktivität" field="lastEventAt" sortField={sortField} sortDir={sortDir} onClick={clickSort} />
                <SortHeader label="Verweildauer" field="activeSeconds" sortField={sortField} sortDir={sortDir} onClick={clickSort} />
                <SortHeader label="Sections" field="sectionsSeen" sortField={sortField} sortDir={sortDir} onClick={clickSort} />
                <SortHeader label="Events" field="eventCount" sortField={sortField} sortDir={sortDir} onClick={clickSort} />
                <SortHeader label="Status" field="targetStatus" sortField={sortField} sortDir={sortDir} onClick={clickSort} />
                <SortHeader label="Geo / Device" field="country" sortField={sortField} sortDir={sortDir} onClick={clickSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedSessions.map((s) => (
                <tr key={s.id}>
                  <td>{formatDate(s.openedAt)}</td>
                  <td>{formatDate(s.lastEventAt)}</td>
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
