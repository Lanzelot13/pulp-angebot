'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminShell } from './AdminShell'
import { IconFileText, IconUser, IconBuilding, IconShare2, IconEye, IconEdit, IconLink, IconCheck } from './Icons'
import styles from './admin.module.css'
import { STATUS_LABELS, STATUS_OPTIONS, type OfferStatus } from '@/lib/types'
import { formatGeo } from '@/lib/geo'

interface Stats {
  offers: { total: number; DRAFT?: number; PRICED?: number; ACCEPTED?: number; DECLINED?: number }
  contacts: number
  references: number
  channels: number
}

interface OfferRow {
  id: string
  slug: string
  clientCompany: string
  projectName: string
  offerNumber: string | null
  status: string
  version: number
  createdAt: string
  editToken: string
  contact: { name: string }
}

interface RecentView {
  id: string
  openedAt: string
  activeSeconds: number
  targetStatus: string | null
  country: string | null
  region: string | null
  device: string | null
  eventCount: number
  sectionsSeen: number
  offer: {
    id: string
    slug: string
    projectName: string
    clientCompany: string
    status: string
  } | null
}

function formatDuration(totalSec: number) {
  if (!totalSec) return '0s'
  if (totalSec < 60) return `${totalSec}s`
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return `${h}h ${rest}m`
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentOffers, setRecentOffers] = useState<OfferRow[]>([])
  const [recentViews, setRecentViews] = useState<RecentView[]>([])
  const [viewsLoading, setViewsLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/o/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d) })
      .catch(() => {})
    fetch('/api/admin/offers')
      .then(r => r.ok ? r.json() : [])
      .then((data: OfferRow[]) => setRecentOffers(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => {})
    fetch('/api/admin/tracking/recent?limit=10')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.views) setRecentViews(d.views) })
      .catch(() => {})
      .finally(() => setViewsLoading(false))
  }, [])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const statusClass = (s: string) => {
    if (s === 'DRAFT') return styles.statusDraft
    if (s === 'PRICED') return styles.statusPriced
    if (s === 'ACCEPTED') return styles.statusAccepted
    if (s === 'DECLINED') return styles.statusDeclined
    return ''
  }
  const statusDotColor = (s: OfferStatus) => {
    if (s === 'DRAFT') return '#ff9800'
    if (s === 'PRICED') return '#4caf50'
    if (s === 'ACCEPTED') return '#2196f3'
    if (s === 'DECLINED') return '#e53935'
    return '#888'
  }

  return (
    <AdminShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <div className={styles.pageSub}>
          {new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div>
            <div className={styles.statLabel}>Angebote (aktiv)</div>
            <div className={styles.statNumber}>{stats?.offers.total ?? '–'}</div>
            <div className={styles.statDetail}>über alle Status</div>
          </div>
          <div className={`${styles.statIcon} ${styles.iconRed}`}><IconFileText size={24} /></div>
        </div>
        <div className={styles.statCard}>
          <div>
            <div className={styles.statLabel}>Ansprechpersonen</div>
            <div className={styles.statNumber}>{stats?.contacts ?? '–'}</div>
            <div className={styles.statDetail}>Pulpies</div>
          </div>
          <div className={`${styles.statIcon} ${styles.iconBlue}`}><IconUser size={24} /></div>
        </div>
        <div className={styles.statCard}>
          <div>
            <div className={styles.statLabel}>Referenzen</div>
            <div className={styles.statNumber}>{stats?.references ?? '–'}</div>
            <div className={styles.statDetail}>Projekte</div>
          </div>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}><IconBuilding size={24} /></div>
        </div>
        <div className={styles.statCard}>
          <div>
            <div className={styles.statLabel}>Kanäle</div>
            <div className={styles.statNumber}>{stats?.channels ?? '–'}</div>
            <div className={styles.statDetail}>Social Media</div>
          </div>
          <div className={`${styles.statIcon} ${styles.iconPurple}`}><IconShare2 size={24} /></div>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>Status-Verteilung</div>
      </div>
      <div className={styles.statusBreakdown}>
        {STATUS_OPTIONS.map((s) => {
          const count = (stats?.offers?.[s] as number | undefined) ?? 0
          return (
            <a
              key={s}
              href={`/admin/offers?status=${s}`}
              className={styles.statusBreakdownCard}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className={styles.statusBreakdownLabel}>
                <span
                  className={styles.statusBreakdownDot}
                  style={{ background: statusDotColor(s), marginRight: 6 }}
                />
                {STATUS_LABELS[s]}
              </div>
              <div className={styles.statusBreakdownNumber}>{stats ? count : '–'}</div>
            </a>
          )
        })}
      </div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>Letzte Angebote</div>
        <a href="/admin/offers" className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}>
          Alle anzeigen →
        </a>
      </div>
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Kunde</th>
              <th>Projekt</th>
              <th>Status</th>
              <th>Erstellt</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {recentOffers.map((o) => (
              <tr key={o.id}>
                <td><strong>{o.clientCompany}</strong></td>
                <td>{o.projectName}</td>
                <td>
                  <span className={`${styles.statusPill} ${statusClass(o.status)}`}>
                    {STATUS_LABELS[o.status as OfferStatus] || o.status}
                  </span>
                </td>
                <td>{formatDate(o.createdAt)}</td>
                <td>
                  <div className={styles.actions}>
                    <a
                      href={`/o/${o.slug}`}
                      target="_blank"
                      className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                      title="Kundenansicht"
                    >
                      <IconEye size={14} />
                    </a>
                    <a
                      href={`/o/${o.slug}?edit=${o.editToken}`}
                      target="_blank"
                      className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                      title="Editor öffnen"
                    >
                      <IconEdit size={14} />
                    </a>
                    <button
                      className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                      onClick={() => copyLink(o.slug)}
                      title="Kunden-Link kopieren"
                    >
                      {copied === o.slug ? <IconCheck size={14} color="#22c55e" /> : <IconLink size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {recentOffers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 40 }}>
                  Noch keine Angebote erstellt
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>Letzte Aufrufe</div>
      </div>
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Wann</th>
              <th>Angebot</th>
              <th>Verweildauer</th>
              <th>Sections</th>
              <th>Events</th>
              <th>Geo / Device</th>
            </tr>
          </thead>
          <tbody>
            {recentViews.map((v) => {
              const clickable = !!v.offer
              return (
                <tr
                  key={v.id}
                  className={clickable ? styles.clickableRow : undefined}
                  onClick={() => {
                    if (clickable && v.offer) {
                      router.push(`/admin/offers/${v.offer.id}/tracking`)
                    }
                  }}
                >
                  <td>{new Date(v.openedAt).toLocaleString('de-AT', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}</td>
                  <td>
                    {v.offer ? (
                      <>
                        <strong>{v.offer.clientCompany}</strong>
                        <br />
                        <span style={{ fontSize: 12, color: '#888' }}>{v.offer.projectName}</span>
                      </>
                    ) : (
                      <span style={{ color: '#888' }}>Angebot gelöscht</span>
                    )}
                  </td>
                  <td>{formatDuration(v.activeSeconds)}</td>
                  <td>{v.sectionsSeen}</td>
                  <td>{v.eventCount}</td>
                  <td>
                    {formatGeo(v.country, v.region)}
                    {v.device && <span style={{ color: '#888' }}> · {v.device}</span>}
                  </td>
                </tr>
              )
            })}
            {recentViews.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 40 }}>
                  {viewsLoading ? 'Aufrufe werden geladen…' : 'Noch keine Aufrufe registriert'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  )
}
