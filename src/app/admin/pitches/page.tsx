'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { AdminShell } from '../AdminShell'
import {
  IconEye,
  IconEdit,
  IconLink,
  IconCheck,
  IconArchive,
  IconArchiveRestore,
  IconPlus,
  IconClock,
  IconExternalLink,
} from '../Icons'
import styles from '../admin.module.css'

interface PitchRow {
  id: string
  slug: string
  status: 'DRAFT' | 'SENT' | 'ARCHIVED'
  clientCompany: string
  occasion: string | null
  contactSlug: string
  contact: { name: string; slug: string }
  editToken: string
  modules: unknown[]
  version?: number
  viewCount?: number
  lastViewAt?: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

interface VersionRow {
  id: number
  version: number
  changedBy: string
  createdAt: string
}

interface ContactOption {
  slug: string
  name: string
  role: string
}

type Filter = 'active' | 'archived'

const STATUS_LABELS: Record<PitchRow['status'], string> = {
  DRAFT: 'Entwurf',
  SENT: 'Versendet',
  ARCHIVED: 'Archiv',
}

export default function PitchesPage() {
  const [pitches, setPitches] = useState<PitchRow[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [filter, setFilter] = useState<Filter>('active')
  const [copied, setCopied] = useState<string | null>(null)

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    clientCompany: '',
    occasion: 'Erstgespräch',
    contactSlug: '',
  })
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Confirm dialog (archive/restore/delete/version-restore)
  const [confirm, setConfirm] = useState<{
    title: string
    text: string
    busy: boolean
    action: () => Promise<void>
  } | null>(null)

  // Versions-Panel: pro Pitch-ID die Liste aller historischen Versionen
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [versions, setVersions] = useState<Record<string, VersionRow[]>>({})

  const toggleExpand = useCallback(
    async (pitchId: string) => {
      if (expandedId === pitchId) {
        setExpandedId(null)
        return
      }
      setExpandedId(pitchId)
      if (!versions[pitchId]) {
        const res = await fetch(`/api/admin/pitches/${pitchId}/versions`)
        if (res.ok) {
          const data: VersionRow[] = await res.json()
          setVersions((prev) => ({ ...prev, [pitchId]: data }))
        } else {
          setVersions((prev) => ({ ...prev, [pitchId]: [] }))
        }
      }
    },
    [expandedId, versions]
  )

  const askRestoreVersion = (p: PitchRow, versionNum: number) => {
    setConfirm({
      title: `Version ${versionNum} wiederherstellen?`,
      text: `Der aktuelle Stand wird als Snapshot in die Historie aufgenommen und durch v${versionNum} ersetzt. Du kannst diesen Schritt jederzeit rückgängig machen, indem du wieder die alte Version aus der Liste wählst.`,
      busy: false,
      action: async () => {
        setConfirm((c) => (c ? { ...c, busy: true } : c))
        const res = await fetch(
          `/api/admin/pitches/${p.id}/versions/${versionNum}/restore`,
          { method: 'POST' }
        )
        if (res.ok) {
          // Versionen für diesen Pitch frisch laden
          const vRes = await fetch(`/api/admin/pitches/${p.id}/versions`)
          if (vRes.ok) {
            const data: VersionRow[] = await vRes.json()
            setVersions((prev) => ({ ...prev, [p.id]: data }))
          }
          await load(filter)
        }
        setConfirm(null)
      },
    })
  }

