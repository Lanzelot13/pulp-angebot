'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminShell } from '../AdminShell'
import { IconEye, IconEdit, IconLink, IconCheck, IconExternalLink } from '../Icons'
import styles from '../admin.module.css'

interface OfferRow {
  id: string
  slug: string
  clientCompany: string
  projectName: string
  offerNumber: string | null
  status: string
  version: number
  editToken: string
  createdAt: string
  contact: { name: string }
  _count: { versions: number }
}

interface VersionRow {
  id: string
  version: number
  changedBy: string
  createdAt: string
}

export default function OffersPage() {
  const [offers, setOffers] = useState<OfferRow[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [versions, setVersions] = useState<Record<string, VersionRow[]>>({})
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/offers')
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { if (Array.isArray(d)) setOffers(d) })
      .catch(() => {})
  }, [])

  const toggleVersions = useCallback(
    async (offerId: string) => {
      if (expandedId === offerId) {
        setExpandedId(null)
        return
      }
      setExpandedId(offerId)
      if (!versions[offerId]) {
        const res = await fetch(`/api/admin/offers/${offerId}/versions`)
        if (res.ok) {
          const data = await res.json()
          setVersions((v) => ({ ...v, [offerId]: Array.isArray(data) ? data : [] }))
        }
      }
    },
    [expandedId, versions]
  )

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/o/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const statusClass = (s: string) => {
    if (s === 'DRAFT') return styles.statusDraft
    if (s === 'PRICED') return styles.statusPriced
    if (s === 'ACCEPTED') return styles.statusAccepted
    return ''
  }

  return (
    <AdminShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Angebote</h1>
        <div className={styles.pageSub}>Alle erstellten Angebotsseiten mit Versionen</div>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Kunde / Projekt</th>
              <th>Angebotsnr.</th>
              <th>Status</th>
              <th>Version</th>
              <th>Kontakt</th>
              <th>Erstellt</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <>
                <tr
                  key={o.id}
                  className={styles.offerRow}
                  onClick={() => toggleVersions(o.id)}
                >
                  <td>
                    <span className={`${styles.expandIcon} ${expandedId === o.id ? styles.expandIconOpen : ''}`}>
                      ▶
                    </span>
                  </td>
                  <td>
                    <strong>{o.clientCompany}</strong>
                    <br />
                    <span style={{ fontSize: 13, color: '#888' }}>{o.projectName}</span>
                  </td>
                  <td>{o.offerNumber || '–'}</td>
                  <td>
                    <span className={`${styles.statusPill} ${statusClass(o.status)}`}>
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <span className={styles.versionBadge}>v{o.version}</span>
                  </td>
                  <td>{o.contact.name}</td>
                  <td>{formatDate(o.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
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
                {expandedId === o.id && (
                  <tr key={`${o.id}-versions`}>
                    <td colSpan={8} style={{ padding: 0 }}>
                      <div className={styles.versionsPanel}>
                        <h4>Versionshistorie</h4>
                        {versions[o.id]?.length === 0 && (
                          <div style={{ color: '#888', fontSize: 13 }}>Keine früheren Versionen</div>
                        )}
                        {!versions[o.id] && (
                          <div style={{ color: '#888', fontSize: 13 }}>Laden...</div>
                        )}
                        {versions[o.id]?.map((v, i) => (
                          <a
                            key={v.id}
                            href={`/o/${o.slug}?version=${v.version}`}
                            target="_blank"
                            className={styles.versionItem}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            <span className={`${styles.versionDot} ${i === 0 ? styles.versionDotCurrent : ''}`} />
                            <span>v{v.version}</span>
                            <span className={styles.versionMeta}>
                              {v.changedBy} · {formatDateTime(v.createdAt)}
                            </span>
                            <span style={{ marginLeft: 'auto', color: '#FF1900', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              Öffnen <IconExternalLink size={11} color="#FF1900" />
                            </span>
                          </a>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {offers.length === 0 && (
              <tr>
                <td colSpan={8} className={styles.emptyState}>
                  <div className={styles.emptyText}>Noch keine Angebote erstellt</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  )
}
