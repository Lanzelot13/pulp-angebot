'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { AdminShell } from '../../AdminShell'
import { TeamPicker } from '../../TeamPicker'
import { LoveBrandFields } from '../../LoveBrandPicker'
import { SchemaHelp } from '../../SchemaHelp'
import {
  StandardHeaderFields,
  CaseEmbedField,
  showsStandardHeader,
  casePlatformsFor,
} from '../../ModuleContentFields'
import {
  IconEye,
  IconEdit,
  IconLink,
  IconCheck,
  IconTrash,
  IconPlus,
  IconExternalLink,
} from '../../Icons'
import styles from '../../admin.module.css'
import {
  PITCH_MODULE_TYPES,
  PITCH_MODULE_LABELS,
  DEFAULT_CONTENT,
  PitchModuleType,
} from '@/lib/pitch-types'

// Inline-Style für ein klar erkennbares Dropdown
const SELECT_DROPDOWN_STYLE: React.CSSProperties = {
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23666' d='M6 8L0 0h12z'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 32,
  cursor: 'pointer',
}

interface Contact {
  slug: string
  name: string
  role: string
}

interface PitchModuleSnapshot {
  instanceId: string
  moduleId: string | null
  type: PitchModuleType
  name: string
  content: unknown
  sourceUpdatedAt: string | null
  sortOrder: number
}

interface Pitch {
  id: string
  slug: string
  status: 'DRAFT' | 'SENT' | 'ARCHIVED'
  clientCompany: string
  occasion: string | null
  contactSlug: string
  editToken: string
  archivedAt: string | null
  modules: PitchModuleSnapshot[]
  createdAt: string
  updatedAt: string
}

interface PitchModuleSource {
  id: string
  type: PitchModuleType
  name: string
  description: string | null
  content: unknown
  updatedAt: string
}

interface Props {
  initialPitch: Pitch
  contacts: Contact[]
}

const STATUS_LABELS: Record<Pitch['status'], string> = {
  DRAFT: 'Entwurf',
  SENT: 'Versendet',
  ARCHIVED: 'Archiv',
}

// Brücke zwischen JSON-Editor und TeamPicker für team-Module (v7-Schema).
// Im neuen Schema sind die Slug-Liste der heute Anwesenden in
// `attendingSlugs`; die volle Pulpie-Liste kommt aus dem Live-Fetch.
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

