'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminShell } from '../AdminShell'
import { SlidedecksSubnav } from '../SlidedecksSubnav'
import { IconEdit, IconTrash, IconPlus, IconArchive, IconArchiveRestore, IconExternalLink } from '../Icons'
import styles from '../admin.module.css'

interface CaseReference {
  id: string
  slug: string
  name: string
  url: string
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'other'
  description: string | null
  tags: string[]
  sortOrder: number
  archivedAt: string | null
}

interface FormState {
  name: string
  slug: string
  url: string
  platform: CaseReference['platform']
  description: string
  tagsRaw: string
  sortOrder: number
}

const emptyForm = (): FormState => ({
  name: '',
  slug: '',
  url: '',
  platform: 'youtube',
  description: '',
  tagsRaw: '',
  sortOrder: 0,
})

function detectPlatform(url: string): CaseReference['platform'] {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube'
  if (/tiktok\.com/i.test(url)) return 'tiktok'
  if (/instagram\.com/i.test(url)) return 'instagram'
  if (/facebook\.com|fb\.com/i.test(url)) return 'facebook'
  return 'other'
}

const PLATFORM_LABEL: Record<CaseReference['platform'], string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  facebook: 'Facebook',
  other: 'Sonstiges',
}

export default function CaseReferencesPage() {
  const [refs, setRefs] = useState<CaseReference[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CaseReference | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const load = useCallback(() => {
    fetch('/api/admin/case-references')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setRefs(d))
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

  const openEdit = (r: CaseReference) => {
    setEditing(r)
    setForm({
      name: r.name,
      slug: r.slug,
      url: r.url,
      platform: r.platform,
      description: r.description || '',
      tagsRaw: (r.tags || []).join(', '),
      sortOrder: r.sortOrder,
    })
    setError(null)
    setModalOpen(true)
  }

  const handleSave = async () => {
    setError(null)
    if (!form.name.trim() || !form.url.trim()) {
      setError('Name und URL sind Pflicht')
      return
    }
    setSaving(true)
    const tags = form.tagsRaw.split(',').map((t) => t.trim()).filter(Boolean)
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      url: form.url.trim(),
      platform: form.platform,
      description: form.description.trim() || null,
      tags,
      sortOrder: form.sortOrder,
    }
    const res = editing
      ? await fetch(`/api/admin/case-references/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/admin/case-references', {
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

  const handleArchiveToggle = async (ref: CaseReference) => {
    await fetch(`/api/admin/case-references/${ref.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archive: !ref.archivedAt }),
    })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Wirklich endgültig löschen?')) return
    await fetch(`/api/admin/case-references/${id}`, { method: 'DELETE' })
    load()
  }

  const visible = showArchived ? refs : refs.filter((r) => !r.archivedAt)

  return (
    <AdminShell>
      <SlidedecksSubnav />
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Case-Referenzen</h1>
        <div className={styles.pageSub}>
          Häufig genutzte Video-Cases und Reels aus YouTube, TikTok, Instagram. Der Pitch-Skill
          und das Backend ziehen die Liste, wenn ein Case-Video oder Social-Case in den Pitch
          rein soll.
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>{visible.length} Referenzen</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#666', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Archivierte zeigen
          </label>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openCreate}>
            <IconPlus size={14} /> Neue Referenz
          </button>
        </div>
      </div>

      <div className={styles.card}>
        {visible.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
            Noch keine Referenzen. Leg die erste an mit dem Button oben rechts.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Plattform</th>
                <th>Tags</th>
                <th>URL</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} style={{ opacity: r.archivedAt ? 0.4 : 1 }}>
                  <td>
                    <strong>{r.name}</strong>
                    {r.description && (
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{r.description}</div>
                    )}
                  </td>
                  <td><span className={styles.tag}>{PLATFORM_LABEL[r.platform]}</span></td>
                  <td style={{ fontSize: 12, color: '#666' }}>{r.tags?.join(', ') || '–'}</td>
                  <td>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: '#FF1900', fontSize: 12 }}>
                      öffnen <IconExternalLink size={10} color="#FF1900" />
                    </a>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                        onClick={() => openEdit(r)}
                        title="Bearbeiten"
                      >
                        <IconEdit size={14} />
                      </button>
                      {r.archivedAt ? (
                        <button
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                          onClick={() => handleArchiveToggle(r)}
                          title="Wiederherstellen"
                        >
                          <IconArchiveRestore size={14} />
                        </button>
                      ) : (
                        <button
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall} ${styles.btnDanger}`}
                          onClick={() => handleArchiveToggle(r)}
                          title="Archivieren"
                        >
                          <IconArchive size={14} />
                        </button>
                      )}
                      <button
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall} ${styles.btnDanger}`}
                        onClick={() => handleDelete(r.id)}
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
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className={styles.modalHeader}>
              <h2>{editing ? 'Referenz bearbeiten' : 'Neue Case-Referenz'}</h2>
              <button onClick={() => setModalOpen(false)} className={styles.iconBtn}>✕</button>
            </div>
            <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label className={styles.formLabel}>
                Name
                <input
                  className={styles.formInput}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="zb Rosenbauer Markenfilm"
                />
              </label>
              <label className={styles.formLabel}>
                URL
                <input
                  className={styles.formInput}
                  value={form.url}
                  onChange={(e) => {
                    const url = e.target.value
                    setForm((f) => ({ ...f, url, platform: detectPlatform(url) }))
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <small style={{ color: '#888', fontSize: 11, marginTop: 4, display: 'block' }}>
                  Plattform wird automatisch erkannt
                </small>
              </label>
              <label className={styles.formLabel}>
                Plattform
                <select
                  className={styles.formInput}
                  value={form.platform}
                  onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value as CaseReference['platform'] }))}
                >
                  <option value="youtube">YouTube</option>
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="other">Sonstiges</option>
                </select>
              </label>
              <label className={styles.formLabel}>
                Beschreibung <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span>
                <textarea
                  className={styles.formInput}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="1-2 Sätze damit der Skill den Kontext versteht"
                />
              </label>
              <label className={styles.formLabel}>
                Tags <span style={{ color: '#888', fontWeight: 400 }}>(komma-getrennt)</span>
                <input
                  className={styles.formInput}
                  value={form.tagsRaw}
                  onChange={(e) => setForm((f) => ({ ...f, tagsRaw: e.target.value }))}
                  placeholder="Industrie, Recruiting, Hero-Video"
                />
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
