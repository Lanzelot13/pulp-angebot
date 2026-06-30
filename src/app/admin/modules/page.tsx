'use client'

import { useEffect, useState, useCallback } from 'react'
import { AdminShell } from '../AdminShell'
import { TeamPicker } from '../TeamPicker'
import { LoveBrandFields } from '../LoveBrandPicker'
import { SlidedecksSubnav } from '../SlidedecksSubnav'
import { IconEdit, IconTrash, IconPlus } from '../Icons'
import { RichTextEditor } from '../RichTextEditor'
import { CasePicker, CasePlatform, embedFromCase } from '../CasePicker'
import { SchemaHelp } from '../SchemaHelp'
import { MODULES_WITH_STANDARD_HEADER } from '../module-schema-help'
import { sanitizeRichText } from '@/lib/sanitize-html'
import styles from '../admin.module.css'
import {
  PITCH_MODULE_TYPES,
  PITCH_MODULE_LABELS,
  DEFAULT_CONTENT,
  PITCH_ICON_KEYS,
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
// TeamFields
// =========================================================
//
// Brücke zwischen dem TeamPicker (strukturiertes UI) und dem rohen JSON-
// Editor. Wir parsen den aktuellen JSON-String, lassen den TeamPicker
// daran arbeiten und schreiben das Ergebnis als neuen JSON-String zurück.
// Im neuen v7-Schema heißt der Typ "team" und das Feld "attendingSlugs".
function TeamFields({
  contentJson,
  onChange,
}: {
  contentJson: string
  onChange: (json: string) => void
}) {
  let parsed: { headline?: string; attendingSlugs?: string[] } = {}
  try {
    const p = JSON.parse(contentJson || '{}')
    if (p && typeof p === 'object') parsed = p
  } catch {
    parsed = {}
  }
  const headline =
    typeof parsed.headline === 'string' ? parsed.headline : ''
  const attendingSlugs = Array.isArray(parsed.attendingSlugs)
    ? parsed.attendingSlugs.filter((x): x is string => typeof x === 'string')
    : []
  return (
    <TeamPicker
      headline={headline}
      personSlugs={attendingSlugs}
      onChange={(next) =>
        onChange(
          JSON.stringify(
            { headline: next.headline, attendingSlugs: next.personSlugs },
            null,
            2
          )
        )
      }
    />
  )
}

// =========================================================
// StandardHeaderFields
// =========================================================
// Eyebrow / Headline / Icon / Body als Brücke zwischen Formular
// und dem JSON-Content. Wird für alle Module gezeigt, die im
// Renderer einen Standard-Header rendern (siehe MODULES_WITH_STANDARD_HEADER).
function StandardHeaderFields({
  contentJson,
  onChange,
  hasIcon = false,
}: {
  contentJson: string
  onChange: (json: string) => void
  hasIcon?: boolean
}) {
  let parsed: Record<string, unknown> = {}
  try {
    const p = JSON.parse(contentJson || '{}')
    if (p && typeof p === 'object') parsed = p as Record<string, unknown>
  } catch {
    parsed = {}
  }
  const eyebrow = typeof parsed.eyebrow === 'string' ? parsed.eyebrow : ''
  const headline = typeof parsed.headline === 'string' ? parsed.headline : ''
  const sub = typeof parsed.sub === 'string' ? parsed.sub : ''
  const iconKey = typeof parsed.iconKey === 'string' ? parsed.iconKey : ''

  const update = (patch: Record<string, unknown>) => {
    const next = { ...parsed, ...patch }
    // Leere Strings rausschmeißen, damit JSON sauber bleibt
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v === null || v === undefined) delete next[k]
    }
    onChange(JSON.stringify(next, null, 2))
  }

  return (
    <div
      style={{
        border: '1px solid #eee',
        background: '#fafafa',
        borderRadius: 8,
        padding: 14,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: '#888',
          marginBottom: 12,
        }}
      >
        Slide-Header
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Eyebrow</label>
        <input
          className={styles.formInput}
          value={eyebrow}
          onChange={(e) => update({ eyebrow: e.target.value })}
          placeholder="Kleiner Augenbrauen-Text, optional"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          Titel <span style={{ color: '#888', fontWeight: 400 }}>(`**Text**` wird rot)</span>
        </label>
        <input
          className={styles.formInput}
          value={headline}
          onChange={(e) => update({ headline: e.target.value })}
          placeholder="z.B. So bauen wir **Lovebrands**"
        />
      </div>

      {hasIcon && (
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Icon am Ende der Überschrift</label>
          <select
            className={styles.formInput}
            value={iconKey}
            onChange={(e) => update({ iconKey: e.target.value })}
            style={{
              appearance: 'auto',
            }}
          >
            <option value="">— Keines —</option>
            {PITCH_ICON_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Body</label>
        <RichTextEditor
          value={sub}
          onChange={(html) => update({ sub: sanitizeRichText(html) })}
          placeholder="Untertitel oder kurzer Body, optional. Fett, kursiv, unterstrichen, Link verfügbar."
        />
      </div>
    </div>
  )
}

// =========================================================
// CaseEmbedField – setzt content.embed über den CasePicker
// =========================================================
function CaseEmbedField({
  contentJson,
  onChange,
  allowedPlatforms,
}: {
  contentJson: string
  onChange: (json: string) => void
  allowedPlatforms: CasePlatform[]
}) {
  return (
    <CasePicker
      allowedPlatforms={allowedPlatforms}
      onSelect={(ref) => {
        let parsed: Record<string, unknown> = {}
        try {
          const p = JSON.parse(contentJson || '{}')
          if (p && typeof p === 'object') parsed = p as Record<string, unknown>
        } catch {
          parsed = {}
        }
        parsed.embed = embedFromCase(ref)
        onChange(JSON.stringify(parsed, null, 2))
      }}
    />
  )
}

const emptyForm = (type: PitchModuleType = 'hero'): FormState => ({
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
      setJsonError('Bitte gib dem Modul eine Bezeichnung')
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
      <SlidedecksSubnav />
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
              {/* Zeile 1: Modul-Typ + Bezeichnung nebeneinander */}
              <div
                className={styles.formGroup}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
              >
                <div>
                  <label className={styles.formLabel}>Modul-Typ</label>
                  <select
                    className={styles.formInput}
                    value={form.type}
                    onChange={(e) =>
                      handleTypeChange(e.target.value as PitchModuleType)
                    }
                    style={{
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23666' d='M6 8L0 0h12z'/%3E%3C/svg%3E\")",
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      paddingRight: 32,
                      cursor: 'pointer',
                    }}
                  >
                    {PITCH_MODULE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {PITCH_MODULE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={styles.formLabel}>Bezeichnung</label>
                  <input
                    className={styles.formInput}
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="z.B. Pulpies Standard, Service: Hero Videos"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Interne Notiz <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  className={styles.formInput}
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Was ist das Modul, wann nutzen wir es? Nur intern, taucht im Pitch nicht auf."
                />
              </div>

              {/* Standard-Header für Module mit Eyebrow/Headline/Body */}
              {MODULES_WITH_STANDARD_HEADER.has(form.type) && (
                <StandardHeaderFields
                  contentJson={form.contentJson}
                  onChange={(json) =>
                    setForm((f) => ({ ...f, contentJson: json }))
                  }
                />
              )}

              {/* Modul-spezifische Felder */}
              {form.type === 'team' && (
                <TeamFields
                  contentJson={form.contentJson}
                  onChange={(json) =>
                    setForm((f) => ({ ...f, contentJson: json }))
                  }
                />
              )}

              {form.type === 'love-brands' && (
                <LoveBrandFields
                  contentJson={form.contentJson}
                  onChange={(json) =>
                    setForm((f) => ({ ...f, contentJson: json }))
                  }
                />
              )}

              {form.type === 'case-video' && (
                <CaseEmbedField
                  contentJson={form.contentJson}
                  onChange={(json) =>
                    setForm((f) => ({ ...f, contentJson: json }))
                  }
                  allowedPlatforms={['youtube']}
                />
              )}

              {(form.type === 'case-social' || form.type === 'spotlight') && (
                <CaseEmbedField
                  contentJson={form.contentJson}
                  onChange={(json) =>
                    setForm((f) => ({ ...f, contentJson: json }))
                  }
                  allowedPlatforms={['tiktok', 'instagram']}
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
                    {form.type === 'team'
                      ? 'Inhalt (JSON, Quelle der Wahrheit)'
                      : 'Inhalt (JSON)'}
                  </label>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                    onClick={loadTemplate}
                  >
                    Default laden
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
                <SchemaHelp type={form.type} />
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
