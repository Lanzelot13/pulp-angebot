'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { AdminShell } from '../AdminShell'
import {
  IconEye,
  IconEdit,
  IconLink,
  IconCheck,
  IconExternalLink,
  IconSettings,
  IconArchive,
  IconArchiveRestore,
} from '../Icons'
import styles from '../admin.module.css'

interface OfferRow {
  id: string
  slug: string
  clientName: string
  clientCompany: string
  projectName: string
  offerNumber: string | null
  status: 'DRAFT' | 'PRICED' | 'ACCEPTED'
  template: 'TEMPLATE1' | 'TEMPLATE2'
  version: number
  editToken: string
  contactSlug: string
  validUntil: string | null
  archivedAt: string | null
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

interface ContactOption {
  slug: string
  name: string
  role: string
}

type Filter = 'active' | 'archived'

interface MetaForm {
  clientName: string
  clientCompany: string
  projectName: string
  offerNumber: string
  template: 'TEMPLATE1' | 'TEMPLATE2'
  status: 'DRAFT' | 'PRICED' | 'ACCEPTED'
  contactSlug: string
  validUntil: string
  slug: string
}

function toDateInput(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function offerToForm(o: OfferRow): MetaForm {
  return {
    clientName: o.clientName,
    clientCompany: o.clientCompany,
    projectName: o.projectName,
    offerNumber: o.offerNumber || '',
    template: o.template || 'TEMPLATE2',
    status: o.status,
    contactSlug: o.contactSlug,
    validUntil: toDateInput(o.validUntil),
    slug: o.slug,
  }
}

export default function OffersPage() {
  const [offers, setOffers] = useState<OfferRow[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [filter, setFilter] = useState<Filter>('active')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [versions, setVersions] = useState<Record<string, VersionRow[]>>({})
  const [copied, setCopied] = useState<string | null>(null)

  // Modal state
  const [editingOffer, setEditingOffer] = useState<OfferRow | null>(null)
  const [form, setForm] = useState<MetaForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Confirm dialog state (archive / restore)
  const [confirm, setConfirm] = useState<{
    title: string
    text: string
    action: () => Promise<void>
    busy: boolean
  } | null>(null)

  const loadOffers = useCallback(async (f: Filter) => {
    const res = await fetch(`/api/admin/offers?archived=${f === 'archived' ? 'true' : 'false'}`)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) setOffers(data)
    }
  }, [])

  useEffect(() => {
    loadOffers(filter)
  }, [filter, loadOffers])

  useEffect(() => {
    fetch('/api/admin/contacts')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (Array.isArray(d)) setContacts(d)
      })
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

  const changeTemplate = async (offerId: string, template: 'TEMPLATE1' | 'TEMPLATE2') => {
    const res = await fetch(`/api/admin/offers/${offerId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template }),
    })
    if (res.ok) {
      setOffers((prev) => prev.map((o) => (o.id === offerId ? { ...o, template } : o)))
    }
  }

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/o/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  const openEdit = (o: OfferRow) => {
    setEditingOffer(o)
    setForm(offerToForm(o))
    setFormError(null)
  }

  const closeEdit = () => {
    setEditingOffer(null)
    setForm(null)
    setFormError(null)
  }

  const setField = <K extends keyof MetaForm>(key: K, value: MetaForm[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }

  const handleSave = async () => {
    if (!editingOffer || !form) return
    setSaving(true)
    setFormError(null)

    // Only send fields that actually changed
    const original = offerToForm(editingOffer)
    const payload: Record<string, unknown> = {}
    ;(Object.keys(form) as (keyof MetaForm)[]).forEach((k) => {
      if (form[k] !== original[k]) payload[k] = form[k]
    })
    // Normalize empty offerNumber and validUntil to null
    if (payload.offerNumber === '') payload.offerNumber = null
    if (payload.validUntil === '') payload.validUntil = null

    if (Object.keys(payload).length === 0) {
      closeEdit()
      setSaving(false)
      return
    }

    try {
      const res = await fetch(`/api/admin/offers/${editingOffer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFormError(data.error || 'Speichern fehlgeschlagen')
        setSaving(false)
        return
      }
      await loadOffers(filter)
      closeEdit()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  const askArchive = (o: OfferRow) => {
    setConfirm({
      title: 'Angebot archivieren?',
      text: `"${o.projectName}" für ${o.clientCompany} wird ins Archiv verschoben. Die Kunden-URL ist danach nicht mehr erreichbar. Wiederherstellen ist jederzeit möglich.`,
      busy: false,
      action: async () => {
        const res = await fetch(`/api/admin/offers/${o.id}/archive`, { method: 'POST' })
        if (res.ok) {
          await loadOffers(filter)
          setConfirm(null)
        } else {
          setConfirm((c) => (c ? { ...c, busy: false } : c))
        }
      },
    })
  }

  const askRestore = (o: OfferRow) => {
    setConfirm({
      title: 'Angebot wiederherstellen?',
      text: `"${o.projectName}" für ${o.clientCompany} wird aus dem Archiv zurückgeholt. Die Kunden-URL ist danach wieder erreichbar.`,
      busy: false,
      action: async () => {
        const res = await fetch(`/api/admin/offers/${o.id}/restore`, { method: 'POST' })
        if (res.ok) {
          await loadOffers(filter)
          setConfirm(null)
        } else {
          setConfirm((c) => (c ? { ...c, busy: false } : c))
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
    new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const statusClass = (s: string) => {
    if (s === 'DRAFT') return styles.statusDraft
    if (s === 'PRICED') return styles.statusPriced
    if (s === 'ACCEPTED') return styles.statusAccepted
    return ''
  }

  const isArchived = filter === 'archived'
  const slugOrigin = typeof window !== 'undefined' ? `${window.location.origin}/o/` : '/o/'

  return (
    <AdminShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Angebote</h1>
        <div className={styles.pageSub}>Alle erstellten Angebotsseiten mit Versionen</div>
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

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 30 }}></th>
              <th>Kunde / Projekt</th>
              <th>Angebotsnr.</th>
              <th>Template</th>
              <th>Status</th>
              <th>Version</th>
              <th>Kontakt</th>
              <th>Erstellt</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <Fragment key={o.id}>
                <tr
                  className={`${styles.offerRow} ${o.archivedAt ? styles.archivedRow : ''}`}
                  onClick={() => toggleVersions(o.id)}
                >
                  <td>
                    <span
                      className={`${styles.expandIcon} ${expandedId === o.id ? styles.expandIconOpen : ''}`}
                    >
                      ▶
                    </span>
                  </td>
                  <td>
                    <strong>{o.clientCompany}</strong>
                    {o.archivedAt && <span className={styles.archivedBadge}>Archiv</span>}
                    <br />
                    <span style={{ fontSize: 13, color: '#888' }}>{o.projectName}</span>
                  </td>
                  <td>{o.offerNumber || '–'}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      value={o.template || 'TEMPLATE2'}
                      onChange={(e) =>
                        changeTemplate(o.id, e.target.value as 'TEMPLATE1' | 'TEMPLATE2')
                      }
                      className={styles.templateSelect}
                      disabled={!!o.archivedAt}
                    >
                      <option value="TEMPLATE1">Template 1</option>
                      <option value="TEMPLATE2">Template 2</option>
                    </select>
                  </td>
                  <td>
                    <span className={`${styles.statusPill} ${statusClass(o.status)}`}>{o.status}</span>
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
                        {copied === o.slug ? (
                          <IconCheck size={14} color="#22c55e" />
                        ) : (
                          <IconLink size={14} />
                        )}
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                        onClick={() => openEdit(o)}
                        title="Metadaten bearbeiten"
                      >
                        <IconSettings size={14} />
                      </button>
                      {o.archivedAt ? (
                        <button
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                          onClick={() => askRestore(o)}
                          title="Aus Archiv wiederherstellen"
                        >
                          <IconArchiveRestore size={14} />
                        </button>
                      ) : (
                        <button
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall} ${styles.btnDanger}`}
                          onClick={() => askArchive(o)}
                          title="Archivieren"
                        >
                          <IconArchive size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedId === o.id && (
                  <tr>
                    <td colSpan={9} style={{ padding: 0 }}>
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
                            <span
                              className={`${styles.versionDot} ${i === 0 ? styles.versionDotCurrent : ''}`}
                            />
                            <span>v{v.version}</span>
                            <span className={styles.versionMeta}>
                              {v.changedBy} · {formatDateTime(v.createdAt)}
                            </span>
                            <span
                              style={{
                                marginLeft: 'auto',
                                color: '#FF1900',
                                fontSize: 12,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              Öffnen <IconExternalLink size={11} color="#FF1900" />
                            </span>
                          </a>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {offers.length === 0 && (
              <tr>
                <td colSpan={9} className={styles.emptyState}>
                  <div className={styles.emptyText}>
                    {isArchived ? 'Keine archivierten Angebote' : 'Noch keine Angebote erstellt'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* === METADATEN-MODAL === */}
      {editingOffer && form && (
        <div className={styles.modalOverlay} onClick={closeEdit}>
          <div
            className={`${styles.modal} ${styles.modalWide}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Metadaten bearbeiten</h2>
              <button className={styles.modalClose} onClick={closeEdit}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              {formError && <div className={styles.formError}>{formError}</div>}

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Kunde (Firma)</label>
                  <input
                    className={styles.formInput}
                    value={form.clientCompany}
                    onChange={(e) => setField('clientCompany', e.target.value)}
                    placeholder="z.B. TGW Logistics"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ansprechperson beim Kunden</label>
                  <input
                    className={styles.formInput}
                    value={form.clientName}
                    onChange={(e) => setField('clientName', e.target.value)}
                    placeholder="Vorname Nachname"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Projektname</label>
                <input
                  className={styles.formInput}
                  value={form.projectName}
                  onChange={(e) => setField('projectName', e.target.value)}
                  placeholder="z.B. Imagefilm 2026"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Angebotsnummer</label>
                  <input
                    className={styles.formInput}
                    value={form.offerNumber}
                    onChange={(e) => setField('offerNumber', e.target.value)}
                    placeholder="z.B. AN-2026-001"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Gültig bis</label>
                  <input
                    className={styles.formInput}
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => setField('validUntil', e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Template</label>
                  <select
                    className={styles.formInput}
                    value={form.template}
                    onChange={(e) =>
                      setField('template', e.target.value as 'TEMPLATE1' | 'TEMPLATE2')
                    }
                  >
                    <option value="TEMPLATE1">Template 1 (hell)</option>
                    <option value="TEMPLATE2">Template 2 (dunkel)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Status</label>
                  <select
                    className={styles.formInput}
                    value={form.status}
                    onChange={(e) =>
                      setField('status', e.target.value as 'DRAFT' | 'PRICED' | 'ACCEPTED')
                    }
                  >
                    <option value="DRAFT">DRAFT (Entwurf)</option>
                    <option value="PRICED">PRICED (Preise final)</option>
                    <option value="ACCEPTED">ACCEPTED (angenommen)</option>
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Kontakt (Pulpmedia)</label>
                <select
                  className={styles.formInput}
                  value={form.contactSlug}
                  onChange={(e) => setField('contactSlug', e.target.value)}
                >
                  {contacts.length === 0 && <option value={form.contactSlug}>Lädt …</option>}
                  {contacts.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                      {c.role ? ` — ${c.role}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>URL (Slug)</label>
                <div className={styles.slugField}>
                  <span className={styles.slugPrefix}>{slugOrigin}</span>
                  <input
                    className={styles.slugInput}
                    value={form.slug}
                    onChange={(e) => setField('slug', e.target.value)}
                    placeholder="kunde-projekt-2026"
                  />
                </div>
                {form.slug !== editingOffer.slug && (
                  <div className={styles.formHint} style={{ color: '#c0392b' }}>
                    Achtung: Die alte URL <code>{slugOrigin}{editingOffer.slug}</code> funktioniert
                    nach dem Speichern nicht mehr.
                  </div>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={closeEdit}
                disabled={saving}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Speichert …' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === CONFIRM-DIALOG === */}
      {confirm && (
        <div className={styles.confirmOverlay} onClick={() => !confirm.busy && setConfirm(null)}>
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
