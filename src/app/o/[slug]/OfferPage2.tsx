'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Offer, Contact, Reference, Channel } from '@prisma/client'
import type {
  HeroSection, UnderstandingSection, ServicesSection,
  PackagesSection, TimelineSection, StatItem, LegalSection,
} from '@/lib/types'
import styles from './offer2.module.css'

type OfferWithContact = Offer & { contact: Contact }

interface OfferPage2Props {
  offer: OfferWithContact
  references: Reference[]
  channels: Channel[]
  mode: 'view' | 'edit'
}

export function OfferPage2({ offer: initialOffer, references: initialRefs, channels: initialChannels, mode }: OfferPage2Props) {
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

  // Scroll animations
  useEffect(() => {
    const els = document.querySelectorAll(`.${rev}`)
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = parseInt((entry.target as HTMLElement).dataset.delay || '0')
          setTimeout(() => entry.target.classList.add(styles.visible), delay)
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' })
    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Parse JSON sections from draft
  const hero = (draft.hero as unknown as HeroSection) || { title: '', subtitle: '' }
  const understanding = (draft.understanding as unknown as UnderstandingSection) || null
  const services = (draft.services as unknown as ServicesSection) || null
  const packages = (draft.packages as unknown as PackagesSection) || null
  const timeline = (draft.timeline as unknown as TimelineSection) || null
  const stats = (draft.stats as unknown as StatItem[]) || []
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const legal = (draft.legal as unknown as LegalSection) || null

  // References/channels shown: ordered by their IDs array (preserves drag order)
  // In edit mode, fallback to initialRefs/initialChannels while allReferences/allChannels are loading
  const displayRefs = isEdit
    ? (draft.referenceIds || []).map(id =>
        allReferences.find(r => r.id === id) || initialRefs.find(r => r.id === id)
      ).filter(Boolean) as Reference[]
    : (initialOffer.referenceIds || []).map(id => initialRefs.find(r => r.id === id)).filter(Boolean) as Reference[]
  const displayChannels = isEdit
    ? (draft.channelIds || []).map(id =>
        allChannels.find(c => c.id === id) || initialChannels.find(c => c.id === id)
      ).filter(Boolean) as Channel[]
    : (initialOffer.channelIds || []).map(id => initialChannels.find(c => c.id === id)).filter(Boolean) as Channel[]

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

  // Helper function to render text with red markup (*word* → red)
  const renderRedMarkup = (text: string) => {
    if (!text) return ''
    const parts = text.split(/(\*[^*]+\*)/)
    return parts.map((part, i) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return <span key={i} style={{ color: '#FF1900' }}>{part.slice(1, -1)}</span>
      }
      return <span key={i}>{part}</span>
    })
  }

  // Helper function to render icons by name
  const renderIcon = (name: string | undefined, size?: number) => {
    void size // size reserved for future use
    switch (name) {
      case 'pixel_heart':
        return <PixelHeartIcon />
      case 'blume':
        return <BlummeIcon />
      case 'blitz':
        return <BlitzIcon />
      case 'smiley':
        return <SmileyIcon />
      case 'explosion':
        return <ExplosionIcon />
      case 'skull':
        return <SkullIcon />
      case 'horn_hand':
        return <HornHandIcon />
      default:
        return <PixelHeartIcon />
    }
  }

  // Editable text helper — writes to local draft only
  const Editable = ({ value, onSave, tag = 'span', className = '', style }: {
    value: string
    onSave: (newVal: string) => void
    tag?: string
    className?: string
    style?: React.CSSProperties
  }) => {
    if (!isEdit) {
      const Tag = tag as keyof JSX.IntrinsicElements
      return <Tag className={className} style={style}>{renderRedMarkup(value)}</Tag>
    }
    return (
      <div
        role="textbox"
        className={`${className} ${styles.editable}`}
        style={style}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const newVal = e.currentTarget.textContent || ''
          if (newVal !== value && newVal !== 'Klick zum Bearbeiten') onSave(newVal)
        }}
        onFocus={(e) => {
          if (!value) e.currentTarget.textContent = ''
        }}
      >
        {value || <span className={styles.editablePlaceholder}>Klick zum Bearbeiten</span>}
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
        🗑️
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
    setDraft(prev => {
      const ids = [...(prev.referenceIds || [])]
      const [moved] = ids.splice(dragRefIdx, 1)
      ids.splice(idx, 0, moved)
      return { ...prev, referenceIds: ids } as OfferWithContact
    })
    setDirty(true)
    setDragRefIdx(idx)
  }
  const handleRefDragEnd = () => setDragRefIdx(null)

  // Drag-and-drop for channels
  const handleChDragStart = (idx: number) => setDragChIdx(idx)
  const handleChDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragChIdx === null || dragChIdx === idx) return
    setDraft(prev => {
      const ids = [...(prev.channelIds || [])]
      const [moved] = ids.splice(dragChIdx, 1)
      ids.splice(idx, 0, moved)
      return { ...prev, channelIds: ids } as OfferWithContact
    })
    setDirty(true)
    setDragChIdx(idx)
  }
  const handleChDragEnd = () => setDragChIdx(null)

  // Compute dynamic section numbering based on visible sections
  let sectionNum = 0
  const sectionNumbers: Record<string, string> = {}
  // Understanding always shows in edit or if data exists
  if (understanding || isEdit) sectionNumbers.understanding = String(++sectionNum).padStart(2, '0')
  if (services || isEdit) sectionNumbers.services = String(++sectionNum).padStart(2, '0')
  if (packages || isEdit) sectionNumbers.packages = String(++sectionNum).padStart(2, '0')
  if ((timeline || isEdit) && !timelineHidden) sectionNumbers.timeline = String(++sectionNum).padStart(2, '0')
  if (stats.length > 0 || isEdit) sectionNumbers.stats = String(++sectionNum).padStart(2, '0')
  sectionNumbers.references = String(++sectionNum).padStart(2, '0')
  if ((displayChannels.length > 0 || isEdit) && !channelsHidden) sectionNumbers.channels = String(++sectionNum).padStart(2, '0')

  // In edit mode, skip reveal animation (opacity:0) so all elements are visible
  const rev = isEdit ? styles.revealEdit : styles.reveal

  // Drag-and-drop for services
  const [dragSvcIdx, setDragSvcIdx] = useState<number | null>(null)
  const handleSvcDragStart = (idx: number) => setDragSvcIdx(idx)
  const handleSvcDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragSvcIdx === null || dragSvcIdx === idx || !services) return
    const items = [...services.items]
    const [moved] = items.splice(dragSvcIdx, 1)
    items.splice(idx, 0, moved)
    updateDraft('services', { ...services, items })
    setDragSvcIdx(idx)
  }
  const handleSvcDragEnd = () => setDragSvcIdx(null)

  // Drag-and-drop for timeline
  const [dragTimeIdx, setDragTimeIdx] = useState<number | null>(null)
  const handleTimeDragStart = (idx: number) => setDragTimeIdx(idx)
  const handleTimeDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragTimeIdx === null || dragTimeIdx === idx) return
    setDraft(prev => {
      const tl = (prev.timeline as unknown as TimelineSection) || { headline: '', steps: [] }
      const steps = [...tl.steps]
      const [moved] = steps.splice(dragTimeIdx, 1)
      steps.splice(idx, 0, moved)
      return { ...prev, timeline: { ...tl, steps } as unknown } as OfferWithContact
    })
    setDirty(true)
    setDragTimeIdx(idx)
  }
  const handleTimeDragEnd = () => setDragTimeIdx(null)

  // Drag-and-drop for package features
  const [dragFeature, setDragFeature] = useState<{ pkg: number; idx: number } | null>(null)
  const handleFeatureDragStart = (pkg: number, idx: number) => setDragFeature({ pkg, idx })
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
  const handleFeatureDragEnd = () => setDragFeature(null)

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

  // SVG Icon Components
  const PixelHeartIcon = () => (
    <svg viewBox="0 0 50 50" width="60" height="60">
      <polygon fill="#FF1900" points="46.3 12.1 45.47 12.1 45.47 7.56 40.93 7.56 40.93 3.02 31.85 3.02 31.85 7.56 27.3 7.56 27.3 12.1 22.76 12.1 22.76 7.56 18.22 7.56 18.22 3.02 9.13 3.02 9.13 7.56 4.59 7.56 4.59 12.1 .04 12.1 .04 25.73 4.59 25.73 4.59 30.27 9.13 30.27 9.13 34.82 9.13 34.82 13.67 34.82 13.67 39.36 17.39 39.36 18.22 39.36 18.22 39.36 18.22 43.9 22.72 43.9 22.76 43.9 22.76 48.45 27.3 48.45 27.3 43.9 27.72 43.9 31.85 43.9 31.85 39.36 32.6 39.36 36.39 39.36 36.39 34.82 36.39 34.82 36.39 34.82 40.93 34.82 40.93 34.82 40.93 30.27 45.47 30.27 45.47 25.73 46.3 25.73 50.02 25.73 50.02 12.1 46.3 12.1"/>
    </svg>
  )

  const HornHandIcon = () => (
    <svg viewBox="0 0 50 50" width="80" height="80">
      <rect fill="#FF1900" x="26.27" y="19.17" width="0" height="0"/>
      <path fill="#FF1900" d="M37.79,1.47c-2.12,0-3.84,1.72-3.84,3.84h0v13.86c0-2.12-1.72-3.84-3.84-3.84s-3.84,1.77-3.84,3.89c0-.02,0-.03,0-.05h0c-.03-2.1-1.73-3.84-3.83-3.84s-3.83,1.73-3.84,3.84h0V3.82h0C18.6,1.7,16.88-.02,14.76-.02s-3.84,1.72-3.84,3.84V24.69c0-2.12-1.72-3.84-3.84-3.84s-3.84,1.72-3.84,3.84h0v7.68h0c0,4.06,3.16,7.35,7.15,7.62v.05h1.57c2.22,5.75,7.78,9.83,14.31,9.83,8.48,0,15.35-6.87,15.35-15.35V5.31h0c0-2.12-1.72-3.84-3.84-3.84Z"/>
    </svg>
  )

  const ExplosionIcon = () => (
    <svg viewBox="0 0 50 50" width="32" height="32">
      <path fill="#FF1900" d="M19.74,11.27L5.54,4.95l8.21,12.63L0,25.02l14.37,4.24L3.01,50.02l18.94-12.55,3.05,12.55,6.1-12.24,14.52,5.37-7.26-11.05,11.64-.63-9.43-6.45,9.43-4.91-9.11-1.89,7.58-11.36-11.99,5.68S37.73-.81,37.73,.02s-9.15,9.99-9.15,9.99L21-.02l-1.26,11.29Z"/>
    </svg>
  )

  const SkullIcon = () => (
    <svg viewBox="0 0 50 50" width="32" height="32">
      <path fill="#FF1900" d="M25,.12C14.01,.12,5.1,9.03,5.1,20.02v19.9H15.05v9.95h5.16v-9.91h2.55v9.91h4.68v-9.91h2.55v9.91h4.95v-9.95h9.95V20.02C44.9,9.03,35.99,.12,25,.12Zm-3.18,28.35H11.87c0-5.5,4.46-9.95,9.95-9.95v9.95Zm6.36,0v-9.95c5.5,0,9.95,4.45,9.95,9.95h-9.95Z"/>
    </svg>
  )

  const BlummeIcon = () => (
    <svg viewBox="0 0 50 50" width="36" height="36">
      <path fill="#FF1900" d="M17.42,24.94c0-4.19,3.39-7.58,7.58-7.58s7.58,3.39,7.58,7.58-3.39,7.58-7.58,7.58-7.58-3.39-7.58-7.58Zm13.17,22.84c1.74-1.92,2.44-5.13,2.1-9.52,3.63,2.49,6.65,3.46,9.19,2.93,1.93-.39,3.53-1.65,4.77-3.75,1.22-2.07,1.54-4.07,.93-5.93-.8-2.46-3.22-4.67-7.2-6.58,3.97-1.9,6.31-4.03,7.14-6.49,.62-1.87,.33-3.88-.86-6h0c-1.18-2.09-2.75-3.36-4.66-3.77-2.54-.54-5.66,.45-9.3,2.95,.34-4.39-.33-7.48-2.05-9.43C29.33,.72,27.44-.04,25.01-.06c-.04,0-.07,0-.11,0-2.35,0-4.2,.72-5.49,2.16-1.73,1.92-2.44,5.12-2.1,9.52-3.63-2.49-6.65-3.46-9.19-2.93-1.93,.39-3.53,1.65-4.77,3.75-1.22,2.07-1.54,4.07-.93,5.92,.8,2.46,3.22,4.67,7.2,6.58-3.97,1.9-6.31,4.03-7.14,6.49-.62,1.87-.33,3.88,.86,6,1.18,2.09,2.75,3.36,4.67,3.77,2.53,.54,5.66-.45,9.3-2.95-.34,4.39,.33,7.48,2.05,9.43,1.3,1.47,3.2,2.23,5.63,2.25,.04,0,.07,0,.11,0,2.35,0,4.2-.72,5.49-2.16Z"/>
    </svg>
  )

  const BlitzIcon = () => (
    <svg viewBox="0 0 50 50" width="36" height="36">
      <polygon fill="#FF1900" points="22.81 0 14.94 29.64 26.65 23.38 22.12 40.24 20 38.37 22.06 50 28.79 39.67 25.7 41.3 35.06 14.07 23.04 20.52 31.49 0 22.81 0"/>
    </svg>
  )

  const SmileyIcon = () => (
    <svg viewBox="0 0 50 50" width="36" height="36">
      <path fill="#FF1900" d="M25,0C11.19,0,0,11.19,0,25s11.19,25,25,25,25-11.19,25-25S38.81,0,25,0Zm-5.04,12.49c2.68,0,4.85,3.16,4.85,7.05s-2.17,7.05-4.85,7.05-4.85-3.16-4.85-7.05,2.17-7.05,4.85-7.05Zm16.71,24.24c-3.12,3.11-7.27,4.82-11.67,4.82-6.55,0-12.5-3.88-15.15-9.87-.19-.44,0-.95,.45-1.15,.44-.19,.95,0,1.15,.45,2.37,5.37,7.69,8.83,13.55,8.83,3.94,0,7.65-1.53,10.45-4.31,.34-.34,.89-.34,1.23,0,.34,.34,.34,.89,0,1.23Zm-1.53-10.14c-2.68,0-4.85-3.16-4.85-7.05s2.17-7.05,4.85-7.05,4.85,3.16,4.85,7.05-2.17,7.05-4.85,7.05Z"/>
    </svg>
  )

  const PulpmediaLogoWhite = () => (
    <svg viewBox="0 0 430 100" width="auto" height="24" fill="#ffffff">
      <path d="M110,0h50v50h25V0h25v100h-50c-27.6,0-50-22.4-50-50h0V0Z"/>
      <path d="M75,0H0v100h50v-50h25l25-25L75,0ZM18.6,40.4V9.7l18.4,15.4-18.4,15.4Z"/>
      <path d="M295,50h-25V0h-50v50c0,27.6,22.4,50,50,50h25l25-25-25-25ZM257,37.1h-24.1V13h24.1v24.1Z"/>
      <g>
        <path d="M356.6,71.8v5h5c0-2.7-2.2-5-5-5Z"/>
        <path d="M348.5,76.7h5v-5c-2.7,0-5,2.2-5,5Z"/>
        <path d="M405,0h-75v100h50v-50h25c13.8,0,25-11.2,25-25S418.8,0,405,0ZM365,82.4h-5v5h-2.5v-4.9h-1.3v4.9h-2.3v-4.9h-1.3v4.9h-2.6v-5h-5v-9.9c0-5.5,4.4-9.9,9.9-9.9s9.9,4.4,9.9,9.9v9.9Z"/>
      </g>
    </svg>
  )

  const PulpmediaLogoRed = () => (
    <svg viewBox="0 0 430 100" width="auto" height="28" fill="#FF1900">
      <path d="M110,0h50v50h25V0h25v100h-50c-27.6,0-50-22.4-50-50h0V0Z"/>
      <path d="M75,0H0v100h50v-50h25l25-25L75,0ZM18.6,40.4V9.7l18.4,15.4-18.4,15.4Z"/>
      <path d="M295,50h-25V0h-50v50c0,27.6,22.4,50,50,50h25l25-25-25-25ZM257,37.1h-24.1V13h24.1v24.1Z"/>
      <g>
        <path d="M356.6,71.8v5h5c0-2.7-2.2-5-5-5Z"/>
        <path d="M348.5,76.7h5v-5c-2.7,0-5,2.2-5,5Z"/>
        <path d="M405,0h-75v100h50v-50h25c13.8,0,25-11.2,25-25S418.8,0,405,0ZM365,82.4h-5v5h-2.5v-4.9h-1.3v4.9h-2.3v-4.9h-1.3v4.9h-2.6v-5h-5v-9.9c0-5.5,4.4-9.9,9.9-9.9s9.9,4.4,9.9,9.9v9.9Z"/>
      </g>
    </svg>
  )

  return (
    <div className={styles.page}>
      {/* Google Fonts Link */}
      <link href="https://fonts.googleapis.com/css2?family=Anton&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Status bar in edit mode */}
      {isEdit && (
        <div className={styles.statusBar} style={{ top: 0 }}>
          <div className={styles.statusLeft}>
            <span className={styles.statusLabel}>Status:</span>
            <select
              className={styles.statusSelect}
              value={draft.status}
              onChange={async (e) => {
                const newStatus = e.target.value
                await fetch(`/api/offers/${draft.id}/status?edit=${draft.editToken}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: newStatus }),
                })
                setDraft(prev => ({ ...prev, status: newStatus as typeof prev.status }))
                setSavedOffer(prev => ({ ...prev, status: newStatus as typeof prev.status }))
                showToast(`Status → ${newStatus}`)
              }}
              style={{ background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="PRICED">PRICED</option>
              <option value="ACCEPTED">ACCEPTED</option>
            </select>
            <span className={styles.statusVersion}>
              {draft.status === 'DRAFT' && 'Optionen ohne Preise'}
              {draft.status === 'PRICED' && 'Preise sichtbar'}
              {draft.status === 'ACCEPTED' && 'Kunde entschieden'}
            </span>
          </div>
          <div className={styles.statusRight}>
            <button
              className={styles.btnCancel}
              onClick={handleCancel}
              disabled={!dirty || saving}
              type="button"
            >
              Abbrechen
            </button>
            <button
              className={styles.btnSave}
              onClick={handleSave}
              disabled={!dirty || saving}
              type="button"
            >
              {saving ? 'Speichert...' : 'Speichern'}
            </button>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className={styles.nav} style={isEdit ? { top: '42px' } : undefined}>
        <div className={styles.navLeft}>
          <div className={styles.navLogo}>
            <PulpmediaLogoRed />
          </div>
          <span className={styles.navX}>×</span>
          <span className={styles.navClient}>{draft.clientCompany}</span>
        </div>
        <Editable
          tag="span"
          className={styles.navNumber}
          value={draft.offerNumber || `Angebot ${draft.slug}`}
          onSave={(v) => updateDraft('offerNumber', v)}
        />
      </nav>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={`${rev}`} data-delay="0">
          <div className={styles.heroIcon}>
            <PixelHeartIcon />
          </div>
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
          <div className={styles.heroMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Kunde</span>
              <Editable
                tag="span"
                className={styles.metaValue}
                value={draft.clientCompany}
                onSave={(v) => updateDraft('clientCompany', v)}
              />
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Projekt</span>
              <Editable
                tag="span"
                className={styles.metaValue}
                value={draft.projectName}
                onSave={(v) => updateDraft('projectName', v)}
              />
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Datum</span>
              <span className={styles.metaValue}>{formatDate(draft.createdAt)}</span>
            </div>
            {draft.validUntil && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Gültig bis</span>
                <span className={styles.metaValue}>{formatDate(draft.validUntil)}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* UNDERSTANDING */}
      {(understanding || isEdit) && (
        <section className={styles.section}>
          <div className={`${rev} ${styles.sectionLabel}`} data-delay="100">
            {sectionNumbers.understanding} — Kundenverständnis
          </div>
          <Editable
            tag="h2"
            className={`${styles.sectionHeadline} ${rev}`}
            value={understanding?.headline || 'Wir verstehen euer Geschäft'}
            onSave={(v) => updateDraft('understanding', { ...(understanding || { headline: '', text: '', cards: [] }), headline: v })}
          />
          <Editable
            tag="p"
            className={`${styles.understandingText} ${rev}`}
            value={understanding?.text || 'Beschreibung hier eingeben'}
            onSave={(v) => updateDraft('understanding', { ...(understanding || { headline: '', text: '', cards: [] }), text: v })}
          />
          {((understanding?.cards || []).length > 0 || isEdit) && (
            <div className={styles.understandingCards}>
              {(understanding?.cards || []).map((card, i) => (
                <div key={i} className={`${styles.understandingCard} ${rev}`} data-delay={100 + i * 50}>
                  {isEdit && (
                    <div className={styles.editToolbar}>
                      <button
                        className={styles.toolbarBtn}
                        onClick={() => {
                          const icons = ['pixel_heart', 'blume', 'blitz', 'smiley', 'explosion', 'skull', 'horn_hand']
                          const nextIcon = icons[(icons.indexOf(card.icon || 'pixel_heart') + 1) % icons.length]
                          const cards = [...understanding!.cards]
                          cards[i] = { ...cards[i], icon: nextIcon }
                          updateDraft('understanding', { ...understanding!, cards })
                        }}
                        type="button"
                        title="Icon wechseln"
                      >
                        🔄 Icon
                      </button>
                      <button
                        className={`${styles.toolbarBtn} ${styles.toolbarBtnDanger}`}
                        onClick={(e) => { e.stopPropagation(); const cards = understanding!.cards.filter((_, idx) => idx !== i); updateDraft('understanding', { ...understanding!, cards }) }}
                        type="button"
                        title="Entfernen"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                  <div className={styles.cardIcon}>
                    {renderIcon(card.icon || 'pixel_heart')}
                  </div>
                  <Editable
                    tag="h3"
                    className=""
                    value={card.title}
                    style={{ fontFamily: 'Anton', fontSize: '1.2rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}
                    onSave={(v) => {
                      const cards = [...understanding!.cards]
                      cards[i] = { ...cards[i], title: v }
                      updateDraft('understanding', { ...understanding!, cards })
                    }}
                  />
                  <Editable
                    tag="p"
                    className=""
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
        </section>
      )}

      {/* SERVICES */}
      {(services || isEdit) && (
        <section className={styles.section}>
          <div className={`${rev} ${styles.sectionLabel}`} data-delay="0">
            {sectionNumbers.services} — Leistungsübersicht
          </div>
          <Editable
            tag="h2"
            className={`${styles.sectionHeadline} ${rev}`}
            value={services?.headline || 'Leistungen'}
            onSave={(v) => updateDraft('services', { ...(services || { headline: '', items: [] }), headline: v })}
          />
          <div className={styles.servicesGrid}>
            {(services?.items || []).map((item, i) => (
              <div
                key={i}
                className={`${styles.serviceItem} ${rev} ${isEdit ? styles.serviceItemDraggable : ''} ${dragSvcIdx === i ? styles.serviceItemDragging : ''}`}
                data-delay={100 + i * 50}
                draggable={isEdit}
                onDragStart={isEdit ? () => handleSvcDragStart(i) : undefined}
                onDragOver={isEdit ? (e) => handleSvcDragOver(e, i) : undefined}
                onDragEnd={isEdit ? handleSvcDragEnd : undefined}
              >
                <div className={styles.serviceNumber}>{String(i + 1).padStart(2, '0')}</div>
                <div style={{ flex: 1 }}>
                  <RemoveButton onClick={() => {
                    const items = services!.items.filter((_, idx) => idx !== i)
                    updateDraft('services', { ...services!, items })
                  }} />
                  <Editable
                    tag="h3"
                    className=""
                    value={item.title}
                    style={{ fontFamily: 'Anton', fontSize: '1.1rem', textTransform: 'uppercase', marginBottom: '0.3rem' }}
                    onSave={(v) => {
                      const items = [...services!.items]
                      items[i] = { ...items[i], title: v }
                      updateDraft('services', { ...services!, items })
                    }}
                  />
                  <Editable
                    tag="p"
                    className=""
                    value={item.description}
                    onSave={(v) => {
                      const items = [...services!.items]
                      items[i] = { ...items[i], description: v }
                      updateDraft('services', { ...services!, items })
                    }}
                  />
                  {isEdit && (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', marginTop: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={!!item.optional}
                        onChange={() => {
                          const items = [...services!.items]
                          items[i] = { ...items[i], optional: !items[i].optional }
                          updateDraft('services', { ...services!, items })
                        }}
                      />
                      Optional
                    </label>
                  )}
                  {!isEdit && item.optional && <span className={styles.serviceOptional}>Optional</span>}
                </div>
              </div>
            ))}
          </div>
          <AddButton label="Leistung hinzufügen" onClick={() => {
            const items = [...(services?.items || []), { title: 'Neue Leistung', description: 'Beschreibung', optional: false }]
            updateDraft('services', { ...(services || { headline: 'Leistungen' }), items })
          }} />
        </section>
      )}

      {/* PACKAGES */}
      {(packages || isEdit) && (
        <section className={styles.packagesBg}>
          <div className={styles.section}>
            <div className={`${rev} ${styles.sectionLabel}`} data-delay="0">
              {sectionNumbers.packages} — Pakete
            </div>
            <Editable
              tag="h2"
              className={`${styles.sectionHeadline} ${rev}`}
              value={packages?.headline || 'Wählt das Paket, das zu euch passt'}
              onSave={(v) => updateDraft('packages', { ...(packages || { headline: '', items: [], intro: '' }), headline: v })}
            />
            {packages?.intro && (
              <Editable
                tag="p"
                className={`${styles.packagesIntro} ${rev}`}
                value={packages.intro}
                onSave={(v) => updateDraft('packages', { ...packages, intro: v })}
              />
            )}
            <div className={styles.packagesGrid}>
              {(packages?.items || []).map((pkg, i) => (
                <div key={i} className={`${styles.packageCard} ${rev}`} data-delay={100 + i * 100}>
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
                      <div className={styles.packagePrice}>
                        {isEdit ? (
                          <input
                            type="number"
                            value={pkg.price || ''}
                            onChange={(e) => {
                              const items = [...packages!.items]
                              items[i] = { ...items[i], price: e.target.value ? Number(e.target.value) : null }
                              updateDraft('packages', { ...packages!, items })
                            }}
                            placeholder="0"
                            style={{ background: '#222', color: '#FF1900', border: '1px solid rgba(255,25,0,0.2)', padding: '0.3rem', fontSize: '1.5rem', width: '100%' }}
                          />
                        ) : (
                          <>{formatPrice(pkg.price)}</>
                        )}
                      </div>
                      <div className={styles.packageVat}>zzgl. 20% USt.</div>
                    </>
                  ) : draft.status === 'DRAFT' ? (
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>
                      Preis wird sichtbar bei Status PRICED
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>
                      Auf Anfrage
                    </div>
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
                      <li key={fi} className={f.included ? '' : styles.featureNotIncluded} draggable={isEdit} onDragStart={isEdit ? () => handleFeatureDragStart(i, fi) : undefined} onDragOver={isEdit ? (e) => handleFeatureDragOver(e, i, fi) : undefined} onDragEnd={isEdit ? handleFeatureDragEnd : undefined}>
                        {isEdit ? (
                          <button onClick={() => {
                            const items = [...packages!.items]
                            const features = [...items[i].features]
                            features[fi] = { ...features[fi], included: !features[fi].included }
                            items[i] = { ...items[i], features }
                            updateDraft('packages', { ...packages!, items })
                          }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF1900', marginRight: '0.4rem' }}>
                            {f.included ? '✓' : '✗'}
                          </button>
                        ) : (
                          <span className={f.included ? styles.featureCheck : styles.featureNotIncluded}>{f.included ? '✓' : '✗'}</span>
                        )}
                        <Editable tag="span" className="" value={f.text} onSave={(v) => {
                          const items = [...packages!.items]
                          const features = [...items[i].features]
                          features[fi] = { ...features[fi], text: v }
                          items[i] = { ...items[i], features }
                          updateDraft('packages', { ...packages!, items })
                        }} />
                        {isEdit && <button onClick={() => {
                          const items = [...packages!.items]
                          const features = items[i].features.filter((_, idx) => idx !== fi)
                          items[i] = { ...items[i], features }
                          updateDraft('packages', { ...packages!, items })
                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>×</button>}
                      </li>
                    ))}
                  </ul>
                  {isEdit && (
                    <button onClick={() => {
                      const items = [...packages!.items]
                      items[i] = { ...items[i], features: [...items[i].features, { text: 'Neues Feature', included: true }] }
                      updateDraft('packages', { ...packages!, items })
                    }} style={{ background: 'transparent', color: '#FF1900', border: '1px solid #FF1900', padding: '0.5rem 1rem', marginTop: '1rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                      + Feature
                    </button>
                  )}
                </div>
              ))}
            </div>
            <AddButton label="Paket hinzufügen" onClick={() => {
              const items = [...(packages?.items || []), {
                name: 'NEUES PAKET',
                description: 'Beschreibung',
                price: null,
                features: [{ text: 'Feature 1', included: true }],
              }]
              updateDraft('packages', { ...(packages || { headline: '', items: [], intro: '' }), items })
            }} />

            {/* ADD-ONS */}
            {(isEdit || (!packages?.addOnsHidden && (packages?.addOns || []).length > 0)) && (
              <>
                <div style={{ marginTop: '4rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className={styles.addOnsHeadline}>Optionale Add-Ons</h3>
                  {isEdit && (
                    <button onClick={() => {
                      const newHidden = !packages?.addOnsHidden
                      updateDraft('packages', { ...packages!, addOnsHidden: newHidden })
                    }} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                      {packages?.addOnsHidden ? '👁 Einblenden' : '👁 Ausblenden'}
                    </button>
                  )}
                </div>
                {(!isEdit || !packages?.addOnsHidden) && (
                  <>
                    <p style={{ fontSize: '1.05rem', fontWeight: 300, color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>Zu jedem Paket flexibel dazubuchbar.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                      {(packages?.addOns || []).map((addon, ai) => (
                        <div key={ai} style={{ background: '#222222', border: '1px solid rgba(255,255,255,0.06)', padding: '2rem', position: 'relative' }}>
                          <RemoveButton onClick={() => {
                            const addOns = (packages?.addOns || []).filter((_, idx) => idx !== ai)
                            updateDraft('packages', { ...packages!, addOns })
                          }} />
                          <Editable tag="div" className="" value={addon.name} onSave={(v) => {
                            const addOns = [...(packages?.addOns || [])]
                            addOns[ai] = { ...addOns[ai], name: v }
                            updateDraft('packages', { ...packages!, addOns })
                          }} style={{ fontFamily: 'Anton', fontSize: '1.2rem', textTransform: 'uppercase', marginBottom: '0.5rem' }} />
                          {draft.status !== 'DRAFT' && addon.price !== null ? (
                            <>
                              <div style={{ fontSize: '1rem', color: '#FF1900', marginBottom: '0.3rem' }}>
                                {isEdit ? (
                                  <input type="number" value={addon.price || ''} onChange={(e) => {
                                    const addOns = [...(packages?.addOns || [])]
                                    addOns[ai] = { ...addOns[ai], price: e.target.value ? Number(e.target.value) : null }
                                    updateDraft('packages', { ...packages!, addOns })
                                  }} placeholder="0" style={{ background: '#222', color: '#FF1900', border: '1px solid rgba(255,25,0,0.2)', padding: '0.3rem', width: '100%' }} />
                                ) : formatPrice(addon.price)}
                              </div>
                              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>zzgl. 20% USt.</div>
                            </>
                          ) : draft.status === 'DRAFT' ? (
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>Preis bei Status PRICED</div>
                          ) : (
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>Auf Anfrage</div>
                          )}
                          <Editable tag="p" className="" value={addon.description} onSave={(v) => {
                            const addOns = [...(packages?.addOns || [])]
                            addOns[ai] = { ...addOns[ai], description: v }
                            updateDraft('packages', { ...packages!, addOns })
                          }} style={{ fontSize: '0.8rem', fontWeight: 300, color: 'rgba(255,255,255,0.6)' }} />
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

      {/* TIMELINE */}
      {(timeline || isEdit) && (!timelineHidden || isEdit) && (
        <section className={styles.section} style={isEdit && timelineHidden ? { opacity: 0.4 } : undefined}>
          <div className={`${rev} ${styles.sectionLabel}`} data-delay="0">
            {sectionNumbers.timeline || '—'} — Ablauf {isEdit && timelineHidden && '(ausgeblendet)'}
            {isEdit && (
              <button onClick={() => {
                const newHidden = !timelineHidden
                setTimelineHidden(newHidden)
                updateDraft('timeline', { ...(timeline || { headline: '', steps: [] }), hidden: newHidden })
              }} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', fontSize: '0.75rem', marginLeft: '1rem' }}>
                {timelineHidden ? '👁 Einblenden' : '👁 Ausblenden'}
              </button>
            )}
          </div>
          <Editable tag="h2" className={`${styles.sectionHeadline} ${rev}`} value={timeline?.headline || 'So läuft das Projekt ab'} onSave={(v) => updateDraft('timeline', { ...(timeline || { headline: '', steps: [] }), headline: v })} />
          <div className={styles.timelineSteps}>
            {(timeline?.steps || []).map((step, i) => (
              <div key={i} className={`${styles.timelineStep} ${rev}`} data-delay={100 + i * 100} draggable={isEdit} onDragStart={isEdit ? () => handleTimeDragStart(i) : undefined} onDragOver={isEdit ? (e) => handleTimeDragOver(e, i) : undefined} onDragEnd={isEdit ? handleTimeDragEnd : undefined}>
                <div className={styles.timelineLeft}>
                  <div className={styles.timelineNumber}>{String(i + 1).padStart(2, '0')}</div>
                  <Editable tag="span" className={styles.timelineTimeframe} value={step.timeframe} onSave={(v) => {
                    const steps = [...timeline!.steps]
                    steps[i] = { ...steps[i], timeframe: v }
                    updateDraft('timeline', { ...timeline!, steps })
                  }} />
                </div>
                <div className={styles.timelineRight}>
                  <Editable tag="h3" className="" value={step.label} style={{ fontFamily: 'Anton', fontSize: '1.2rem', textTransform: 'uppercase' }} onSave={(v) => {
                    const steps = [...timeline!.steps]
                    steps[i] = { ...steps[i], label: v }
                    updateDraft('timeline', { ...timeline!, steps })
                  }} />
                  {(step.description || isEdit) && (
                    <Editable tag="p" className="" value={step.description || ''} onSave={(v) => {
                      const steps = [...timeline!.steps]
                      steps[i] = { ...steps[i], description: v }
                      updateDraft('timeline', { ...timeline!, steps })
                    }} />
                  )}
                </div>
                <RemoveButton onClick={() => {
                  const steps = timeline!.steps.filter((_, idx) => idx !== i)
                  updateDraft('timeline', { ...timeline!, steps })
                }} />
              </div>
            ))}
          </div>
          <AddButton label="Schritt hinzufügen" onClick={() => {
            const steps = [...(timeline?.steps || []), { label: 'Neuer Schritt', timeframe: 'Woche X', description: 'Beschreibung' }]
            updateDraft('timeline', { ...(timeline || { headline: '' }), steps })
          }} />
        </section>
      )}

      {/* STATS */}
      {(stats.length > 0 || isEdit) && (
        <section className={styles.section}>
          <div className={`${rev} ${styles.sectionLabel}`} data-delay="0">
            {sectionNumbers.stats} — Warum Pulpmedia
          </div>
          <Editable
            tag="h2"
            className={`${styles.sectionHeadline} ${rev}`}
            value="Zahlen, die für sich sprechen"
            onSave={() => {}}
          />
          <div className={styles.statsGrid}>
            {stats.map((stat, i) => (
              <div key={i} className={`${styles.statItem} ${rev}`} data-delay={200 + i * 100}>
                {isEdit && (
                  <div className={styles.editToolbar}>
                    <button
                      className={styles.toolbarBtn}
                      onClick={() => {
                        const newStats = [...stats]
                        const icons = ['explosion', 'skull', 'blume', 'blitz', 'smiley', 'pixel_heart', 'horn_hand']
                        const nextIcon = icons[(icons.indexOf(stat.icon || 'explosion') + 1) % icons.length]
                        newStats[i] = { ...newStats[i], icon: nextIcon }
                        updateDraft('stats', newStats)
                      }}
                      type="button"
                      title="Icon wechseln"
                    >
                      🔄 Icon
                    </button>
                    <button
                      className={`${styles.toolbarBtn} ${styles.toolbarBtnDanger}`}
                      onClick={(e) => { e.stopPropagation(); const newStats = stats.filter((_, idx) => idx !== i); updateDraft('stats', newStats) }}
                      type="button"
                      title="Entfernen"
                    >
                      🗑️
                    </button>
                  </div>
                )}
                <div className={styles.statIcon}>
                  {renderIcon(stat.icon || 'explosion')}
                </div>
                <Editable tag="div" className={styles.statNumber} value={stat.number} onSave={(v) => {
                  const newStats = [...stats]
                  newStats[i] = { ...newStats[i], number: v }
                  updateDraft('stats', newStats)
                }} />
                <Editable tag="div" className={styles.statLabel} value={stat.label} onSave={(v) => {
                  const newStats = [...stats]
                  newStats[i] = { ...newStats[i], label: v }
                  updateDraft('stats', newStats)
                }} />
                <Editable tag="div" className={styles.statDetail} value={stat.detail} onSave={(v) => {
                  const newStats = [...stats]
                  newStats[i] = { ...newStats[i], detail: v }
                  updateDraft('stats', newStats)
                }} />
              </div>
            ))}
          </div>
          <AddButton label="Kennzahl hinzufügen" onClick={() => {
            const newStats = [...stats, { number: '0+', label: 'Label', detail: 'Detail' }]
            updateDraft('stats', newStats)
          }} />
        </section>
      )}

      {/* REFERENCES */}
      <section className={styles.section}>
        <div className={`${rev} ${styles.sectionLabel}`} data-delay="0">
          {sectionNumbers.references} — Referenzen
        </div>
        <Editable
          tag="h2"
          className={`${styles.sectionHeadline} ${rev}`}
          value="Projekte, die begeistern"
          onSave={() => {}}
        />

        {isEdit && (
          <div style={{ marginBottom: '2rem' }}>
            <button className={styles.pickerBtn} onClick={() => setPickerOpen(pickerOpen === 'references' ? null : 'references')} type="button" style={{ background: 'transparent', color: '#FF1900', border: '1px solid #FF1900', padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              {pickerOpen === 'references' ? '▼' : '►'} Referenzen auswählen ({(draft.referenceIds || []).length} gewählt)
            </button>
            {pickerOpen === 'references' && (
              <div style={{ background: '#222', border: '1px solid rgba(255,255,255,0.06)', marginTop: '1rem', padding: '1rem' }}>
                {allReferences.map((ref) => (
                  <label key={ref.id} style={{ display: 'block', padding: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={(draft.referenceIds || []).includes(ref.id)} onChange={() => toggleReference(ref.id)} />
                    <span style={{ marginLeft: '0.5rem', color: '#fff' }}>{ref.name}</span>
                    <span style={{ marginLeft: '1rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{ref.tags.join(', ')}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {displayRefs.length > 0 && (
          <div className={styles.referencesGrid}>
            {displayRefs.map((ref, refIdx) => (
              <div key={ref.id} className={`${styles.referenceCard} ${rev} ${isEdit ? styles.referenceCardDraggable : ''} ${dragRefIdx === refIdx ? styles.referenceCardDragging : ''}`} data-delay={200 + refIdx * 100} draggable={isEdit} onDragStart={() => handleRefDragStart(refIdx)} onDragOver={(e) => handleRefDragOver(e, refIdx)} onDragEnd={handleRefDragEnd}>
                {!isEdit && ref.url ? (
                  <a href={ref.url} target="_blank" rel="noopener noreferrer" className={styles.referenceLink}>
                    {ref.imageUrl && <img src={ref.imageUrl} alt={ref.name} className={styles.referenceImg} />}
                    <div className={styles.referenceOverlay}>
                      <div className={styles.referenceName}>{ref.name}</div>
                      <div className={styles.referenceDesc}>{ref.description}</div>
                      <div className={styles.referenceTags}>
                        {ref.tags.map((tag, ti) => (
                          <span key={ti} className={styles.referenceTag}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </a>
                ) : (
                  <>
                    {ref.imageUrl && <img src={ref.imageUrl} alt={ref.name} className={styles.referenceImg} />}
                    <div className={styles.referenceOverlay}>
                      <div className={styles.referenceName}>{ref.name}</div>
                      <div className={styles.referenceDesc}>{ref.description}</div>
                      <div className={styles.referenceTags}>
                        {ref.tags.map((tag, ti) => (
                          <span key={ti} className={styles.referenceTag}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        {displayRefs.length === 0 && isEdit && (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Noch keine Referenzen. Klicke oben auf &quot;Referenzen auswählen&quot;.</p>
        )}
      </section>

      {/* CHANNELS */}
      {(displayChannels.length > 0 || isEdit) && (!channelsHidden || isEdit) && (
        <section className={styles.section} style={isEdit && channelsHidden ? { opacity: 0.4 } : undefined}>
          <div className={`${rev} ${styles.sectionLabel}`} data-delay="0">
            {sectionNumbers.channels || '—'} — Kanäle {isEdit && channelsHidden && '(ausgeblendet)'}
            {isEdit && (
              <button onClick={() => {
                const newHidden = !channelsHidden
                setChannelsHidden(newHidden)
                updateDraft('channelsHidden', newHidden)
              }} style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', fontSize: '0.75rem', marginLeft: '1rem' }}>
                {channelsHidden ? '👁 Einblenden' : '👁 Ausblenden'}
              </button>
            )}
          </div>
          {(!channelsHidden || isEdit) && (
            <>
              <Editable tag="h2" className={`${styles.sectionHeadline} ${rev}`} value={draft.channelsHeadline || 'Wo Markenliebe lebt'} onSave={(v) => updateDraft('channelsHeadline', v)} />

              {isEdit && (
                <div style={{ marginBottom: '2rem' }}>
                  <button className={styles.pickerBtn} onClick={() => setPickerOpen(pickerOpen === 'channels' ? null : 'channels')} type="button" style={{ background: 'transparent', color: '#FF1900', border: '1px solid #FF1900', padding: '0.6rem 1rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    {pickerOpen === 'channels' ? '▼' : '►'} Kanäle auswählen ({(draft.channelIds || []).length} gewählt)
                  </button>
                  {pickerOpen === 'channels' && (
                    <div style={{ background: '#222', border: '1px solid rgba(255,255,255,0.06)', marginTop: '1rem', padding: '1rem' }}>
                      <label style={{ display: 'block', padding: '0.5rem', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={allChannels.length > 0 && allChannels.every(ch => (draft.channelIds || []).includes(ch.id))} onChange={() => {
                          const allSelected = allChannels.every(ch => (draft.channelIds || []).includes(ch.id))
                          updateDraft('channelIds', allSelected ? [] : allChannels.map(ch => ch.id))
                        }} />
                        <span style={{ marginLeft: '0.5rem' }}>Alle auswählen</span>
                      </label>
                      {allChannels.map((ch) => (
                        <label key={ch.id} style={{ display: 'block', padding: '0.5rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={(draft.channelIds || []).includes(ch.id)} onChange={() => toggleChannel(ch.id)} />
                          <span style={{ marginLeft: '0.5rem', color: '#fff' }}>{ch.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {displayChannels.length > 0 && (
                <div className={styles.channelsList}>
                  {displayChannels.map((ch, chIdx) => (
                    <div key={ch.id} className={`${styles.channelTag} ${rev} ${isEdit ? styles.channelTagDraggable : ''} ${dragChIdx === chIdx ? styles.channelTagDragging : ''}`} data-delay={200 + chIdx * 100} draggable={isEdit} onDragStart={() => handleChDragStart(chIdx)} onDragOver={(e) => handleChDragOver(e, chIdx)} onDragEnd={handleChDragEnd}>
                      <ChannelIcon platform={ch.platform} />
                      {ch.name}
                    </div>
                  ))}
                </div>
              )}
              {displayChannels.length === 0 && isEdit && (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Noch keine Kanäle. Klicke oben auf &quot;Kanäle auswählen&quot;.</p>
              )}
            </>
          )}
        </section>
      )}

      {/* CTA + CONTACT */}
      <section className={styles.ctaContactSection}>
        <div className={styles.ctaContactLeft}>
          <div className={`${rev}`} data-delay="0">
            <div className={styles.ctaIcon}>
              <HornHandIcon />
            </div>
            <Editable tag="h2" className={styles.ctaHeadline} value={hero.ctaHeadline || 'Bereit durchzustarten?'} onSave={(v) => updateDraft('hero', { ...hero, ctaHeadline: v })} />
            <Editable tag="p" className={styles.ctaText} value={hero.ctaText || 'Lass uns in einem kurzen Gespräch die Details besprechen und den Projektstart planen.'} onSave={(v) => updateDraft('hero', { ...hero, ctaText: v })} />
          </div>
        </div>
        <div className={`${styles.ctaContactRight} ${rev}`} data-delay="0">
          <div className={styles.contactRow}>
            {draft.contact.avatarUrl ? (
              <img src={draft.contact.avatarUrl} alt={draft.contact.name} className={styles.contactPhoto} />
            ) : (
              <div className={styles.contactPhotoPlaceholder}>{draft.contact.name.split(' ').map(n => n[0]).join('')}</div>
            )}
            <div>
              <h3 style={{ fontFamily: 'Anton', fontSize: '1.6rem', textTransform: 'uppercase', color: '#fff', lineHeight: 1.1, marginBottom: '0.1rem' }}>{draft.contact.name}</h3>
              <div className={styles.contactRole}>{draft.contact.role} · Pulpmedia</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tel</span>
              <br />
              <a href={`tel:${draft.contact.phone}`} className={styles.contactLink}>{draft.contact.phone}</a>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mail</span>
              <br />
              <a href={`mailto:${draft.contact.email}`} className={styles.contactLink}>{draft.contact.email}</a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER BRAND */}
      <div className={styles.footerBrand}>
        <div className={styles.footerLeft}>
          <div>
            <PulpmediaLogoWhite />
          </div>
          <div className={styles.footerAddress}>
            Linzer Straße 1, 4040 Linz, Österreich<br />
            UID: ATU62936737 · FN 284945M
          </div>
        </div>
        <div className={styles.footerRight}>
          <div className={styles.footerClaim}>
            Don&apos;t make ads. <span className={styles.footerClaimLove}>Make love.</span>
          </div>
        </div>
      </div>

      {/* LEGAL FOOTER */}
      <div className={styles.legalFooter}>
        <div className={styles.legalText}>
          Alle Preise verstehen sich exkl. USt. Zahlbar innerhalb von 14 Tagen nach Rechnungslegung.
        </div>
        <div className={styles.legalLinks}>
          <a href="https://pulpmedia.at/AGB" target="_blank" rel="noopener">AGB</a>
          <a href="https://pulpmedia.at/Datenschutz" target="_blank" rel="noopener">Datenschutz</a>
          <a href="https://pulpmedia.at/Impressum" target="_blank" rel="noopener">Impressum</a>
        </div>
      </div>

      {/* TOAST */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
