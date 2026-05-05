'use client'

import { useEffect, useState } from 'react'
import { AdminShell } from './AdminShell'
import styles from './admin.module.css'

interface Stats {
  offers: { total: number; DRAFT?: number; PRICED?: number; ACCEPTED?: number }
  contacts: number
  references: number
  channels: number
}

interface OfferRow {
  id: string
  clientCompany: string
  projectName: string
  offerNumber: string | null
  status: string
  version: number
  createdAt: string
  contact: { name: string }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentOffers, setRecentOffers] = useState<OfferRow[]>([])

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setStats(d) })
      .catch(() => {})
    fetch('/api/admin/offers')
      .then(r => r.ok ? r.json() : [])
      .then((data: OfferRow[]) => setRecentOffers(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => {})
  }, [])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const statusClass = (s: string) => {
    if (s === 'DRAFT') return styles.statusDraft
    if (s === 'PRICED') return styles.statusPriced
    if (s === 'ACCEPTED') return styles.statusAccepted
    return ''
  }

  return (
    <AdminShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <div className={styles.pageSub}>
          📅 {new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div>
            <div className={styles.statLabel}>Angebote</div>
            <div className={styles.statNumber}>{stats?.offers.total ?? '–'}</div>
            <div className={styles.statDetail}>
              {stats ? `${stats.offers.DRAFT || 0} Draft · ${stats.offers.PRICED || 0} Priced · ${stats.offers.ACCEPTED || 0} Accepted` : '...'}
            </div>
          </div>
          <div className={`${styles.statIcon} ${styles.iconRed}`}>📄</div>
        </div>
        <div className={styles.statCard}>
          <div>
            <div className={styles.statLabel}>Ansprechpersonen</div>
            <div className={styles.statNumber}>{stats?.contacts ?? '–'}</div>
            <div className={styles.statDetail}>Pulpies</div>
          </div>
          <div className={`${styles.statIcon} ${styles.iconBlue}`}>👤</div>
        </div>
        <div className={styles.statCard}>
          <div>
            <div className={styles.statLabel}>Referenzen</div>
            <div className={styles.statNumber}>{stats?.references ?? '–'}</div>
            <div className={styles.statDetail}>Projekte</div>
          </div>
          <div className={`${styles.statIcon} ${styles.iconGreen}`}>🏢</div>
        </div>
        <div className={styles.statCard}>
          <div>
            <div className={styles.statLabel}>Kanäle</div>
            <div className={styles.statNumber}>{stats?.channels ?? '–'}</div>
            <div className={styles.statDetail}>Social Media</div>
          </div>
          <div className={`${styles.statIcon} ${styles.iconPurple}`}>📱</div>
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>📝 Schnellzugriff</div>
      </div>
      <div className={styles.quickGrid}>
        <a href="/admin/offers" className={styles.quickCard}>
          <div className={styles.quickIcon}>📄</div>
          <div className={styles.quickLabel}>
            <strong>Alle Angebote</strong>
            <small>Übersicht aller Angebote</small>
          </div>
        </a>
        <a href="/admin/contacts" className={styles.quickCard}>
          <div className={styles.quickIcon}>👤</div>
          <div className={styles.quickLabel}>
            <strong>Ansprechpersonen</strong>
            <small>Kontakte verwalten</small>
          </div>
        </a>
        <a href="/admin/references" className={styles.quickCard}>
          <div className={styles.quickIcon}>🏢</div>
          <div className={styles.quickLabel}>
            <strong>Referenzen</strong>
            <small>Kundenprojekte verwalten</small>
          </div>
        </a>
        <a href="/admin/channels" className={styles.quickCard}>
          <div className={styles.quickIcon}>📱</div>
          <div className={styles.quickLabel}>
            <strong>Kanäle</strong>
            <small>Social Media Kanäle</small>
          </div>
        </a>
      </div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>🕐 Letzte Angebote</div>
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
            </tr>
          </thead>
          <tbody>
            {recentOffers.map((o) => (
              <tr key={o.id}>
                <td><strong>{o.clientCompany}</strong></td>
                <td>{o.projectName}</td>
                <td><span className={`${styles.statusPill} ${statusClass(o.status)}`}>{o.status}</span></td>
                <td>{formatDate(o.createdAt)}</td>
              </tr>
            ))}
            {recentOffers.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#888', padding: 40 }}>
                  Noch keine Angebote erstellt
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  )
}
