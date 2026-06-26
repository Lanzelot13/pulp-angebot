'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminShell } from '../AdminShell'
import { OffersSubnav } from '../OffersSubnav'
import { SocialIcon, IconEdit, IconTrash, IconExternalLink } from '../Icons'
import styles from '../admin.module.css'

interface Channel {
  id: string
  name: string
  platform: string
  url: string
  sortOrder: number
}

const empty = { name: '', url: '', sortOrder: 0 }

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
  const openEdit = (c: Channel) => { setEditing(c); setForm({ name: c.name, url: c.url, sortOrder: c.sortOrder }); setModalOpen(true) }

  const handleSave = async () => {
    setSaving(true)
    if (editing) {
      await fetch(`/api/admin/channels/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } else {
      await fetch('/api/admin/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
      <OffersSubnav />
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Kanäle</h1>
        <div className={styles.pageSub}>Kundenkanäle auf Social Media Plattformen</div>
      </div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>Alle Kanäle</div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}>+ Neuer Kanal</button>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Titel</th>
              <th>URL</th>
              <th>Plattform</th>
              <th>Reihenfolge</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {channels.map(c => (
              <tr key={c.id}>
                <td style={{ textAlign: 'center' }}>
                  <SocialIcon url={c.url} size={20} color="#888" />
                </td>
                <td><strong>{c.name}</strong></td>
                <td>
                  <a href={c.url} target="_blank" rel="noopener" style={{ color: '#FF1900', textDecoration: 'none', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {c.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                    <IconExternalLink size={12} color="#FF1900" />
                  </a>
                </td>
                <td><span className={styles.tag}>{c.platform || '–'}</span></td>
                <td>{c.sortOrder}</td>
                <td>
                  <div className={styles.actions}>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => openEdit(c)}>
                      <IconEdit size={14} />
                    </button>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall} ${styles.btnDanger}`} onClick={() => setDeleting(c.id)}>
                      <IconTrash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {channels.length === 0 && (
              <tr><td colSpan={6} className={styles.emptyState}><div className={styles.emptyText}>Noch keine Kanäle</div></td></tr>
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
                <label className={styles.formLabel}>Titel</label>
                <input className={styles.formInput} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. efko Instagram, Zipfer Facebook" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>URL</label>
                <input className={styles.formInput} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://www.instagram.com/efkoat/" />
                {form.url && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#888' }}>
                    <SocialIcon url={form.url} size={16} color="#888" />
                    Plattform wird automatisch erkannt
                  </div>
                )}
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
