'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminShell } from '../AdminShell'
import { OffersSubnav } from '../OffersSubnav'
import { IconEdit, IconTrash, IconExternalLink } from '../Icons'
import styles from '../admin.module.css'

interface Reference {
  id: string
  name: string
  description: string
  url: string | null
  tags: string[]
  imageUrl: string | null
  sortOrder: number
}

const empty = { name: '', description: '', url: null as string | null, tags: [] as string[], imageUrl: null as string | null, sortOrder: 0 }

export default function ReferencesPage() {
  const [refs, setRefs] = useState<Reference[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Reference | null>(null)
  const [form, setForm] = useState(empty)
  const [tagsStr, setTagsStr] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/admin/references')
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setRefs(d) })
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(empty)
    setTagsStr('')
    setModalOpen(true)
  }
  const openEdit = (r: Reference) => {
    setEditing(r)
    setForm({ name: r.name, description: r.description, url: r.url, tags: r.tags, imageUrl: r.imageUrl, sortOrder: r.sortOrder })
    setTagsStr(r.tags.join(', '))
    setModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const data = { ...form, tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean) }
    if (editing) {
      await fetch(`/api/admin/references/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/admin/references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setSaving(false)
    setModalOpen(false)
    load()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/references/${id}`, { method: 'DELETE' })
    setDeleting(null)
    load()
  }

  return (
    <AdminShell>
      <OffersSubnav />
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Referenzen</h1>
        <div className={styles.pageSub}>Kundenprojekte, die in Angebotsseiten als Referenz angezeigt werden</div>
      </div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>Alle Referenzen</div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}>+ Neue Referenz</button>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Beschreibung</th>
              <th>Website</th>
              <th>Tags</th>
              <th>Reihenfolge</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {refs.map(r => (
              <tr key={r.id}>
                <td><strong>{r.name}</strong></td>
                <td>{r.description}</td>
                <td>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener" style={{ color: '#FF1900', textDecoration: 'none', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {r.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                      <IconExternalLink size={12} color="#FF1900" />
                    </a>
                  )}
                </td>
                <td>
                  <div className={styles.tagList}>
                    {r.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
                  </div>
                </td>
                <td>{r.sortOrder}</td>
                <td>
                  <div className={styles.actions}>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => openEdit(r)}>
                      <IconEdit size={14} />
                    </button>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall} ${styles.btnDanger}`} onClick={() => setDeleting(r.id)}>
                      <IconTrash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {refs.length === 0 && (
              <tr><td colSpan={6} className={styles.emptyState}><div className={styles.emptyText}>Noch keine Referenzen</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editing ? 'Referenz bearbeiten' : 'Neue Referenz'}</h2>
              <button className={styles.modalClose} onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Kundenname</label>
                <input className={styles.formInput} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. TGW Logistics" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Beschreibung</label>
                <textarea className={styles.formInput} style={{ minHeight: 80, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Kurze Projektbeschreibung" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Website-URL</label>
                <input className={styles.formInput} value={form.url || ''} onChange={e => setForm(f => ({ ...f, url: e.target.value || null }))} placeholder="https://www.tgw-group.com" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tags (kommagetrennt)</label>
                <input className={styles.formInput} value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="z.B. LinkedIn, Employer Branding" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Bild-URL (optional)</label>
                <input className={styles.formInput} value={form.imageUrl || ''} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value || null }))} placeholder="https://..." />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Reihenfolge</label>
                <input className={styles.formInput} type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setModalOpen(false)}>Abbrechen</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>{saving ? 'Speichert...' : 'Speichern'}</button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className={styles.confirmOverlay} onClick={() => setDeleting(null)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <h3>Wirklich löschen?</h3>
            <p>Diese Referenz wird unwiderruflich gelöscht.</p>
            <div className={styles.confirmActions}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setDeleting(null)}>Abbrechen</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => handleDelete(deleting)}>Ja, löschen</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
