'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminShell } from '../AdminShell'
import styles from '../admin.module.css'

interface Channel {
  id: string
  name: string
  icon: string | null
  sortOrder: number
}

const empty = { name: '', icon: '', sortOrder: 0 }

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Channel | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/admin/channels')
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setChannels(d) })
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setForm(empty); setModalOpen(true) }
  const openEdit = (c: Channel) => { setEditing(c); setForm({ name: c.name, icon: c.icon || '', sortOrder: c.sortOrder }); setModalOpen(true) }

  const handleSave = async () => {
    setSaving(true)
    const data = { ...form, icon: form.icon || null }
    if (editing) {
      await fetch(`/api/admin/channels/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/admin/channels', {
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
    await fetch(`/api/admin/channels/${id}`, { method: 'DELETE' })
    setDeleting(null)
    load()
  }

  return (
    <AdminShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Kanäle</h1>
        <div className={styles.pageSub}>Social Media Kanäle</div>
      </div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>📱 Alle Kanäle</div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}>+ Neuer Kanal</button>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Icon</th>
              <th>Reihenfolge</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {channels.map(c => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td>
                <td>{c.icon || '–'}</td>
                <td>{c.sortOrder}</td>
                <td>
                  <div className={styles.actions}>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => openEdit(c)}>✏️</button>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall} ${styles.btnDanger}`} onClick={() => setDeleting(c.id)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {channels.length === 0 && (
              <tr><td colSpan={4} className={styles.emptyState}><div className={styles.emptyIcon}>📱</div><div className={styles.emptyText}>Noch keine Kanäle</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editing ? 'Kanal bearbeiten' : 'Neuer Kanal'}</h2>
              <button className={styles.modalClose} onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Kanalname</label>
                <input className={styles.formInput} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Instagram" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Icon (Emoji)</label>
                <input className={styles.formInput} value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="z.B. 📸" />
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
            <p>Dieser Kanal wird unwiderruflich gelöscht.</p>
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
