'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminShell } from '../AdminShell'
import { IconEdit, IconTrash } from '../Icons'
import styles from '../admin.module.css'

interface Contact {
  id: string
  slug: string
  name: string
  role: string
  email: string
  phone: string
  avatarUrl: string | null
}

const empty: Omit<Contact, 'id'> = { slug: '', name: '', role: '', email: '', phone: '', avatarUrl: null }

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/admin/contacts')
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setContacts(d) })
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); setForm(empty); setModalOpen(true) }
  const openEdit = (c: Contact) => { setEditing(c); setForm({ slug: c.slug, name: c.name, role: c.role, email: c.email, phone: c.phone, avatarUrl: c.avatarUrl }); setModalOpen(true) }

  const handleSave = async () => {
    setSaving(true)
    if (editing) {
      await fetch(`/api/admin/contacts/${editing.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } else {
      await fetch('/api/admin/contacts', {
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
    await fetch(`/api/admin/contacts/${id}`, { method: 'DELETE' })
    setDeleting(null)
    load()
  }

  const setField = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  return (
    <AdminShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Ansprechpersonen</h1>
        <div className={styles.pageSub}>Pulpmedia-Kontakte, die im Angebots-Footer erscheinen</div>
      </div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>Alle Kontakte</div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}>+ Neue Person</button>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Rolle</th>
              <th>E-Mail</th>
              <th>Telefon</th>
              <th>Slug</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map(c => (
              <tr key={c.slug}>
                <td><strong>{c.name}</strong></td>
                <td>{c.role}</td>
                <td>{c.email}</td>
                <td>{c.phone}</td>
                <td><code className={styles.slug}>{c.slug}</code></td>
                <td>
                  <div className={styles.actions}>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`} onClick={() => openEdit(c)}>
                      <IconEdit size={14} />
                    </button>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall} ${styles.btnDanger}`} onClick={() => setDeleting(c.slug)}>
                      <IconTrash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr><td colSpan={6} className={styles.emptyState}><div className={styles.emptyText}>Noch keine Kontakte</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editing ? 'Person bearbeiten' : 'Neue Person'}</h2>
              <button className={styles.modalClose} onClick={() => setModalOpen(false)}>&times;</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Name</label>
                <input className={styles.formInput} value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Vorname Nachname" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Rolle / Position</label>
                <input className={styles.formInput} value={form.role} onChange={e => setField('role', e.target.value)} placeholder="z.B. CEO, Account Manager" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>E-Mail</label>
                <input className={styles.formInput} type="email" value={form.email} onChange={e => setField('email', e.target.value)} placeholder="vorname@pulpmedia.at" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Telefon</label>
                <input className={styles.formInput} value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+43 ..." />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Foto-URL (wird im Angebots-Footer angezeigt)</label>
                <input className={styles.formInput} value={form.avatarUrl || ''} onChange={e => setField('avatarUrl', e.target.value || '')} placeholder="https://..." />
                {form.avatarUrl && (
                  <div style={{ marginTop: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.avatarUrl} alt="Vorschau" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid #eee' }} />
                  </div>
                )}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Slug (für API-Zuordnung)</label>
                <input className={styles.formInput} value={form.slug} onChange={e => setField('slug', e.target.value)} placeholder="z.B. paul, robert" />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setModalOpen(false)}>Abbrechen</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>
                {saving ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleting && (
        <div className={styles.confirmOverlay} onClick={() => setDeleting(null)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <h3>Wirklich löschen?</h3>
            <p>Diese Ansprechperson wird unwiderruflich gelöscht.</p>
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