  const formatDateTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatShortDateTime = (iso: string) =>
    new Date(iso).toLocaleString('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

  const load = useCallback(async (f: Filter) => {
    const res = await fetch(
      `/api/admin/pitches?archived=${f === 'archived' ? 'true' : 'false'}`
    )
    if (res.ok) {
      const d = await res.json()
      if (Array.isArray(d)) setPitches(d)
    }
  }, [])

  useEffect(() => {
    load(filter)
  }, [filter, load])

  useEffect(() => {
    fetch('/api/admin/contacts')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (Array.isArray(d)) {
          setContacts(d)
          setCreateForm((f) => ({
            ...f,
            contactSlug: f.contactSlug || d[0]?.slug || '',
          }))
        }
      })
      .catch(() => {})
  }, [])

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleCreate = async () => {
    if (!createForm.clientCompany.trim()) {
      setCreateError('Bitte gib den Kundenfirma-Namen ein')
      return
    }
    if (!createForm.contactSlug) {
      setCreateError('Bitte wähle einen Pulpmedia-Kontakt')
      return
    }
    setCreating(true)
    setCreateError(null)
    const res = await fetch('/api/admin/pitches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientCompany: createForm.clientCompany.trim(),
        occasion: createForm.occasion.trim() || null,
        contactSlug: createForm.contactSlug,
      }),
    })
    setCreating(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setCreateError(d.error || 'Anlegen fehlgeschlagen')
      return
    }
    const created = await res.json()
    setCreateOpen(false)
    setCreateForm({ clientCompany: '', occasion: 'Erstgespräch', contactSlug: contacts[0]?.slug || '' })
    // Jump straight into the edit page so the user can start composing
    window.location.href = `/admin/pitches/${created.id}`
  }

  const askArchive = (p: PitchRow) => {
    setConfirm({
      title: 'Pitch archivieren?',
      text: `"${p.clientCompany}" wird ins Archiv verschoben. Die Kunden-URL ist danach nicht mehr erreichbar.`,
      busy: false,
      action: async () => {
        const res = await fetch(`/api/admin/pitches/${p.id}/archive`, {
          method: 'POST',
        })
        if (res.ok) {
          await load(filter)
          setConfirm(null)
        }
      },
    })
  }

  const askRestore = (p: PitchRow) => {
    setConfirm({
      title: 'Pitch wiederherstellen?',
      text: `"${p.clientCompany}" wird aus dem Archiv zurückgeholt.`,
      busy: false,
      action: async () => {
        const res = await fetch(`/api/admin/pitches/${p.id}/restore`, {
          method: 'POST',
        })
        if (res.ok) {
          await load(filter)
          setConfirm(null)
        }
      },
    })
  }

  const askDelete = (p: PitchRow) => {
    setConfirm({
      title: 'Pitch endgültig löschen?',
      text: `"${p.clientCompany}" wird unwiderruflich gelöscht. Die Modul-Snapshots gehen verloren.`,
      busy: false,
      action: async () => {
        const res = await fetch(`/api/admin/pitches/${p.id}`, { method: 'DELETE' })
        if (res.ok) {
          await load(filter)
          setConfirm(null)
        }
      },
    })
  }

  const runConfirm = async () => {
    if (!confirm) return
    setConfirm({ ...confirm, busy: true })
    await confirm.action()
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  const isArchived = filter === 'archived'

  return (
    <AdminShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Pitches</h1>
        <div className={styles.pageSub}>
          Agenturpräsentationen für Erstgespräche. Pro Termin zusammengestellt
          aus globalen Modulen plus optionalen Custom-Blöcken.
        </div>
      </div>

      <div className={styles.filterBar}>
        <button
          className={`${styles.filterTab} ${filter === 'active' ? styles.filterTabActive : ''}`}
          onClick={() => setFilter('active')}
        >
          Aktiv
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'archived' ? styles.filterTabActive : ''}`}
          onClick={() => setFilter('archived')}
        >
          Archiv
        </button>
      </div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          {isArchived ? 'Archivierte Pitches' : 'Alle Pitches'}
        </div>
        {!isArchived && (
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setCreateOpen(true)}
          >
            <IconPlus size={14} /> Neue Pitch
          </button>
        )}
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Kunde / Anlass</th>
              <th>Status</th>
              <th>Module</th>
              <th>Aufrufe</th>
              <th>Kontakt</th>
              <th>Erstellt</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {pitches.map((p) => (
              <Fragment key={p.id}>
              <tr className={p.archivedAt ? styles.archivedRow : ''}>
                <td>
                  <strong>{p.clientCompany}</strong>
                  {p.archivedAt && (
                    <span className={styles.archivedBadge}>Archiv</span>
                  )}
                  <br />
                  <span style={{ fontSize: 13, color: '#888' }}>
                    {p.occasion || 'Pitch'}
                  </span>
                </td>
                <td>
                  <span className={styles.tag}>{STATUS_LABELS[p.status]}</span>
                </td>
                <td>{Array.isArray(p.modules) ? p.modules.length : 0}</td>
                <td className={styles.viewCountCell}>
                  {p.viewCount && p.viewCount > 0 ? (
                    <a
                      href={`/admin/pitches/${p.id}/tracking`}
                      className={styles.viewCountLink}
                      title="Tracking ansehen"
                    >
                      {p.viewCount}
                    </a>
                  ) : (
                    <span className={styles.viewCountZero}>0</span>
                  )}
                  {p.lastViewAt && (
                    <div className={styles.viewCountLast}>{formatShortDateTime(p.lastViewAt)}</div>
                  )}
                </td>
                <td>{p.contact?.name || p.contactSlug}</td>
                <td>{formatDate(p.createdAt)}</td>
                <td>
                  <div className={styles.actions}>
                    <a
                      href={`/p/${p.slug}`}
                      target="_blank"
                      rel="noopener"
                      className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                      title="Kundenansicht"
                    >
                      <IconEye size={14} />
                    </a>
                    <a
                      href={`/admin/pitches/${p.id}`}
                      className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                      title="Bearbeiten"
                    >
                      <IconEdit size={14} />
                    </a>
                    <button
                      className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                      onClick={() => toggleExpand(p.id)}
                      title="Versionshistorie"
                    >
                      <IconClock size={14} />
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                      onClick={() => copyLink(p.slug)}
                      title="Kunden-Link kopieren"
                    >
                      {copied === p.slug ? (
                        <IconCheck size={14} color="#22c55e" />
                      ) : (
                        <IconLink size={14} />
                      )}
                    </button>
                    {p.archivedAt ? (
                      <button
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                        onClick={() => askRestore(p)}
                        title="Wiederherstellen"
                      >
                        <IconArchiveRestore size={14} />
                      </button>
                    ) : (
                      <button
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall} ${styles.btnDanger}`}
                        onClick={() => askArchive(p)}
                        title="Archivieren"
                      >
                        <IconArchive size={14} />
                      </button>
                    )}
                    {p.archivedAt && (
                      <button
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall} ${styles.btnDanger}`}
                        onClick={() => askDelete(p)}
                        title="Endgültig löschen"
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              {expandedId === p.id && (
                <tr>
                  <td colSpan={7} style={{ padding: 0 }}>
                    <div className={styles.versionsPanel || ''} style={{ padding: '16px 22px', background: '#fafafa', borderTop: '1px solid #eee' }}>
                      <h4 style={{ fontSize: 13, margin: '0 0 12px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Versionshistorie</h4>
                      {!versions[p.id] && (
                        <div style={{ color: '#888', fontSize: 13 }}>Laden...</div>
                      )}
                      {versions[p.id]?.length === 0 && (
                        <div style={{ color: '#888', fontSize: 13 }}>
                          Noch keine früheren Versionen. Sobald du diese Pitch editierst, wird der vorherige Stand hier gespeichert.
                        </div>
                      )}
                      {versions[p.id]?.map((v, i) => (
                        <div
                          key={v.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '8px 0',
                            borderTop: i > 0 ? '1px solid #eee' : 'none',
                            fontSize: 13,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: '#ccc',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontWeight: 600, color: '#333' }}>v{v.version}</span>
                          <span style={{ color: '#888' }}>
                            {v.changedBy} · {formatDateTime(v.createdAt)}
                          </span>
                          <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 12, alignItems: 'center' }}>
                            <button
                              onClick={() => askRestoreVersion(p, v.version)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#888',
                                fontSize: 12,
                                cursor: 'pointer',
                                padding: 0,
                              }}
                              title="Diese Version als neue aktuelle Version wiederherstellen"
                            >
                              ↺ Wiederherstellen
                            </button>
                            <a
                              href={`/p/${p.slug}?version=${v.version}`}
                              target="_blank"
                              rel="noopener"
                              style={{
                                color: '#FF1900',
                                fontSize: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                textDecoration: 'none',
                              }}
                            >
                              Ansehen <IconExternalLink size={11} color="#FF1900" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
            {pitches.length === 0 && (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  <div className={styles.emptyText}>
                    {isArchived
                      ? 'Keine archivierten Pitches'
                      : 'Noch keine Pitches. Leg deine erste an.'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <div className={styles.modalOverlay} onClick={() => !creating && setCreateOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Neue Pitch anlegen</h2>
              <button
                className={styles.modalClose}
                onClick={() => setCreateOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              {createError && (
                <div className={styles.formError}>{createError}</div>
              )}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Kundenfirma</label>
                <input
                  className={styles.formInput}
                  value={createForm.clientCompany}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      clientCompany: e.target.value,
                    }))
                  }
                  placeholder="z.B. Fronius International GmbH"
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Anlass</label>
                <input
                  className={styles.formInput}
                  value={createForm.occasion}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, occasion: e.target.value }))
                  }
                  placeholder="z.B. Erstgespräch, Pitch, Reminder"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Pulpmedia-Kontakt</label>
                <select
                  className={styles.formInput}
                  value={createForm.contactSlug}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      contactSlug: e.target.value,
                    }))
                  }
                >
                  {contacts.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                      {c.role ? ` — ${c.role}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? 'Lege an …' : 'Anlegen & bearbeiten'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div
          className={styles.confirmOverlay}
          onClick={() => !confirm.busy && setConfirm(null)}
        >
          <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
            <h3>{confirm.title}</h3>
            <p>{confirm.text}</p>
            <div className={styles.confirmActions}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setConfirm(null)}
                disabled={confirm.busy}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={runConfirm}
                disabled={confirm.busy}
              >
                {confirm.busy ? 'Bitte warten …' : 'Bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