export function PitchEditor({ initialPitch, contacts }: Props) {
  const [pitch, setPitch] = useState<Pitch>(initialPitch)
  const [meta, setMeta] = useState({
    clientCompany: initialPitch.clientCompany,
    occasion: initialPitch.occasion || '',
    contactSlug: initialPitch.contactSlug,
    status: initialPitch.status,
    slug: initialPitch.slug,
  })
  const [metaSaving, setMetaSaving] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [sourceModules, setSourceModules] = useState<PitchModuleSource[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerTab, setPickerTab] = useState<'global' | 'custom'>('global')
  const [pickerFilter, setPickerFilter] = useState<PitchModuleType | 'all'>('all')

  // Custom-block draft state. Default-Typ ist "hero" – v7 hat kein generisches
  // "text"-Modul mehr, jeder Typ ist semantisch eindeutig.
  const [customDraft, setCustomDraft] = useState({
    type: 'hero' as PitchModuleType,
    name: '',
    contentJson: JSON.stringify(DEFAULT_CONTENT['hero'], null, 2),
  })
  const [customError, setCustomError] = useState<string | null>(null)
  const [customSaving, setCustomSaving] = useState(false)

  // Inline content editor state
  const [editingModule, setEditingModule] = useState<PitchModuleSnapshot | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    contentJson: '',
  })
  const [editError, setEditError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  // Drag state for reorder
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  // Load global modules once
  useEffect(() => {
    fetch('/api/admin/modules')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (Array.isArray(d)) setSourceModules(d)
      })
      .catch(() => {})
  }, [])

  const sortedModules = useMemo(
    () => [...pitch.modules].sort((a, b) => a.sortOrder - b.sortOrder),
    [pitch.modules]
  )

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/admin/pitches/${pitch.id}`)
    if (res.ok) {
      const d = await res.json()
      setPitch(d)
    }
  }, [pitch.id])

  const saveMeta = async () => {
    setMetaSaving(true)
    setMetaError(null)
    const payload: Record<string, unknown> = {}
    if (meta.clientCompany !== pitch.clientCompany)
      payload.clientCompany = meta.clientCompany
    if ((meta.occasion || null) !== pitch.occasion)
      payload.occasion = meta.occasion || null
    if (meta.contactSlug !== pitch.contactSlug)
      payload.contactSlug = meta.contactSlug
    if (meta.status !== pitch.status) payload.status = meta.status
    if (meta.slug !== pitch.slug) payload.slug = meta.slug

    if (Object.keys(payload).length === 0) {
      setMetaSaving(false)
      return
    }

    const res = await fetch(`/api/admin/pitches/${pitch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setMetaError(d.error || 'Speichern fehlgeschlagen')
    } else {
      const updated = await res.json()
      setPitch(updated)
      setMeta({
        clientCompany: updated.clientCompany,
        occasion: updated.occasion || '',
        contactSlug: updated.contactSlug,
        status: updated.status,
        slug: updated.slug,
      })
    }
    setMetaSaving(false)
  }

  const copyLink = () => {
    const url = `${window.location.origin}/p/${pitch.slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const addFromGlobal = async (moduleId: string) => {
    const res = await fetch(`/api/admin/pitches/${pitch.id}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleId }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPitch(updated)
      setPickerOpen(false)
    }
  }

  const addCustom = async () => {
    setCustomError(null)
    if (!customDraft.name.trim()) {
      setCustomError('Bitte gib dem Block einen Namen')
      return
    }
    let content: unknown
    try {
      content = JSON.parse(customDraft.contentJson || '{}')
    } catch (e) {
      setCustomError(
        'JSON ist ungültig: ' +
          (e instanceof Error ? e.message : 'Bitte prüfen')
      )
      return
    }
    setCustomSaving(true)
    const res = await fetch(`/api/admin/pitches/${pitch.id}/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        custom: {
          type: customDraft.type,
          name: customDraft.name.trim(),
          content,
        },
      }),
    })
    setCustomSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setCustomError(d.error || 'Anlegen fehlgeschlagen')
      return
    }
    const updated = await res.json()
    setPitch(updated)
    setPickerOpen(false)
    setCustomDraft({
      type: 'hero',
      name: '',
      contentJson: JSON.stringify(DEFAULT_CONTENT['hero'], null, 2),
    })
  }

  const refreshInstance = async (instanceId: string) => {
    const res = await fetch(
      `/api/admin/pitches/${pitch.id}/modules/${instanceId}/refresh`,
      { method: 'POST' }
    )
    if (res.ok) {
      const updated = await res.json()
      setPitch(updated)
    }
  }

  const removeInstance = async (instanceId: string) => {
    if (!confirm('Modul wirklich aus der Pitch entfernen?')) return
    const res = await fetch(
      `/api/admin/pitches/${pitch.id}/modules/${instanceId}`,
      { method: 'DELETE' }
    )
    if (res.ok) {
      const updated = await res.json()
      setPitch(updated)
    }
  }

  const openEditModule = (m: PitchModuleSnapshot) => {
    setEditingModule(m)
    setEditForm({
      name: m.name,
      contentJson: JSON.stringify(m.content ?? {}, null, 2),
    })
    setEditError(null)
  }

  const saveModuleEdit = async () => {
    if (!editingModule) return
    setEditError(null)
    let content: unknown
    try {
      content = JSON.parse(editForm.contentJson || '{}')
    } catch (e) {
      setEditError(
        'JSON ist ungültig: ' +
          (e instanceof Error ? e.message : 'Bitte prüfen')
      )
      return
    }
    if (!editForm.name.trim()) {
      setEditError('Name darf nicht leer sein')
      return
    }
    setEditSaving(true)
    const res = await fetch(
      `/api/admin/pitches/${pitch.id}/modules/${editingModule.instanceId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          content,
        }),
      }
    )
    setEditSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setEditError(d.error || 'Speichern fehlgeschlagen')
      return
    }
    const updated = await res.json()
    setPitch(updated)
    setEditingModule(null)
  }

  // Drag-and-drop reorder using HTML5 drag events
  const onDragStart = (idx: number) => () => setDragIdx(idx)
  const onDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
  }
  const onDrop = (idx: number) => async (e: React.DragEvent) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const moved = [...sortedModules]
    const [m] = moved.splice(dragIdx, 1)
    moved.splice(idx, 0, m)
    setDragIdx(null)
    // optimistic local update
    setPitch((p) => ({
      ...p,
      modules: moved.map((mm, i) => ({ ...mm, sortOrder: i })),
    }))
    const res = await fetch(`/api/admin/pitches/${pitch.id}/modules/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: moved.map((mm) => mm.instanceId) }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPitch(updated)
    } else {
      // revert by refetch
      refresh()
    }
  }

  const filteredSourceModules =
    pickerFilter === 'all'
      ? sourceModules
      : sourceModules.filter((m) => m.type === pickerFilter)

  const isStale = (m: PitchModuleSnapshot): boolean => {
    if (!m.moduleId || !m.sourceUpdatedAt) return false
    const source = sourceModules.find((s) => s.id === m.moduleId)
    if (!source) return false
    return new Date(source.updatedAt).getTime() > new Date(m.sourceUpdatedAt).getTime()
  }

  const sourceMissing = (m: PitchModuleSnapshot): boolean => {
    if (!m.moduleId) return false
    return !sourceModules.find((s) => s.id === m.moduleId)
  }

  return (
    <AdminShell>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <a href="/admin/pitches" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>
            ← Alle Pitches
          </a>
        </div>
        <h1 className={styles.pageTitle}>{pitch.clientCompany}</h1>
        <div className={styles.pageSub}>
          {pitch.occasion || 'Pitch'}
          {' · '}
          <span className={styles.tag}>{STATUS_LABELS[pitch.status]}</span>
          {' · '}
          <a
            href={`/p/${pitch.slug}`}
            target="_blank"
            rel="noopener"
            style={{ color: '#FF1900', textDecoration: 'none' }}
          >
            /p/{pitch.slug} <IconExternalLink size={11} color="#FF1900" />
          </a>
        </div>
      </div>

      {/* === METADATEN === */}
      <div className={styles.card} style={{ padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16 }}>Metadaten</h3>
        {metaError && <div className={styles.formError}>{metaError}</div>}
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Kundenfirma</label>
            <input
              className={styles.formInput}
              value={meta.clientCompany}
              onChange={(e) => setMeta((m) => ({ ...m, clientCompany: e.target.value }))}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Anlass</label>
            <input
              className={styles.formInput}
              value={meta.occasion}
              onChange={(e) => setMeta((m) => ({ ...m, occasion: e.target.value }))}
              placeholder="z.B. Erstgespräch"
            />
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Pulpmedia-Kontakt</label>
            <select
              className={styles.formInput}
              value={meta.contactSlug}
              onChange={(e) => setMeta((m) => ({ ...m, contactSlug: e.target.value }))}
            >
              {contacts.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                  {c.role ? ` — ${c.role}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Status</label>
            <select
              className={styles.formInput}
              value={meta.status}
              onChange={(e) =>
                setMeta((m) => ({ ...m, status: e.target.value as Pitch['status'] }))
              }
            >
              <option value="DRAFT">Entwurf</option>
              <option value="SENT">Versendet</option>
              <option value="ARCHIVED">Archiv</option>
            </select>
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>URL-Slug</label>
          <input
            className={styles.formInput}
            value={meta.slug}
            onChange={(e) => setMeta((m) => ({ ...m, slug: e.target.value }))}
          />
          {meta.slug !== pitch.slug && (
            <div className={styles.formHint} style={{ color: '#c0392b' }}>
              Achtung: Die alte URL <code>/p/{pitch.slug}</code> funktioniert
              nach dem Speichern nicht mehr.
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={saveMeta}
            disabled={metaSaving}
          >
            {metaSaving ? 'Speichert …' : 'Metadaten speichern'}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={copyLink}
          >
            {copied ? (
              <>
                <IconCheck size={14} color="#22c55e" /> Kopiert
              </>
            ) : (
              <>
                <IconLink size={14} /> Kunden-Link kopieren
              </>
            )}
          </button>
          <a
            className={`${styles.btn} ${styles.btnSecondary}`}
            href={`/p/${pitch.slug}`}
            target="_blank"
            rel="noopener"
          >
            <IconEye size={14} /> Öffnen
          </a>
        </div>
      </div>

      {/* === MODULES === */}
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>
          Module ({sortedModules.length})
        </div>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => setPickerOpen(true)}
        >
          <IconPlus size={14} /> Modul hinzufügen
        </button>
      </div>

      <div className={styles.card}>
        {sortedModules.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyText}>
              Noch keine Module. Klick rechts oben auf &quot;Modul
              hinzufügen&quot; und such dir was aus dem Pool, oder leg einen
              Custom-Block für genau diese Pitch an.
            </div>
          </div>
        )}

        {sortedModules.map((m, idx) => {
          const stale = isStale(m)
          const missing = sourceMissing(m)
          return (
            <div
              key={m.instanceId}
              draggable
              onDragStart={onDragStart(idx)}
              onDragOver={onDragOver(idx)}
              onDrop={onDrop(idx)}
              onDragEnd={() => setDragIdx(null)}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: 16,
                alignItems: 'center',
                padding: '14px 20px',
                borderBottom: '1px solid #eee',
                background: dragIdx === idx ? '#fff5f3' : 'transparent',
                cursor: 'grab',
              }}
            >
              <div
                style={{
                  width: 24,
                  textAlign: 'center',
                  color: '#bbb',
                  fontSize: 16,
                  userSelect: 'none',
                }}
                title="Ziehen zum Sortieren"
              >
                ⋮⋮
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <strong>{m.name}</strong>
                  <span className={styles.tag}>
                    {PITCH_MODULE_LABELS[m.type] || m.type}
                  </span>
                  {!m.moduleId && (
                    <span
                      className={styles.tag}
                      style={{ background: '#fff5e6', color: '#c47d00' }}
                    >
                      Custom
                    </span>
                  )}
                  {stale && (
                    <span
                      className={styles.tag}
                      style={{ background: '#fff0ed', color: '#c52a00' }}
                    >
                      Aktualisierung verfügbar
                    </span>
                  )}
                  {missing && (
                    <span
                      className={styles.tag}
                      style={{ background: '#eee', color: '#666' }}
                      title="Das Quellmodul wurde gelöscht"
                    >
                      Quelle entfernt
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  Position {idx + 1}
                </div>
              </div>
              <div className={styles.actions}>
                {stale && (
                  <button
                    className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                    onClick={() => refreshInstance(m.instanceId)}
                    title="Inhalt von der Quelle übernehmen"
                  >
                    Aktualisieren
                  </button>
                )}
                <button
                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                  onClick={() => openEditModule(m)}
                  title="Inhalt bearbeiten"
                >
                  <IconEdit size={14} />
                </button>
                <button
                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall} ${styles.btnDanger}`}
                  onClick={() => removeInstance(m.instanceId)}
                  title="Entfernen"
                >
                  <IconTrash size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* === PICKER MODAL === */}
      {pickerOpen && (
        <div className={styles.modalOverlay} onClick={() => setPickerOpen(false)}>
          <div
            className={styles.modal}
            style={{ maxWidth: 720 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Modul hinzufügen</h2>
              <button
                className={styles.modalClose}
                onClick={() => setPickerOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className={styles.filterBar} style={{ margin: '0 24px' }}>
              <button
                className={`${styles.filterTab} ${pickerTab === 'global' ? styles.filterTabActive : ''}`}
                onClick={() => setPickerTab('global')}
              >
                Aus dem Pool
              </button>
              <button
                className={`${styles.filterTab} ${pickerTab === 'custom' ? styles.filterTabActive : ''}`}
                onClick={() => setPickerTab('custom')}
              >
                Custom-Block
              </button>
            </div>
            <div className={styles.modalBody}>
              {pickerTab === 'global' && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Filter nach Typ</label>
                    <select
                      className={styles.formInput}
                      value={pickerFilter}
                      onChange={(e) =>
                        setPickerFilter(e.target.value as PitchModuleType | 'all')
                      }
                    >
                      <option value="all">Alle Typen</option>
                      {PITCH_MODULE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {PITCH_MODULE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ maxHeight: 400, overflow: 'auto', marginTop: 8 }}>
                    {filteredSourceModules.length === 0 && (
                      <div className={styles.emptyState}>
                        <div className={styles.emptyText}>
                          Keine Module im Pool.{' '}
                          <a
                            href="/admin/modules"
                            style={{ color: '#FF1900', textDecoration: 'none' }}
                          >
                            Erstes Modul anlegen →
                          </a>
                        </div>
                      </div>
                    )}
                    {filteredSourceModules.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr auto',
                          gap: 12,
                          alignItems: 'center',
                          padding: '12px 0',
                          borderBottom: '1px solid #f0f0f0',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong>{m.name}</strong>
                            <span className={styles.tag}>
                              {PITCH_MODULE_LABELS[m.type] || m.type}
                            </span>
                          </div>
                          {m.description && (
                            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                              {m.description}
                            </div>
                          )}
                        </div>
                        <button
                          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                          onClick={() => addFromGlobal(m.id)}
                        >
                          Hinzufügen
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {pickerTab === 'custom' && (
                <>
                  {customError && (
                    <div className={styles.formError}>{customError}</div>
                  )}
                  <div
                    className={styles.formGroup}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
                  >
                    <div>
                      <label className={styles.formLabel}>Modul-Typ</label>
                      <select
                        className={styles.formInput}
                        value={customDraft.type}
                        onChange={(e) => {
                          const newType = e.target.value as PitchModuleType
                          setCustomDraft((d) => ({
                            ...d,
                            type: newType,
                            contentJson: JSON.stringify(
                              DEFAULT_CONTENT[newType],
                              null,
                              2
                            ),
                          }))
                        }}
                        style={SELECT_DROPDOWN_STYLE}
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
                        value={customDraft.name}
                        onChange={(e) =>
                          setCustomDraft((d) => ({ ...d, name: e.target.value }))
                        }
                        placeholder="z.B. Was wir für euch sehen"
                      />
                    </div>
                  </div>

                  {showsStandardHeader(customDraft.type) && (
                    <StandardHeaderFields
                      contentJson={customDraft.contentJson}
                      onChange={(json) =>
                        setCustomDraft((d) => ({ ...d, contentJson: json }))
                      }
                    />
                  )}

                  {customDraft.type === 'team' && (
                    <TeamFields
                      contentJson={customDraft.contentJson}
                      onChange={(json) =>
                        setCustomDraft((d) => ({ ...d, contentJson: json }))
                      }
                    />
                  )}
                  {customDraft.type === 'love-brands' && (
                    <LoveBrandFields
                      contentJson={customDraft.contentJson}
                      onChange={(json) =>
                        setCustomDraft((d) => ({ ...d, contentJson: json }))
                      }
                    />
                  )}
                  {(() => {
                    const platforms = casePlatformsFor(customDraft.type)
                    if (!platforms) return null
                    return (
                      <CaseEmbedField
                        contentJson={customDraft.contentJson}
                        onChange={(json) =>
                          setCustomDraft((d) => ({ ...d, contentJson: json }))
                        }
                        allowedPlatforms={platforms}
                      />
                    )
                  })()}

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      {customDraft.type === 'team'
                        ? 'Inhalt (JSON, Quelle der Wahrheit)'
                        : 'Inhalt (JSON)'}
                    </label>
                    <textarea
                      className={styles.formInput}
                      rows={12}
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                      value={customDraft.contentJson}
                      onChange={(e) =>
                        setCustomDraft((d) => ({ ...d, contentJson: e.target.value }))
                      }
                    />
                    <div className={styles.formHint}>
                      Custom-Blöcke werden nur in diesem Slidedeck verwendet und
                      landen nicht im globalen Pool.
                    </div>
                    <SchemaHelp type={customDraft.type} />
                  </div>
                </>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setPickerOpen(false)}
              >
                Schließen
              </button>
              {pickerTab === 'custom' && (
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  onClick={addCustom}
                  disabled={customSaving}
                >
                  {customSaving ? 'Lege an …' : 'Custom-Block einfügen'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === MODULE CONTENT EDITOR === */}
      {editingModule && (
        <div className={styles.modalOverlay} onClick={() => setEditingModule(null)}>
          <div
            className={styles.modal}
            style={{ maxWidth: 760 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Modul bearbeiten</h2>
              <button
                className={styles.modalClose}
                onClick={() => setEditingModule(null)}
              >
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              {editError && <div className={styles.formError}>{editError}</div>}
              <div className={styles.formHint} style={{ marginBottom: 12 }}>
                Du bearbeitest den Snapshot dieses Slidedecks. Änderungen wirken
                sich nicht auf das globale Modul aus.
              </div>
              <div
                className={styles.formGroup}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
              >
                <div>
                  <label className={styles.formLabel}>Modul-Typ</label>
                  <input
                    className={styles.formInput}
                    value={PITCH_MODULE_LABELS[editingModule.type] || editingModule.type}
                    disabled
                    style={{ background: '#f5f5f5', color: '#666' }}
                  />
                </div>
                <div>
                  <label className={styles.formLabel}>Bezeichnung</label>
                  <input
                    className={styles.formInput}
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
              </div>

              {showsStandardHeader(editingModule.type) && (
                <StandardHeaderFields
                  contentJson={editForm.contentJson}
                  onChange={(json) =>
                    setEditForm((f) => ({ ...f, contentJson: json }))
                  }
                />
              )}

              {editingModule.type === 'love-brands' && (
                <LoveBrandFields
                  contentJson={editForm.contentJson}
                  onChange={(json) =>
                    setEditForm((f) => ({ ...f, contentJson: json }))
                  }
                />
              )}
              {editingModule.type === 'team' && (
                <TeamFields
                  contentJson={editForm.contentJson}
                  onChange={(json) =>
                    setEditForm((f) => ({ ...f, contentJson: json }))
                  }
                />
              )}
              {(() => {
                const platforms = casePlatformsFor(editingModule.type)
                if (!platforms) return null
                return (
                  <CaseEmbedField
                    contentJson={editForm.contentJson}
                    onChange={(json) =>
                      setEditForm((f) => ({ ...f, contentJson: json }))
                    }
                    allowedPlatforms={platforms}
                  />
                )
              })()}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  {editingModule.type === 'team'
                    ? 'Inhalt (JSON, Quelle der Wahrheit)'
                    : 'Inhalt (JSON)'}
                </label>
                <textarea
                  className={styles.formInput}
                  rows={16}
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                  value={editForm.contentJson}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, contentJson: e.target.value }))
                  }
                />
                <SchemaHelp type={editingModule.type} />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setEditingModule(null)}
                disabled={editSaving}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={saveModuleEdit}
                disabled={editSaving}
              >
                {editSaving ? 'Speichert …' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
