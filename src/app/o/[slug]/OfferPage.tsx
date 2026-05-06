'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Offer, Contact, Reference, Channel } from '@prisma/client'
import type {
  HeroSection, UnderstandingSection, ServicesSection,
  PackagesSection, AddOnItem, TimelineSection, StatItem, LegalSection,
} from '@/lib/types'
import styles from './offer.module.css'

type OfferWithContact = Offer & { contact: Contact }

interface OfferPageProps {
  offer: OfferWithContact
  references: Reference[]
  channels: Channel[]
  mode: 'view' | 'edit'
}

export function OfferPage({ offer: initialOffer, references: initialRefs, channels: initialChannels, mode }: OfferPageProps) {
  // Saved state (from server)
  const [savedOffer, setSavedOffer] = useState(initialOffer)
  // Local draft state (edited in-browser, instant)
  const [draft, setDraft] = useState(initialOffer)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // All available references and channels (for picker)
  const [allReferences, setAllReferences] = useState<Reference[]>([])
  const [allChannels, setAllChannels] = useState<Channel[]>([])
  const [pickerOpen, setPickerOpen] = useState<'references' | 'channels' | null>(null)
  const [timelineHidden, setTimelineHidden] = useState(
    !!((initialOffer.timeline as unknown as TimelineSection)?.hidden)
  )
  const [channelsHidden, setChannelsHidden] = useState(!!initialOffer.channelsHidden)
  const [dragChIdx, setDragChIdx] = useState<number | null>(null)

  const isEdit = mode === 'edit'

  // Load all available refs/channels once
  useEffect(() => {
    if (!isEdit) return
    fetch('/api/references').then(r => r.json()).then(setAllReferences)
    fetch('/api/channels').then(r => r.json()).then(setAllChannels)
  }, [isEdit])

  // Parse JSON sections from draft
  const hero = (draft.hero as unknown as HeroSection) || { title: '', subtitle: '' }
  const understanding = (draft.understanding as unknown as UnderstandingSection) || null
  const services = (draft.services as unknown as ServicesSection) || null
  const packages = (draft.packages as unknown as PackagesSection) || null
  const timeline = (draft.timeline as unknown as TimelineSection) || null
  const stats = (draft.stats as unknown as StatItem[]) || []
  const legal = (draft.legal as unknown as LegalSection) || null

  // References/channels shown: use draft IDs to filter allReferences
  const displayRefs = isEdit
    ? allReferences.filter(r => (draft.referenceIds || []).includes(r.id))
    : initialRefs
  const displayChannels = isEdit
    ? allChannels.filter(c => (draft.channelIds || []).includes(c.id))
    : initialChannels

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  // Update a field in the local draft (instant, no API call)
  const updateDraft = useCallback((field: string, value: unknown) => {
    setDraft(prev => ({ ...prev, [field]: value } as OfferWithContact))
    setDirty(true)
  }, [])

  // SAVE: send all changed fields to API
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      // Collect changed fields
      const changes: Record<string, unknown> = { changedBy: 'editor' }
      const fields = ['clientName', 'clientCompany', 'projectName', 'offerNumber', 'hero', 'understanding', 'services', 'packages', 'timeline', 'stats', 'legal', 'referenceIds', 'channelIds', 'channelsHidden', 'channelsHeadline'] as const
      for (const f of fields) {
        if (JSON.stringify(draft[f]) !== JSON.stringify(savedOffer[f])) {
          changes[f] = draft[f]
        }
      }

      if (Object.keys(changes).length <= 1) {
        // Only changedBy, nothing actually changed
        setDirty(false)
        setSaving(false)
        return
      }

      const res = await fetch(`/api/offers/${draft.id}?edit=${draft.editToken}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      if (res.ok) {
        const updated = await res.json()
        setSavedOffer(updated)
        setDraft(updated)
        setDirty(false)
        showToast('Gespeichert!')
      } else {
        showToast('Fehler beim Speichern')
      }
    } catch {
      showToast('Netzwerkfehler')
    }
    setSaving(false)
  }, [draft, savedOffer, showToast])

  // CANCEL: revert to saved state
  const handleCancel = useCallback(() => {
    setDraft(savedOffer)
    setDirty(false)
    showToast('Änderungen verworfen')
  }, [savedOffer, showToast])

  const formatDate = (d: string | Date | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString('de-AT', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return null
    return new Intl.NumberFormat('de-AT', {
      style: 'currency', currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(price)
  }

  // Editable text helper — writes to local draft only
  const Editable = ({ value, onSave, tag = 'span', className = '' }: {
    value: string
    onSave: (newVal: string) => void
    tag?: string
    className?: string
  }) => {
    if (!isEdit) {
      const Tag = tag as keyof JSX.IntrinsicElements
      return <Tag className={className}>{value}</Tag>
    }
    return (
      <div
        role="textbox"
        className={`${className} ${styles.editable}`}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const newVal = e.currentTarget.textContent || ''
          if (newVal !== value) onSave(newVal)
        }}
      >
        {value}
      </div>
    )
  }

  // Add button
  const AddButton = ({ label, onClick }: { label: string; onClick: () => void }) => {
    if (!isEdit) return null
    return (
      <button className={styles.addBtn} onClick={onClick} type="button">
        + {label}
      </button>
    )
  }

  // Remove button
  const RemoveButton = ({ onClick }: { onClick: () => void }) => {
    if (!isEdit) return null
    return (
      <button
        className={styles.removeBtn}
        onClick={(e) => { e.stopPropagation(); onClick() }}
        type="button"
        title="Entfernen"
      >
        &times;
      </button>
    )
  }

  // Toggle reference (local)
  const toggleReference = (refId: string) => {
    const current = draft.referenceIds || []
    const updated = current.includes(refId)
      ? current.filter((id: string) => id !== refId)
      : [...current, refId]
    updateDraft('referenceIds', updated)
  }

  // Toggle channel (local)
  const toggleChannel = (chId: string) => {
    const current = draft.channelIds || []
    const updated = current.includes(chId)
      ? current.filter((id: string) => id !== chId)
      : [...current, chId]
    updateDraft('channelIds', updated)
  }

  // Drag-and-drop for reference reordering
  const [dragRefIdx, setDragRefIdx] = useState<number | null>(null)
  const handleRefDragStart = (idx: number) => setDragRefIdx(idx)
  const handleRefDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragRefIdx === null || dragRefIdx === idx) return
    const ids = [...(draft.referenceIds || [])]
    const [moved] = ids.splice(dragRefIdx, 1)
    ids.splice(idx, 0, moved)
    updateDraft('referenceIds', ids)
    setDragRefIdx(idx)
  }
  const handleRefDragEnd = () => setDragRefIdx(null)

  // Drag-and-drop for channels
  const handleChDragStart = (idx: number) => setDragChIdx(idx)
  const handleChDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragChIdx === null || dragChIdx === idx) return
    const ids = [...(draft.channelIds || [])]
    const [moved] = ids.splice(dragChIdx, 1)
    ids.splice(idx, 0, moved)
    updateDraft('channelIds', ids)
    setDragChIdx(idx)
  }
  const handleChDragEnd = () => setDragChIdx(null)

  // Drag-and-drop for services
  const [dragSvcIdx, setDragSvcIdx] = useState<number | null>(null)
  const handleSvcDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragSvcIdx === null || dragSvcIdx === idx || !services) return
    const items = [...services.items]
    const [moved] = items.splice(dragSvcIdx, 1)
    items.splice(idx, 0, moved)
    updateDraft('services', { ...services, items })
    setDragSvcIdx(idx)
  }

  // Drag-and-drop for package features
  const [dragFeature, setDragFeature] = useState<{ pkg: number; idx: number } | null>(null)
  const handleFeatureDragOver = (e: React.DragEvent, pkgIdx: number, featureIdx: number) => {
    e.preventDefault()
    if (!dragFeature || dragFeature.pkg !== pkgIdx || dragFeature.idx === featureIdx) return
    const items = [...packages!.items]
    const features = [...items[pkgIdx].features]
    const [moved] = features.splice(dragFeature.idx, 1)
    features.splice(featureIdx, 0, moved)
    items[pkgIdx] = { ...items[pkgIdx], features }
    updateDraft('packages', { ...packages!, items })
    setDragFeature({ pkg: pkgIdx, idx: featureIdx })
  }

  // Social network icon SVGs (Pulpmedia red)
  const ChannelIcon = ({ platform }: { platform: string }) => {
    const color = '#FF1900'
    const size = 16
    const svgProps = { width: size, height: size, viewBox: '0 0 24 24', fill: color, style: { flexShrink: 0 } as React.CSSProperties }
    switch (platform?.toLowerCase()) {
      case 'instagram':
        return <svg {...svgProps}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
      case 'facebook':
        return <svg {...svgProps}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      case 'linkedin':
        return <svg {...svgProps}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
      case 'youtube':
        return <svg {...svgProps}><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
      case 'tiktok':
        return <svg {...svgProps}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
      default:
        return <svg {...svgProps} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
    }
  }

  return (
    <div className={styles.page}>
      {/* Edit banner with Save/Cancel */}
      {isEdit && (
        <div className={styles.editBanner}>
          <span className={styles.editBannerText}>
            ✏️ Editor-Modus
          </span>
          {dirty && (
            <div className={styles.editActions}>
              <button
                className={styles.cancelBtn}
                onClick={handleCancel}
                disabled={saving}
                type="button"
              >
                Abbrechen
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving}
                type="button"
              >
                {saving ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          )}
          {!dirty && (
            <span className={styles.editSaved}>Alle Änderungen gespeichert</span>
          )}
        </div>
      )}

      {/* Status bar */}
      {isEdit && (
        <div className={styles.statusBar}>
          <span className={styles.statusLabel}>Status:</span>
          <select
            className={styles.statusSelect}
            value={draft.status}
            onChange={async (e) => {
              const newStatus = e.target.value
              // Update status via the status API
              await fetch(`/api/offers/${draft.id}/status?edit=${draft.editToken}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
              })
              setDraft(prev => ({ ...prev, status: newStatus as typeof prev.status }))
              setSavedOffer(prev => ({ ...prev, status: newStatus as typeof prev.status }))
              showToast(`Status → ${newStatus}`)
            }}
          >
            <option value="DRAFT">DRAFT</option>
            <option value="PRICED">PRICED</option>
            <option value="ACCEPTED">ACCEPTED</option>
          </select>
          <span className={styles.statusHint}>
            {draft.status === 'DRAFT' && 'Optionen ohne Preise – Projekt wird besprochen'}
            {draft.status === 'PRICED' && 'Preise sichtbar – Kunde entscheidet'}
            {draft.status === 'ACCEPTED' && 'Kunde hat sich entschieden'}
          </span>
          <button
            className={styles.copyLinkBtn}
            onClick={() => {
              const url = `${window.location.origin}/o/${draft.slug}`
              navigator.clipboard.writeText(url)
              showToast('Kundenlink kopiert!')
            }}
            type="button"
          >
            🔗 Kundenlink kopieren
          </button>
        </div>
      )}

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroTop}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pulp-logo.svg" alt="Pulpmedia" className={styles.logoImg} />
            <div className={styles.heroMeta}>
              <Editable
                tag="strong"
                className=""
                value={draft.offerNumber || `Angebot ${draft.slug}`}
                onSave={(v) => updateDraft('offerNumber', v)}
              />
              <br />
              {formatDate(draft.createdAt)}<br />
              {draft.validUntil && <>Gültig bis {formatDate(draft.validUntil)}</>}
            </div>
          </div>
          <div className={styles.sectionTag}>Angebot</div>
          <Editable
            tag="h1"
            className={styles.heroTitle}
            value={hero.title}
            onSave={(v) => updateDraft('hero', { ...hero, title: v })}
          />
          <Editable
            tag="p"
            className={styles.heroSubtitle}
            value={hero.subtitle}
            onSave={(v) => updateDraft('hero', { ...hero, subtitle: v })}
          />
          <div className={styles.heroInfo}>
            <div className={styles.heroInfoItem}>
              <label>Kunde</label>
              <Editable
                tag="span"
                className=""
                value={draft.clientCompany}
                onSave={(v) => updateDraft('clientCompany', v)}
              />
            </div>
            <div className={styles.heroInfoItem}>
              <label>Projekt</label>
              <Editable
                tag="span"
                className=""
                value={draft.projectName}
                onSave={(v) => updateDraft('projectName', v)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* PROJEKTVERSTÄNDNIS */}
      {(understanding || isEdit) && (
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionTag}>Projektverständnis</div>
            <Editable
              tag="h2"
              className={styles.sectionHeadline}
              value={understanding?.headline || 'Headline hier eingeben'}
              onSave={(v) => updateDraft('understanding', { ...(understanding || { headline: '', text: '', cards: [] }), headline: v })}
            />
            <Editable
              tag="p"
              className={styles.bodyText}
              value={understanding?.text || 'Beschreibung hier eingeben'}
              onSave={(v) => updateDraft('understanding', { ...(understanding || { headline: '', text: '', cards: [] }), text: v })}
            />
            {(understanding?.cards || []).length > 0 && (
              <div className={styles.cardsGrid}>
                {understanding!.cards.map((card, i) => (
                  <div key={i} className={styles.card}>
                    <RemoveButton onClick={() => {
                      const cards = understanding!.cards.filter((_, idx) => idx !== i)
                      updateDraft('understanding', { ...understanding!, cards })
                    }} />
                    <Editable
                      tag="h3"
                      className={styles.cardTitle}
                      value={card.title}
                      onSave={(v) => {
                        const cards = [...understanding!.cards]
                        cards[i] = { ...cards[i], title: v }
                        updateDraft('understanding', { ...understanding!, cards })
                      }}
                    />
                    <Editable
                      tag="p"
                      className={styles.cardText}
                      value={card.text}
                      onSave={(v) => {
                        const cards = [...understanding!.cards]
                        cards[i] = { ...cards[i], text: v }
                        updateDraft('understanding', { ...understanding!, cards })
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            <AddButton label="Karte hinzufügen" onClick={() => {
              const cards = [...(understanding?.cards || []), { title: 'Neue Karte', text: 'Beschreibung' }]
              updateDraft('understanding', { ...(understanding || { headline: '', text: '' }), cards })
            }} />
          </div>
        </section>
      )}

      <hr className={styles.divider} />

      {/* LEISTUNGSÜBERSICHT */}
      {(services || isEdit) && (
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionTag}>Leistungsübersicht</div>
            <Editable
              tag="h2"
              className={styles.sectionHeadline}
              value={services?.headline || 'Leistungen'}
              onSave={(v) => updateDraft('services', { ...(services || { headline: '', items: [] }), headline: v })}
            />
            {(services?.items || []).map((item, i) => (
              <div
                key={i}
                className={`${styles.serviceItem} ${isEdit ? styles.serviceItemDraggable : ''} ${dragSvcIdx === i ? styles.serviceItemDragging : ''}`}
                draggable={isEdit}
                onDragStart={isEdit ? () => setDragSvcIdx(i) : undefined}
                onDragOver={isEdit ? (e) => handleSvcDragOver(e, i) : undefined}
                onDragEnd={isEdit ? () => setDragSvcIdx(null) : undefined}
              >
                <div className={styles.serviceNumber}>{String(i + 1).padStart(2, '0')}</div>
                <div className={styles.serviceContent}>
                  <RemoveButton onClick={() => {
                    const items = services!.items.filter((_, idx) => idx !== i)
                    updateDraft('services', { ...services!, items })
                  }} />
                  <Editable
                    tag="h3"
                    className={styles.serviceTitle}
                    value={item.title}
                    onSave={(v) => {
                      const items = [...services!.items]
                      items[i] = { ...items[i], title: v }
                      updateDraft('services', { ...services!, items })
                    }}
                  />
                  <Editable
                    tag="p"
                    className={styles.serviceDesc}
                    value={item.description}
                    onSave={(v) => {
                      const items = [...services!.items]
                      items[i] = { ...items[i], description: v }
                      updateDraft('services', { ...services!, items })
                    }}
                  />
                  {isEdit ? (
                    <button
                      className={`${styles.optionalToggle} ${item.optional ? styles.optionalToggleActive : ''}`}
                      onClick={() => {
                        const items = [...services!.items]
                        items[i] = { ...items[i], optional: !items[i].optional }
                        updateDraft('services', { ...services!, items })
                      }}
                      type="button"
                    >
                      {item.optional ? '✓ Optional' : 'Als optional markieren'}
                    </button>
                  ) : (
                    item.optional && <span className={styles.optionalBadge}>Optional</span>
                  )}
                </div>
              </div>
            ))}
            <AddButton label="Leistung hinzufügen" onClick={() => {
              const items = [...(services?.items || []), { title: 'Neue Leistung', description: 'Beschreibung der Leistung', optional: false }]
              updateDraft('services', { ...(services || { headline: 'Leistungen' }), items })
            }} />
          </div>
        </section>
      )}

      {/* PAKETE */}
      {(packages || isEdit) && (
        <section className={styles.packagesBg}>
          <div className={styles.container}>
            <div className={styles.sectionTag}>Pakete</div>
            {packages?.intro && (
              <Editable
                tag="h2"
                className={styles.sectionHeadline}
                value="Wählt das Paket, das zu euch passt"
                onSave={() => {}}
              />
            )}
            {packages?.intro && (
              <Editable
                tag="p"
                className={styles.packagesIntro}
                value={packages.intro}
                onSave={(v) => updateDraft('packages', { ...packages, intro: v })}
              />
            )}
            <div className={styles.packagesGrid}>
              {(packages?.items || []).map((pkg, i) => (
                <div key={i} className={`${styles.package} ${pkg.highlighted || i === 1 ? styles.recommended : ''}`}>
                  <RemoveButton onClick={() => {
                    const items = packages!.items.filter((_, idx) => idx !== i)
                    updateDraft('packages', { ...packages!, items })
                  }} />
                  <Editable
                    tag="div"
                    className={styles.packageName}
                    value={pkg.name}
                    onSave={(v) => {
                      const items = [...packages!.items]
                      items[i] = { ...items[i], name: v }
                      updateDraft('packages', { ...packages!, items })
                    }}
                  />
                  {draft.status !== 'DRAFT' && pkg.price !== null ? (
                    <>
                      {isEdit ? (
                        <div className={styles.packagePrice}>
                          <input
                            type="number"
                            className={styles.priceInput}
                            value={pkg.price || ''}
                            onChange={(e) => {
                              const items = [...packages!.items]
                              items[i] = { ...items[i], price: e.target.value ? Number(e.target.value) : null }
                              updateDraft('packages', { ...packages!, items })
                            }}
                            placeholder="0"
                          />
                          <span className={styles.priceCurrency}>€</span>
                        </div>
                      ) : (
                        <div className={styles.packagePrice}>{formatPrice(pkg.price)}</div>
                      )}
                      <div className={styles.packageVat}>zzgl. 20% USt.</div>
                    </>
                  ) : draft.status === 'DRAFT' ? (
                    <>
                      {isEdit && (
                        <div className={styles.draftPriceHint}>
                          Preis wird sichtbar wenn Status → PRICED
                        </div>
                      )}
                      {!isEdit && (
                        <div className={styles.draftBadge}>
                          Preis nach gemeinsamer Abstimmung
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {isEdit ? (
                        <div className={styles.packagePrice}>
                          <input
                            type="number"
                            className={styles.priceInput}
                            value={''}
                            onChange={(e) => {
                              const items = [...packages!.items]
                              items[i] = { ...items[i], price: e.target.value ? Number(e.target.value) : null }
                              updateDraft('packages', { ...packages!, items })
                            }}
                            placeholder="Preis eingeben"
                          />
                          <span className={styles.priceCurrency}>€</span>
                        </div>
                      ) : (
                        <div className={styles.packagePriceHidden}>Auf Anfrage</div>
                      )}
                    </>
                  )}
                  <Editable
                    tag="p"
                    className={styles.packageDesc}
                    value={pkg.description}
                    onSave={(v) => {
                      const items = [...packages!.items]
                      items[i] = { ...items[i], description: v }
                      updateDraft('packages', { ...packages!, items })
                    }}
                  />
                  <ul className={styles.packageFeatures}>
                    {pkg.features.map((f, fi) => (
                      <li
                        key={fi}
                        className={`${f.included ? '' : styles.featureExcluded} ${isEdit ? styles.featureDraggable : ''} ${dragFeature?.pkg === i && dragFeature?.idx === fi ? styles.featureDragging : ''}`}
                        draggable={isEdit}
                        onDragStart={isEdit ? () => setDragFeature({ pkg: i, idx: fi }) : undefined}
                        onDragOver={isEdit ? (e) => handleFeatureDragOver(e, i, fi) : undefined}
                        onDragEnd={isEdit ? () => setDragFeature(null) : undefined}
                      >
                        {isEdit && (
                          <button
                            className={styles.toggleFeatureBtn}
                            onClick={() => {
                              const items = [...packages!.items]
                              const features = [...items[i].features]
                              features[fi] = { ...features[fi], included: !features[fi].included }
                              items[i] = { ...items[i], features }
                              updateDraft('packages', { ...packages!, items })
                            }}
                            type="button"
                            title={f.included ? 'Als nicht enthalten markieren' : 'Als enthalten markieren'}
                          >
                            {f.included ? '✓' : '✗'}
                          </button>
                        )}
                        {!isEdit && (
                          <span className={f.included ? styles.featureCheck : styles.featureCross}>
                            {f.included ? '✓' : '✗'}
                          </span>
                        )}
                        <Editable
                          tag="span"
                          className={styles.featureText}
                          value={f.text}
                          onSave={(v) => {
                            const items = [...packages!.items]
                            const features = [...items[i].features]
                            features[fi] = { ...features[fi], text: v }
                            items[i] = { ...items[i], features }
                            updateDraft('packages', { ...packages!, items })
                          }}
                        />
                        {isEdit && (
                          <button
                            className={styles.removeFeatureBtn}
                            onClick={() => {
                              const items = [...packages!.items]
                              const features = items[i].features.filter((_, idx) => idx !== fi)
                              items[i] = { ...items[i], features }
                              updateDraft('packages', { ...packages!, items })
                            }}
                            type="button"
                          >&times;</button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {isEdit && (
                    <div className={styles.packageActions}>
                      <button
                        className={styles.addFeatureBtn}
                        onClick={() => {
                          const items = [...packages!.items]
                          items[i] = { ...items[i], features: [...items[i].features, { text: 'Neues Feature', included: true }] }
                          updateDraft('packages', { ...packages!, items })
                        }}
                        type="button"
                      >+ Feature</button>
                      {packages!.items.length > 1 && (
                        <select
                          className={styles.copyFeaturesSelect}
                          value=""
                          onChange={(e) => {
                            const sourceIdx = parseInt(e.target.value, 10)
                            if (isNaN(sourceIdx)) return
                            const items = [...packages!.items]
                            const sourceFeatures = items[sourceIdx].features.map(f => ({ ...f }))
                            items[i] = { ...items[i], features: sourceFeatures }
                            updateDraft('packages', { ...packages!, items })
                          }}
                        >
                          <option value="">Features kopieren von...</option>
                          {packages!.items.map((p, pi) => pi !== i ? (
                            <option key={pi} value={pi}>{p.name}</option>
                          ) : null)}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <AddButton label="Paket hinzufügen" onClick={() => {
              const items = [...(packages?.items || []), {
                name: 'NEUES PAKET',
                description: 'Beschreibung',
                price: null,
                features: [{ text: 'Feature 1', included: true }]
              }]
              updateDraft('packages', { ...(packages || { intro: '', showPrices: false }), items })
            }} />

            {/* ADD-ONS */}
            {(isEdit || (!packages?.addOnsHidden && (packages?.addOns || []).length > 0)) && (
              <>
                <div className={styles.addOnsHeader}>
                  <h3 className={styles.addOnsHeadline}>Optionale Add-Ons</h3>
                  {isEdit && (
                    <button
                      className={styles.sectionToggleBtn}
                      onClick={() => {
                        const newHidden = !packages?.addOnsHidden
                        updateDraft('packages', { ...packages!, addOnsHidden: newHidden })
                      }}
                      type="button"
                    >
                      {packages?.addOnsHidden ? '👁 Einblenden' : '👁 Ausblenden'}
                    </button>
                  )}
                </div>
                {(!isEdit || !packages?.addOnsHidden) && (
                  <>
                    <p className={styles.addOnsIntro}>Zu jedem Paket flexibel dazubuchbar.</p>
                    <div className={styles.addOnsGrid}>
                      {(packages?.addOns || []).map((addon: AddOnItem, ai: number) => (
                        <div key={ai} className={styles.addOnCard}>
                          <RemoveButton onClick={() => {
                            const addOns = (packages?.addOns || []).filter((_: AddOnItem, idx: number) => idx !== ai)
                            updateDraft('packages', { ...packages!, addOns })
                          }} />
                          <Editable
                            tag="div"
                            className={styles.addOnName}
                            value={addon.name}
                            onSave={(v) => {
                              const addOns = [...(packages?.addOns || [])]
                              addOns[ai] = { ...addOns[ai], name: v }
                              updateDraft('packages', { ...packages!, addOns })
                            }}
                          />
                          {draft.status !== 'DRAFT' && addon.price !== null ? (
                            <>
                              {isEdit ? (
                                <div className={styles.addOnPrice}>
                                  <input
                                    type="number"
                                    className={styles.priceInput}
                                    value={addon.price || ''}
                                    onChange={(e) => {
                                      const addOns = [...(packages?.addOns || [])]
                                      addOns[ai] = { ...addOns[ai], price: e.target.value ? Number(e.target.value) : null }
                                      updateDraft('packages', { ...packages!, addOns })
                                    }}
                                    placeholder="0"
                                  />
                                  <span className={styles.priceCurrency}>€</span>
                                </div>
                              ) : (
                                <div className={styles.addOnPrice}>{formatPrice(addon.price)}</div>
                              )}
                              <div className={styles.packageVat}>zzgl. 20% USt.</div>
                            </>
                          ) : draft.status === 'DRAFT' ? (
                            isEdit ? (
                              <div className={styles.draftPriceHint}>Preis bei PRICED sichtbar</div>
                            ) : (
                              <div className={styles.draftBadge}>Preis auf Anfrage</div>
                            )
                          ) : (
                            isEdit ? (
                              <div className={styles.addOnPrice}>
                                <input
                                  type="number"
                                  className={styles.priceInput}
                                  value={''}
                                  onChange={(e) => {
                                    const addOns = [...(packages?.addOns || [])]
                                    addOns[ai] = { ...addOns[ai], price: e.target.value ? Number(e.target.value) : null }
                                    updateDraft('packages', { ...packages!, addOns })
                                  }}
                                  placeholder="Preis eingeben"
                                />
                                <span className={styles.priceCurrency}>€</span>
                              </div>
                            ) : (
                              <div className={styles.packagePriceHidden}>Auf Anfrage</div>
                            )
                          )}
                          <Editable
                            tag="p"
                            className={styles.addOnDesc}
                            value={addon.description}
                            onSave={(v) => {
                              const addOns = [...(packages?.addOns || [])]
                              addOns[ai] = { ...addOns[ai], description: v }
                              updateDraft('packages', { ...packages!, addOns })
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    {isEdit && (
                      <AddButton label="Add-On hinzufügen" onClick={() => {
                        const addOns = [...(packages?.addOns || []), { name: 'Neues Add-On', description: 'Beschreibung', price: null }]
                        updateDraft('packages', { ...packages!, addOns })
                      }} />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {/* ABLAUF */}
      {(timeline || isEdit) && (isEdit || !timeline?.hidden) && (
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionTag}>
              Ablauf
              {isEdit && (
                <button
                  className={styles.sectionToggleBtn}
                  onClick={() => {
                    const newHidden = !timelineHidden
                    setTimelineHidden(newHidden)
                    updateDraft('timeline', { ...(timeline || { headline: '', steps: [] }), hidden: newHidden })
                  }}
                  type="button"
                >
                  {timelineHidden ? '👁 Einblenden' : '👁 Ausblenden'}
                </button>
              )}
            </div>
            {(!isEdit || !timelineHidden) && (
              <>
                <Editable
                  tag="h2"
                  className={styles.sectionHeadline}
                  value={timeline?.headline || 'So läuft das Projekt ab'}
                  onSave={(v) => updateDraft('timeline', { ...(timeline || { headline: '', steps: [] }), headline: v })}
                />
                <div className={styles.timelineTrack}>
                  {(timeline?.steps || []).map((step, i) => (
                    <div key={i} className={styles.timelineStep}>
                      <RemoveButton onClick={() => {
                        const steps = timeline!.steps.filter((_, idx) => idx !== i)
                        updateDraft('timeline', { ...timeline!, steps })
                      }} />
                      {isEdit ? (
                        <div
                          className={`${styles.timelineIcon} ${styles.timelineIconEditable}`}
                          onClick={() => {
                            const emoji = prompt('Emoji für diesen Schritt:', step.icon || '📌')
                            if (emoji !== null) {
                              const steps = [...timeline!.steps]
                              steps[i] = { ...steps[i], icon: emoji }
                              updateDraft('timeline', { ...timeline!, steps })
                            }
                          }}
                          title="Klicken zum Ändern"
                        >{step.icon || '📌'}</div>
                      ) : (
                        <div className={styles.timelineIcon}>{step.icon || '📌'}</div>
                      )}
                      <Editable
                        tag="h4"
                        className={styles.timelineLabel}
                        value={step.label}
                        onSave={(v) => {
                          const steps = [...timeline!.steps]
                          steps[i] = { ...steps[i], label: v }
                          updateDraft('timeline', { ...timeline!, steps })
                        }}
                      />
                      <Editable
                        tag="span"
                        className={styles.timelineTime}
                        value={step.timeframe}
                        onSave={(v) => {
                          const steps = [...timeline!.steps]
                          steps[i] = { ...steps[i], timeframe: v }
                          updateDraft('timeline', { ...timeline!, steps })
                        }}
                      />
                    </div>
                  ))}
                </div>
                <AddButton label="Schritt hinzufügen" onClick={() => {
                  const steps = [...(timeline?.steps || []), { label: 'Neuer Schritt', timeframe: 'Woche X', icon: '📌' }]
                  updateDraft('timeline', { ...(timeline || { headline: 'So läuft das Projekt ab' }), steps })
                }} />
              </>
            )}
          </div>
        </section>
      )}

      <hr className={styles.divider} />

      {/* WARUM PULPMEDIA */}
      {(stats.length > 0 || isEdit) && (
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionTag}>Warum Pulpmedia</div>
            <h2 className={styles.sectionHeadline}>Zahlen, die für sich sprechen</h2>
            <div className={styles.statsGrid}>
              {stats.map((stat, i) => (
                <div key={i} className={styles.statCard}>
                  <RemoveButton onClick={() => {
                    const newStats = stats.filter((_, idx) => idx !== i)
                    updateDraft('stats', newStats)
                  }} />
                  <Editable
                    tag="div"
                    className={styles.statNumber}
                    value={stat.number}
                    onSave={(v) => {
                      const newStats = [...stats]
                      newStats[i] = { ...newStats[i], number: v }
                      updateDraft('stats', newStats)
                    }}
                  />
                  <Editable
                    tag="div"
                    className={styles.statLabel}
                    value={stat.label}
                    onSave={(v) => {
                      const newStats = [...stats]
                      newStats[i] = { ...newStats[i], label: v }
                      updateDraft('stats', newStats)
                    }}
                  />
                  <Editable
                    tag="div"
                    className={styles.statDetail}
                    value={stat.detail}
                    onSave={(v) => {
                      const newStats = [...stats]
                      newStats[i] = { ...newStats[i], detail: v }
                      updateDraft('stats', newStats)
                    }}
                  />
                </div>
              ))}
            </div>
            <AddButton label="Kennzahl hinzufügen" onClick={() => {
              const newStats = [...stats, { number: '0+', label: 'Label', detail: 'Detail' }]
              updateDraft('stats', newStats)
            }} />
          </div>
        </section>
      )}

      <hr className={styles.divider} />

      {/* REFERENZEN */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionTag}>Ausgewählte Referenzen</div>
          <h2 className={styles.sectionHeadline}>Projekte, die begeistern</h2>

          {isEdit && (
            <div className={styles.pickerToggle}>
              <button
                className={styles.pickerBtn}
                onClick={() => setPickerOpen(pickerOpen === 'references' ? null : 'references')}
                type="button"
              >
                {pickerOpen === 'references' ? '▼' : '►'} Referenzen auswählen ({(draft.referenceIds || []).length} gewählt)
              </button>
              {pickerOpen === 'references' && (
                <div className={styles.pickerPanel}>
                  {allReferences.map((ref) => (
                    <label key={ref.id} className={styles.pickerItem}>
                      <input
                        type="checkbox"
                        checked={(draft.referenceIds || []).includes(ref.id)}
                        onChange={() => toggleReference(ref.id)}
                      />
                      <span>{ref.name}</span>
                      <span className={styles.pickerDetail}>{ref.tags.join(', ')}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {displayRefs.length > 0 && (
            <div className={styles.refsGrid}>
              {displayRefs.map((ref, refIdx) => {
                const refUrl = (ref as Reference & { url?: string }).url
                const cardClass = `${styles.refCard} ${isEdit ? styles.refCardDraggable : ''} ${!isEdit && refUrl ? styles.refCardClickable : ''} ${dragRefIdx === refIdx ? styles.refCardDragging : ''}`
                const inner = (
                  <>
                    <div className={styles.refImage}>
                      {ref.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ref.imageUrl} alt={ref.name} className={styles.refImageImg} />
                      ) : (
                        <span>{ref.name}</span>
                      )}
                    </div>
                    <div className={styles.refInfo}>
                      <div className={styles.sectionTag}>{ref.name}</div>
                      <h3>{ref.description}</h3>
                      <p>{ref.tags.join(' / ')}</p>
                    </div>
                    {isEdit && <div className={styles.dragHandle}>⠿</div>}
                  </>
                )
                if (!isEdit && refUrl) {
                  return (
                    <a key={ref.id} href={refUrl} target="_blank" rel="noopener" className={cardClass}>
                      {inner}
                    </a>
                  )
                }
                return (
                  <div
                    key={ref.id}
                    className={cardClass}
                    draggable={isEdit}
                    onDragStart={() => handleRefDragStart(refIdx)}
                    onDragOver={(e) => handleRefDragOver(e, refIdx)}
                    onDragEnd={handleRefDragEnd}
                  >
                    {inner}
                  </div>
                )
              })}
            </div>
          )}
          {displayRefs.length === 0 && isEdit && (
            <p className={styles.emptyHint}>Noch keine Referenzen zugeordnet. Klicke oben auf &quot;Referenzen auswählen&quot;.</p>
          )}
        </div>
      </section>

      {/* KANÄLE */}
      {(displayChannels.length > 0 || isEdit) && (isEdit || !channelsHidden) && (
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionTag}>
            Kanäle, die wir betreuen
            {isEdit && (
              <button
                className={styles.sectionToggleBtn}
                onClick={() => {
                  const newHidden = !channelsHidden
                  setChannelsHidden(newHidden)
                  updateDraft('channelsHidden', newHidden)
                }}
                type="button"
              >
                {channelsHidden ? '👁 Einblenden' : '👁 Ausblenden'}
              </button>
            )}
          </div>
          {(!isEdit || !channelsHidden) && (
            <>
              <Editable
                tag="h2"
                className={styles.sectionHeadline}
                value={draft.channelsHeadline || 'Wo Markenliebe lebt'}
                onSave={(v) => updateDraft('channelsHeadline', v)}
              />

              {isEdit && (
                <div className={styles.pickerToggle}>
                  <button
                    className={styles.pickerBtn}
                    onClick={() => setPickerOpen(pickerOpen === 'channels' ? null : 'channels')}
                    type="button"
                  >
                    {pickerOpen === 'channels' ? '▼' : '►'} Kanäle auswählen ({(draft.channelIds || []).length} gewählt)
                  </button>
                  {pickerOpen === 'channels' && (
                    <div className={styles.pickerPanel}>
                      <label className={styles.pickerItem} style={{ fontWeight: 600, borderBottom: '1px solid #eee', paddingBottom: 6, marginBottom: 4 }}>
                        <input
                          type="checkbox"
                          checked={allChannels.length > 0 && allChannels.every(ch => (draft.channelIds || []).includes(ch.id))}
                          onChange={() => {
                            const allSelected = allChannels.every(ch => (draft.channelIds || []).includes(ch.id))
                            updateDraft('channelIds', allSelected ? [] : allChannels.map(ch => ch.id))
                          }}
                        />
                        <span>Alle auswählen</span>
                      </label>
                      {allChannels.map((ch) => (
                        <label key={ch.id} className={styles.pickerItem}>
                          <input
                            type="checkbox"
                            checked={(draft.channelIds || []).includes(ch.id)}
                            onChange={() => toggleChannel(ch.id)}
                          />
                          <span>{ch.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {displayChannels.length > 0 && (
                <div className={styles.channelsRow}>
                  {displayChannels.map((ch, chIdx) => {
                    const tagClass = `${styles.channelTag} ${isEdit ? styles.channelTagDraggable : ''} ${dragChIdx === chIdx ? styles.channelTagDragging : ''}`
                    const icon = ChannelIcon({ platform: ch.platform })
                    return isEdit ? (
                      <div
                        key={ch.id}
                        className={tagClass}
                        draggable
                        onDragStart={() => handleChDragStart(chIdx)}
                        onDragOver={(e) => handleChDragOver(e, chIdx)}
                        onDragEnd={handleChDragEnd}
                      >
                        {icon}
                        {ch.name}
                      </div>
                    ) : (
                      <a key={ch.id} href={ch.url} target="_blank" rel="noopener" className={styles.channelTag}>
                        {icon}
                        {ch.name}
                      </a>
                    )
                  })}
                </div>
              )}
              {displayChannels.length === 0 && isEdit && (
                <p className={styles.emptyHint}>Noch keine Kanäle zugeordnet. Klicke oben auf &quot;Kanäle auswählen&quot;.</p>
              )}
            </>
          )}
        </div>
      </section>
      )}

      {/* CTA + CONTACT */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <Editable
            tag="h2"
            className={styles.ctaHeadline}
            value={hero.ctaHeadline || 'Welche Option zündet?'}
            onSave={(v) => updateDraft('hero', { ...hero, ctaHeadline: v })}
          />
          <Editable
            tag="p"
            className={styles.ctaText}
            value={hero.ctaText || 'Lass uns in einem kurzen Gespräch die Details besprechen und den Projektstart planen.'}
            onSave={(v) => updateDraft('hero', { ...hero, ctaText: v })}
          />
          <div className={styles.contactCard}>
            {draft.contact.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.contact.avatarUrl}
                alt={draft.contact.name}
                className={styles.contactAvatarImg}
              />
            ) : (
              <div className={styles.contactAvatar}>
                {draft.contact.name.split(' ').map(n => n[0]).join('')}
              </div>
            )}
            <div className={styles.contactInfo}>
              <h3>{draft.contact.name}</h3>
              <div className={styles.contactRole}>{draft.contact.role} · Pulpmedia</div>
              <div className={styles.contactLinks}>
                <span>Tel</span>{' '}
                <a href={`tel:${draft.contact.phone}`}>{draft.contact.phone}</a>
                <span>Mail</span>{' '}
                <a href={`mailto:${draft.contact.email}`}>{draft.contact.email}</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LEGAL */}
      <section className={styles.legalSection}>
        <div className={styles.container}>
          {legal?.paymentTerms && (
            <p><strong>Zahlungskonditionen:</strong> {legal.paymentTerms}</p>
          )}
          <p><strong>AGB:</strong> Es gelten die Allgemeinen Geschäftsbedingungen der Pulpmedia GmbH: <a href="https://pulpmedia.at/AGB">pulpmedia.at/AGB</a></p>
          <p><strong>Datenschutz:</strong> Die Datenschutzerklärung der Pulpmedia GmbH wird zur Kenntnis genommen: <a href="https://pulpmedia.at/Datenschutz">pulpmedia.at/Datenschutz</a></p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          Pulpmedia GmbH · Linzer Straße 1, 4040 Linz · Keisslergasse 1-3, 1140 Wien · IBAN: AT91 1500 0006 1112 0783 · UID: ATU62936737 · FN 284945M
        </div>
      </footer>

      {/* TOAST */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
