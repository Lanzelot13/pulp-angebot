'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminShell } from '../AdminShell'
import { TeamPicker } from '../TeamPicker'
import { IconEdit, IconTrash, IconPlus } from '../Icons'
import styles from '../admin.module.css'
import {
  PITCH_MODULE_TYPES,
  PITCH_MODULE_LABELS,
  DEFAULT_CONTENT,
  PitchModuleType,
} from '@/lib/pitch-types'

interface PitchModule {
  id: string
  type: PitchModuleType
  name: string
  description: string | null
  content: unknown
  createdBy: string
  sortOrder: number
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

interface FormState {
  type: PitchModuleType
  name: string
  description: string
  contentJson: string
  sortOrder: number
}

// =========================================================
// TeamGridFields
// =========================================================
//
// Brücke zwischen dem TeamPicker (strukturiertes UI) und dem rohen JSON-
// Editor. Wir parsen den aktuellen JSON-String, lassen den TeamPicker
// daran arbeiten und schreiben das Ergebnis als neuen JSON-String zurück.
// Bei ungültigem JSON zeigt der Picker leere Defaults und überschreibt
// den JSON-String, sobald der User etwas auswählt – das ist verträglich,
// weil das Vorlagen-JSON für team-grid sehr klein und einfach ist.
function TeamGridFields({
  contentJson,
  onChange,
}: {
  contentJson: string
  onChange: (json: string) => void
}) {
  let parsed: { headline?: string; personSlugs?: string[] } = {}
  try {
    const p = JSON.parse(contentJson || '{}')
    if (p && typeof p === 'object') parsed = p
  } catch {
    parsed = {}
  }
  const headline =
    typeof parsed.headline === 'string' ? parsed.headline : ''
  const personSlugs = Array.isArray(parsed.personSlugs)
    ? parsed.personSlugs.filter((x): x is string => typeof x === 'string')
    : []
  return (
    <TeamPicker
      headline={headline}
      personSlugs={personSlugs}
      onChange={(next) =>
        onChange(JSON.stringify(next, null, 2))
      }
    />
  )
}

const emptyForm = (type: PitchModuleType = 'text'): FormState => ({
  type,
  name: '',
  description: '',
  contentJson: JSON.stringify(DEFAULT_CONTENT[type], null, 2),
  sortOrder: 0,
})

export default function ModulesPage() {
  const [modules, setModules] = useState<PitchModule[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PitchModule | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [filter, setFilter] = useState<PitchModuleType | 'all'>('all')

  const load = useCallback(() => {
    fetch('/api/admin/modules')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (Array.isArray(d)) setModules(d)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setJsonError(null)
    setModalOpen(true)
  }

  const openEdit = (m: PitchModule) => {
    setEditing(m)
    setForm({
      type: m.type,
      name: m.name,
      description: m.description || '',
      contentJson: JSON.stringify(m.content ?? {}, null, 2),
      sortOrder: m.sortOrder,
    })
    setJsonError(null)
    setModalOpen(true)
  }

  const handleTypeChange = (newType: PitchModuleType) => {
    setForm((f) => {
      // Only reset content if user hasn't modified it (or it's empty) — heuristic: when the current
      // content matches one of the existing default templates, swap it for the new type's template.
      const currentJson = f.contentJson.trim()
      const matchesAnyDefault = PITCH_MODULE_TYPES.some(
        (t) => JSON.stringify(DEFAULT_CONTENT[t], null, 2) === currentJson
      )
      const empty = currentJson === '' || currentJson === '{}'
      return {
        ...f,
        type: newType,
        contentJson:
          empty || matchesAnyDefault
            ? JSON.stringify(DEFAULT_CONTENT[newType], null, 2)
            : f.contentJson,
      }
    })
  }

  const loadTemplate = () => {
    setForm((f) => ({
      ...f,
      contentJson: JSON.stringify(DEFAULT_CONTENT[f.type], null, 2),
    }))
    setJsonError(null)
  }

  const handleSave = async () => {
    setJsonError(null)
    let parsedContent: unknown
    try {
      parsedContent = JSON.parse(form.contentJson || '{}')
    } catch (e) {
      setJsonError(
        'JSON ist ungültig: ' +
          (e instanceof Error ? e.message : 'Bitte prüfen')
      )
      return
    }

    if (!form.name.trim()) {
      setJsonError('Bitte gib dem Modul einen Namen')
      return
    }

    setSaving(true)
    const payload = {
      type: form.type,
      name: form.name.trim(),
      description: form.description.trim() || null,
      content: parsedContent,
      sortOrder: form.sortOrder,
    }
    const res = editing
      ? await fetch(`/api/admin/modules/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/admin/modules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
    setSaving(false)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setJsonError(err.error || 'Speichern fehlgeschlagen')
      return
    }
    setModalOpen(false)
    load()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/modules/${id}`, { method: 'DELETE' })
    setDeleting(null)
    load()
  }

  const filteredModules =
    filter === 'all' ? modules : modules.filter((m) => m.type === filter)

  return (
    <AdminShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Module</h1>
        <div className={styles.pageSub}>
          Wiederverwendbare Bausteine für Agenturpräsentationen.
          Hier pflegen wir Pulpies-Folien, Service-Beschreibungen, Stats und mehr.
          Beim Hinzufügen zu einem Pitch werden Module statisch reinkopiert.
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          Alle Module
          <select
            className={styles.formInput}
            style={{
              marginLeft: 16,
              padding: '6px 10px',
              fontSize: 13,
              width: 'auto',
              display: 'inline-block',
            }}
            value={filter}
            onChange={(e) => setFilter(e.target.value as PitchModuleType | 'all')}
          >
            <option value="all">Alle Typen</option>
            {PITCH_MODULE_TYPES.map((t) => (
              <option key={t} value={t}>
                {PITCH_MODULE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={openCreate}
        >
          <IconPlus size={14} /> Neues Modul
        </button>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Typ</th>
              <th>Notiz</th>
              <th>Angelegt von</th>
              <th>Aktualisiert</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredModules.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>{m.name}</strong>
                </td>
                <td>
                  <span className={styles.tag}>
                    {PITCH_MODULE_LABELS[m.type] || m.type}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: '#666', maxWidth: 320 }}>
                  {m.description || '–'}
                </td>
                <td style={{ fontSize: 13, color: '#666' }}>
                  {m.createdBy || '–'}
                </td>
                <td style={{ fontSize: 13, color: '#888' }}>
                  {new Date(m.updatedAt).toLocaleDateString('de-AT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                      onClick={() => openEdit(m)}
                      title="Bearbeiten"
                    >
                      <IconEdit size={14} />
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall} ${styles.btnDanger}`}
                      onClick={() => setDeleting(m.id)}
                      title="Löschen"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredModules.length === 0 && (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  <div className={styles.emptyText}>
                    {filter === 'all'
                      ? 'Noch keine Module. Lege das erste an, z.B. die Pulpies-Folie.'
                      : `Keine Module vom Typ "${PITCH_MODULE_LABELS[filter as PitchModuleType]}"`}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div
            className={styles.modal}
            style={{ maxWidth: 760 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>{editing ? 'Modul bearbeiten' : 'Neues Modul'}</h2>
              <button
                className={styles.modalClose}
                onClick={() => setModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Modul-Typ</label>
                <select
                  className={styles.formInput}
                  value={form.type}
                  onChange={(e) =>
                    handleTypeChange(e.target.value as PitchModuleType)
                  }
                >
                  {PITCH_MODULE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {PITCH_MODULE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <div style={{ marginTop: 6, fontSize: 12, color: '#888' }}>
                  Bestimmt, wie das Modul im Frontend gerendert wird.
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Name</label>
                <input
                  className={styles.formInput}
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="z.B. Pulpies Standard, Service: Hero Videos"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Interne Notiz (optional)
                </label>
                <textarea
                  className={styles.formInput}
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Was ist das Modul, wann nutzen wir es?"
                />
              </div>

              {form.type === 'team-grid' && (
                <TeamGridFields
                  contentJson={form.contentJson}
                  onChange={(json) =>
                    setForm((f) => ({ ...f, contentJson: json }))
                  }
                />
              )}

              <div className={styles.formGroup}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <label className={styles.formLabel} style={{ margin: 0 }}>
                    {form.type === 'team-grid'
                      ? 'Inhalt (JSON, Quelle der Wahrheit)'
                      : 'Inhalt (JSON)'}
                  </label>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                    onClick={loadTemplate}
                  >
                    Vorlage laden
                  </button>
                </div>
                <textarea
                  className={styles.formInput}
                  rows={16}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                  value={form.contentJson}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contentJson: e.target.value }))
                  }
                />
                {jsonError && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      background: '#fff0ed',
                      color: '#c52a00',
                      fontSize: 13,
                      borderRadius: 4,
                    }}
                  >
                    {jsonError}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Reihenfolge</label>
                <input
                  className={styles.formInput}
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setModalOpen(false)}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className={styles.confirmOverlay} onClick={() => setDeleting(null)}>
          <div
            className={styles.confirmBox}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Wirklich löschen?</h3>
            <p>
              Dieses Modul wird unwiderruflich gelöscht. Bestehende Pitches
              behalten ihren Snapshot, können aber nicht mehr aktualisiert werden.
            </p>
            <div className={styles.confirmActions}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setDeleting(null)}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => handleDelete(deleting)}
              >
                Ja, löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
