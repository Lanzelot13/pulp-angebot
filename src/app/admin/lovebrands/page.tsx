'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminShell } from '../AdminShell'
import { ModulesSubnav } from '../ModulesSubnav'
import { IconEdit, IconTrash, IconPlus, IconArchive, IconArchiveRestore } from '../Icons'
import styles from '../admin.module.css'

interface LoveBrand {
  id: string
  slug: string
  name: string
  logoUrl: string
  shape: 'default' | 'badge' | 'tall'
  invertOnDark: boolean
  sortOrder: number
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

interface FormState {
  name: string
  slug: string
  logoUrl: string
  shape: 'default' | 'badge' | 'tall'
  invertOnDark: boolean
  sortOrder: number
}

const emptyForm = (): FormState => ({
  name: '',
  slug: '',
  logoUrl: '',
  shape: 'default',
  invertOnDark: true,
  sortOrder: 0,
})

export default function LoveBrandsPage() {
  const [brands, setBrands] = useState<LoveBrand[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LoveBrand | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (file: File) => {
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (form.name.trim()) fd.append('name', form.name.trim())
      const res = await fetch('/api/admin/lovebrands/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error || 'Upload fehlgeschlagen')
      } else {
        setForm((f) => ({ ...f, logoUrl: data.url }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    }
    setUploading(false)
  }

  const load = useCallback(() => {
    fetch('/api/admin/lovebrands')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setBrands(d))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setError(null)
    setModalOpen(true)
  }

  const openEdit = (b: LoveBrand) => {
    setEditing(b)
    setForm({
      name: b.name,
      slug: b.slug,
      logoUrl: b.logoUrl,
      shape: b.shape,
      invertOnDark: b.invertOnDark ?? true,
      sortOrder: b.sortOrder,
    })
    setError(null)
    setModalOpen(true)
  }

  const handleSave = async () => {
    setError(null)
    if (!form.name.trim()) {
      setError('Bitte einen Namen eingeben')
      return
    }
    setSaving(true)
    const payload = { ...form, name: form.name.trim(), slug: form.slug.trim() || undefined }
    const res = editing
      ? await fetch(`/api/admin/lovebrands/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/admin/lovebrands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
    setSaving(false)
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      setError(e.error || 'Speichern fehlgeschlagen')
      return
    }
    setModalOpen(false)
    load()
  }

  const handleArchiveToggle = async (brand: LoveBrand) => {
    await fetch(`/api/admin/lovebrands/${brand.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archive: !brand.archivedAt }),
    })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Wirklich endgültig löschen? Logo-Datei bleibt unter /pitch/lovebrands/.')) return
    await fetch(`/api/admin/lovebrands/${id}`, { method: 'DELETE' })
    load()
  }

  const visible = showArchived ? brands : brands.filter((b) => !b.archivedAt)

  return (
    <AdminShell>
      <ModulesSubnav />
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Lovebrands</h1>
        <div className={styles.pageSub}>
          Marken-Pool für die Lovebrands-Folie. Logo-Dateien liegen unter
          <code style={{ background: '#f0f0f0', padding: '2px 6px', margin: '0 4px', borderRadius: 4 }}>/public/pitch/lovebrands/</code>.
          Neue Datei manuell ins Repo committen, dann hier den Pfad eintragen.
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          {visible.length} Lovebrands
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#666', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Archivierte zeigen
          </label>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}>
            <IconPlus size={14} /> Neue Lovebrand
          </button>
        </div>
      </div>

      <div className={styles.card}>
        {visible.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
            Noch keine Lovebrands. Lege die erste an mit dem Button oben rechts.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 80 }}>Logo</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Form</th>
                <th style={{ width: 80 }}>Reihenfolge</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((b) => (
                <tr key={b.id} style={{ opacity: b.archivedAt ? 0.4 : 1 }}>
                  <td>
                    <div style={{ width: 56, height: 36, background: '#0a0a0a', borderRadius: 4, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {b.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={b.logoUrl}
                          alt={b.name}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            filter: b.invertOnDark ? 'grayscale(1) invert(1)' : 'grayscale(1)',
                          }}
                        />
                      )}
                    </div>
                  </td>
                  <td>{b.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#888' }}>{b.slug}</td>
                  <td>{b.shape}</td>
                  <td>{b.sortOrder}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                        onClick={() => openEdit(b)}
                        title="Bearbeiten"
                      >
                        <IconEdit size={14} />
                      </button>
                      {b.archivedAt ? (
                        <button
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                          onClick={() => handleArchiveToggle(b)}
                          title="Aus Archiv wiederherstellen"
                        >
                          <IconArchiveRestore size={14} />
                        </button>
                      ) : (
                        <button
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall} ${styles.btnDanger}`}
                          onClick={() => handleArchiveToggle(b)}
                          title="Archivieren"
                        >
                          <IconArchive size={14} />
                        </button>
                      )}
                      <button
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall} ${styles.btnDanger}`}
                        onClick={() => handleDelete(b.id)}
                        title="Löschen"
                      >
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className={styles.modalHeader}>
              <h2>{editing ? 'Lovebrand bearbeiten' : 'Neue Lovebrand'}</h2>
              <button onClick={() => setModalOpen(false)} className={styles.iconBtn}>✕</button>
            </div>
            <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label className={styles.formLabel}>
                Name
                <input
                  className={styles.formInput}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="zb Rosenbauer"
                />
              </label>
              <label className={styles.formLabel}>
                Slug <span style={{ color: '#888', fontWeight: 400 }}>(optional, sonst aus Name generiert)</span>
                <input
                  className={styles.formInput}
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="rosenbauer"
                />
              </label>
              <div className={styles.formLabel} style={{ display: 'block' }}>
                Logo
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    marginTop: 6,
                  }}
                >
                  {form.logoUrl && (
                    <div
                      style={{
                        background: '#0a0a0a',
                        borderRadius: 6,
                        padding: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 80,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.logoUrl}
                        alt="Logo-Vorschau"
                        style={{
                          maxHeight: 60,
                          maxWidth: '80%',
                          filter: form.invertOnDark ? 'grayscale(1) invert(1)' : 'grayscale(1)',
                        }}
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label
                      className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                      style={{ cursor: 'pointer', opacity: uploading ? 0.5 : 1 }}
                    >
                      {uploading ? 'Lädt hoch...' : form.logoUrl ? 'Anderes Logo wählen' : 'Logo hochladen'}
                      <input
                        type="file"
                        accept="image/svg+xml,image/png,image/jpeg,image/webp"
                        style={{ display: 'none' }}
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleFileUpload(f)
                          e.target.value = ''
                        }}
                      />
                    </label>
                    {form.logoUrl && (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                        onClick={() => setForm((f) => ({ ...f, logoUrl: '' }))}
                      >
                        Entfernen
                      </button>
                    )}
                  </div>
                  <input
                    className={styles.formInput}
                    value={form.logoUrl}
                    onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                    placeholder="URL oder Pfad (wird beim Upload automatisch gefüllt)"
                    style={{ fontSize: 12, fontFamily: 'monospace' }}
                  />
                  <small style={{ color: '#888', fontSize: 11 }}>
                    SVG, PNG, JPG oder WebP. Max 2 MB. Wird in Vercel Blob abgelegt.
                  </small>
                </div>
              </div>
              <label className={styles.formLabel}>
                Form
                <select
                  className={styles.formInput}
                  value={form.shape}
                  onChange={(e) => setForm((f) => ({ ...f, shape: e.target.value as FormState['shape'] }))}
                >
                  <option value="default">default (breite Wordmark)</option>
                  <option value="badge">badge (quadratisches Logo)</option>
                  <option value="tall">tall (höher als breit)</option>
                </select>
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '12px 14px',
                  background: '#f8f8f8',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={!form.invertOnDark}
                  onChange={(e) => setForm((f) => ({ ...f, invertOnDark: !e.target.checked }))}
                  style={{ marginTop: 2 }}
                />
                <span style={{ fontSize: 13 }}>
                  <strong style={{ display: 'block', marginBottom: 2 }}>
                    Logo ist bereits für dunklen Hintergrund aufbereitet
                  </strong>
                  <span style={{ color: '#888', fontSize: 12 }}>
                    Aktivieren wenn das SVG schon weiße oder graue Füllungen hat. Sonst wendet das Deck einen
                    Invert-Filter an, der dann das weiße Logo schwarz färbt.
                  </span>
                </span>
              </label>
              <label className={styles.formLabel}>
                Reihenfolge
                <input
                  type="number"
                  className={styles.formInput}
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                />
              </label>
              {error && <div style={{ color: '#a8201a', fontSize: 13 }}>{error}</div>}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btn} onClick={() => setModalOpen(false)}>Abbrechen</button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave} disabled={saving}>
                {saving ? 'Speichere...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
