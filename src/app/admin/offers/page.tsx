'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { AdminShell } from '../AdminShell'
import {
  IconEye,
  IconEdit,
  IconLink,
  IconCheck,
  IconExternalLink,
  IconSettings,
  IconArchive,
  IconArchiveRestore,
} from '../Icons'
import styles from '../admin.module.css'
import { STATUS_LABELS, STATUS_OPTIONS, type OfferStatus } from '@/lib/types'

interface PackageItemSlim {
  name: string
  price: number | null
  priceUnit?: string
  priceNote?: string
  termMonths?: number | null
  mocoOfferId?: number | null
}

interface OfferRow {
  id: string
  slug: string
  clientName: string
  clientCompany: string
  projectName: string
  offerNumber: string | null
  status: 'DRAFT' | 'PRICED' | 'ACCEPTED' | 'DECLINED'
  template: 'TEMPLATE1' | 'TEMPLATE2'
  version: number
  editToken: string
  contactSlug: string
  validUntil: string | null
  archivedAt: string | null
  createdAt: string
  contact: { name: string }
  _count: { versions: number }
  // Tracking
  viewCount: number
  lastViewAt: string | null
  // Moco
  mocoRef: string | null
  mocoCompanyId: string | null
  mocoCompanyName: string | null
  mocoLeadStatus: string | null
  packages: { items?: PackageItemSlim[] } | null
}

interface MocoCompanyResult {
  id: number
  name: string
  website?: string
}

interface MocoLeadResult {
  id: number
  name: string
  status: string
  money?: number
  currency?: string
  company?: { id: number; name: string }
}

interface MocoUser {
  id: number
  firstname: string
  lastname: string
}

interface MocoDealCategory {
  id: number
  name: string
}

interface VersionRow {
  id: string
  version: number
  changedBy: string
  createdAt: string
}

interface ContactOption {
  slug: string
  name: string
  role: string
}

type Filter = 'active' | 'all' | 'archived'

interface MetaForm {
  clientName: string
  clientCompany: string
  projectName: string
  offerNumber: string
  template: 'TEMPLATE1' | 'TEMPLATE2'
  status: 'DRAFT' | 'PRICED' | 'ACCEPTED' | 'DECLINED'
  contactSlug: string
  validUntil: string
  slug: string
}

function toDateInput(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function offerToForm(o: OfferRow): MetaForm {
  return {
    clientName: o.clientName,
    clientCompany: o.clientCompany,
    projectName: o.projectName,
    offerNumber: o.offerNumber || '',
    template: o.template || 'TEMPLATE2',
    status: o.status,
    contactSlug: o.contactSlug,
    validUntil: toDateInput(o.validUntil),
    slug: o.slug,
  }
}

export default function OffersPage() {
  const [offers, setOffers] = useState<OfferRow[]>([])
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [filter, setFilter] = useState<Filter>('active')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [versions, setVersions] = useState<Record<string, VersionRow[]>>({})
  const [copied, setCopied] = useState<string | null>(null)

  // Search + filters
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filterContactSlug, setFilterContactSlug] = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | OfferStatus>('')

  // Modal state
  const [editingOffer, setEditingOffer] = useState<OfferRow | null>(null)
  const [form, setForm] = useState<MetaForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  // Moco state
  const MOCO_SUBDOMAIN = 'pulpmedia'
  const [mocoOffer, setMocoOffer] = useState<OfferRow | null>(null)
  const [mocoCompanyQ, setMocoCompanyQ] = useState('')
  const [mocoCompanyResults, setMocoCompanyResults] = useState<MocoCompanyResult[]>([])
  const [mocoCompanySearching, setMocoCompanySearching] = useState(false)
  const [mocoLeadQ, setMocoLeadQ] = useState('')
  const [mocoLeadResults, setMocoLeadResults] = useState<MocoLeadResult[]>([])
  const [mocoLeadSearching, setMocoLeadSearching] = useState(false)
  const [mocoUsers, setMocoUsers] = useState<MocoUser[]>([])
  const [mocoCategories, setMocoCategories] = useState<MocoDealCategory[]>([])
  const [mocoStammdatenLoaded, setMocoStammdatenLoaded] = useState(false)
  const [newCompanyOpen, setNewCompanyOpen] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyWebsite, setNewCompanyWebsite] = useState('')
  const [newLeadOpen, setNewLeadOpen] = useState(false)
  const [newLeadUserId, setNewLeadUserId] = useState<number | ''>('')
  const [newLeadCategoryId, setNewLeadCategoryId] = useState<number | ''>('')
  const [newLeadMoney, setNewLeadMoney] = useState('')
  const [newLeadReminderDate, setNewLeadReminderDate] = useState('')
  const [newLeadStatus, setNewLeadStatus] = useState<'potential' | 'pending' | 'won' | 'lost'>('pending')
  const [mocoError, setMocoError] = useState<string | null>(null)
  const [mocoBusy, setMocoBusy] = useState(false)
  const [packageSyncing, setPackageSyncing] = useState<number | null>(null)

  // Confirm dialog state (archive / restore / version-restore)
  const [confirm, setConfirm] = useState<{
    title: string
    text: string
    action: () => Promise<void>
    busy: boolean
  } | null>(null)

  const loadOffers = useCallback(
    async (f: Filter, q: string, contactSlug: string, status: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('archived', f === 'archived' ? 'true' : 'false')
        if (q) params.set('search', q)
        if (contactSlug) params.set('contactSlug', contactSlug)
        // Status-Filter: explizit gewählter Status hat Vorrang. Wenn nichts
        // gewählt ist, aber der Tab "Aktiv" ist, zeigen wir nur DRAFT + PRICED.
        if (status) {
          params.set('status', status)
        } else if (f === 'active') {
          params.set('status', 'DRAFT,PRICED')
        }
        const res = await fetch(`/api/admin/offers?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) setOffers(data)
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Pick up ?status= / ?contactSlug= / ?search= from the URL on mount (e.g. when
  // jumping from the dashboard status breakdown into a pre-filtered offers list)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const s = params.get('status') as OfferStatus | null
    if (s && STATUS_OPTIONS.includes(s)) setFilterStatus(s)
    const c = params.get('contactSlug')
    if (c) setFilterContactSlug(c)
    const q = params.get('search')
    if (q) {
      setSearchInput(q)
      setSearch(q)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounce the search field so typing doesn't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 250)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    loadOffers(filter, search, filterContactSlug, filterStatus)
  }, [filter, search, filterContactSlug, filterStatus, loadOffers])

  useEffect(() => {
    fetch('/api/admin/contacts')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (Array.isArray(d)) setContacts(d)
      })
      .catch(() => {})
  }, [])

  const toggleVersions = useCallback(
    async (offerId: string) => {
      if (expandedId === offerId) {
        setExpandedId(null)
        return
      }
      setExpandedId(offerId)
      if (!versions[offerId]) {
        const res = await fetch(`/api/admin/offers/${offerId}/versions`)
        if (res.ok) {
          const data = await res.json()
          setVersions((v) => ({ ...v, [offerId]: Array.isArray(data) ? data : [] }))
        }
      }
    },
    [expandedId, versions]
  )

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/o/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  const openEdit = (o: OfferRow) => {
    setEditingOffer(o)
    setForm(offerToForm(o))
    setFormError(null)
  }

  const closeEdit = () => {
    setEditingOffer(null)
    setForm(null)
    setFormError(null)
  }

  const setField = <K extends keyof MetaForm>(key: K, value: MetaForm[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }

  const handleSave = async () => {
    if (!editingOffer || !form) return
    setSaving(true)
    setFormError(null)

    // Only send fields that actually changed
    const original = offerToForm(editingOffer)
    const payload: Record<string, unknown> = {}
    ;(Object.keys(form) as (keyof MetaForm)[]).forEach((k) => {
      if (form[k] !== original[k]) payload[k] = form[k]
    })
    // Normalize empty offerNumber and validUntil to null
    if (payload.offerNumber === '') payload.offerNumber = null
    if (payload.validUntil === '') payload.validUntil = null

    if (Object.keys(payload).length === 0) {
      closeEdit()
      setSaving(false)
      return
    }

    try {
      const res = await fetch(`/api/admin/offers/${editingOffer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFormError(data.error || 'Speichern fehlgeschlagen')
        setSaving(false)
        return
      }
      await loadOffers(filter, search, filterContactSlug, filterStatus)
      closeEdit()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen')
    } finally {
      setSaving(false)
    }
  }

  // === Moco helpers ===

  const patchOfferFields = async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/offers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      throw new Error(d.error || 'Update fehlgeschlagen')
    }
    return await res.json()
  }

  // Company live search (debounced)
  useEffect(() => {
    if (!mocoOffer) return
    const q = mocoCompanyQ.trim()
    if (q.length < 2) {
      setMocoCompanyResults([])
      return
    }
    const t = setTimeout(async () => {
      setMocoCompanySearching(true)
      try {
        const res = await fetch(`/api/admin/moco/companies?q=${encodeURIComponent(q)}`)
        const data = await res.json().catch(() => [])
        if (res.ok && Array.isArray(data)) setMocoCompanyResults(data)
      } finally {
        setMocoCompanySearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [mocoCompanyQ, mocoOffer])

  // Lead live search (debounced) — only relevant once a company is linked
  useEffect(() => {
    if (!mocoOffer) return
    const q = mocoLeadQ.trim()
    if (q.length < 2) {
      setMocoLeadResults([])
      return
    }
    const t = setTimeout(async () => {
      setMocoLeadSearching(true)
      try {
        const res = await fetch(`/api/admin/moco/leads?q=${encodeURIComponent(q)}`)
        const data = await res.json().catch(() => [])
        if (res.ok && Array.isArray(data)) setMocoLeadResults(data)
      } finally {
        setMocoLeadSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [mocoLeadQ, mocoOffer])

  const ensureMocoStammdaten = async () => {
    if (mocoStammdatenLoaded) return
    const res = await fetch('/api/admin/moco/stammdaten')
    if (res.ok) {
      const d = await res.json()
      setMocoUsers(Array.isArray(d.users) ? d.users : [])
      setMocoCategories(Array.isArray(d.dealCategories) ? d.dealCategories : [])
      setMocoStammdatenLoaded(true)
    }
  }

  const refreshOfferInList = (updated: Partial<OfferRow> & { id: string }) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === updated.id ? ({ ...o, ...updated } as OfferRow) : o))
    )
    setEditingOffer((prev) =>
      prev && prev.id === updated.id ? ({ ...prev, ...updated } as OfferRow) : prev
    )
    setMocoOffer((prev) =>
      prev && prev.id === updated.id ? ({ ...prev, ...updated } as OfferRow) : prev
    )
  }

  const linkCompany = async (c: MocoCompanyResult) => {
    if (!mocoOffer) return
    setMocoBusy(true)
    setMocoError(null)
    try {
      const updated = await patchOfferFields(mocoOffer.id, {
        mocoCompanyId: String(c.id),
        mocoCompanyName: c.name,
      })
      refreshOfferInList({ id: mocoOffer.id, mocoCompanyId: String(c.id), mocoCompanyName: c.name })
      setMocoCompanyQ('')
      setMocoCompanyResults([])
      void updated
    } catch (e) {
      setMocoError(e instanceof Error ? e.message : 'Fehler beim Verknüpfen')
    } finally {
      setMocoBusy(false)
    }
  }

  const unlinkCompany = async () => {
    if (!mocoOffer) return
    setMocoBusy(true)
    setMocoError(null)
    try {
      await patchOfferFields(mocoOffer.id, {
        mocoCompanyId: null,
        mocoCompanyName: null,
        // Also clear the lead because it depends on the company
        mocoRef: null,
        mocoLeadStatus: null,
      })
      refreshOfferInList({
        id: mocoOffer.id,
        mocoCompanyId: null,
        mocoCompanyName: null,
        mocoRef: null,
        mocoLeadStatus: null,
      })
    } catch (e) {
      setMocoError(e instanceof Error ? e.message : 'Fehler beim Lösen')
    } finally {
      setMocoBusy(false)
    }
  }

  const createCompanyInMoco = async () => {
    if (!mocoOffer) return
    const name = newCompanyName.trim()
    if (!name) return
    setMocoBusy(true)
    setMocoError(null)
    try {
      const res = await fetch('/api/admin/moco/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, website: newCompanyWebsite.trim() || undefined }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Anlegen fehlgeschlagen')
      await linkCompany({ id: d.id, name: d.name })
      setNewCompanyOpen(false)
      setNewCompanyName('')
      setNewCompanyWebsite('')
    } catch (e) {
      setMocoError(e instanceof Error ? e.message : 'Fehler beim Anlegen')
    } finally {
      setMocoBusy(false)
    }
  }

  const linkLead = async (l: MocoLeadResult) => {
    if (!mocoOffer) return
    setMocoBusy(true)
    setMocoError(null)
    try {
      await patchOfferFields(mocoOffer.id, {
        mocoRef: String(l.id),
        mocoLeadStatus: l.status,
      })
      refreshOfferInList({ id: mocoOffer.id, mocoRef: String(l.id), mocoLeadStatus: l.status })
      setMocoLeadQ('')
      setMocoLeadResults([])
    } catch (e) {
      setMocoError(e instanceof Error ? e.message : 'Fehler beim Verknüpfen')
    } finally {
      setMocoBusy(false)
    }
  }

  const unlinkLead = async () => {
    if (!mocoOffer) return
    setMocoBusy(true)
    setMocoError(null)
    try {
      await patchOfferFields(mocoOffer.id, {
        mocoRef: null,
        mocoLeadStatus: null,
      })
      refreshOfferInList({ id: mocoOffer.id, mocoRef: null, mocoLeadStatus: null })
    } catch (e) {
      setMocoError(e instanceof Error ? e.message : 'Fehler beim Lösen')
    } finally {
      setMocoBusy(false)
    }
  }

  const openNewLeadDialog = async () => {
    setMocoError(null)
    // Default reminder date: today + 14 days
    const def = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    setNewLeadReminderDate(def)
    await ensureMocoStammdaten()
    setNewLeadOpen(true)
  }

  const createLeadInMoco = async () => {
    if (!mocoOffer) return
    if (!mocoOffer.mocoCompanyId) {
      setMocoError('Bitte zuerst einen Kunden in Moco verknüpfen')
      return
    }
    if (!newLeadUserId || !newLeadCategoryId) {
      setMocoError('Bitte Accounter und Kategorie auswählen')
      return
    }
    setMocoBusy(true)
    setMocoError(null)
    try {
      const res = await fetch('/api/admin/moco/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mocoOffer.projectName,
          company_id: Number(mocoOffer.mocoCompanyId),
          user_id: Number(newLeadUserId),
          deal_category_id: Number(newLeadCategoryId),
          money: newLeadMoney ? Number(newLeadMoney) : 0,
          status: newLeadStatus,
          reminder_date: newLeadReminderDate || undefined,
          closing_date: mocoOffer.validUntil
            ? new Date(mocoOffer.validUntil).toISOString().slice(0, 10)
            : undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Anlegen fehlgeschlagen')
      await linkLead({ id: d.id, name: d.name, status: d.status })
      setNewLeadOpen(false)
      setNewLeadMoney('')
    } catch (e) {
      setMocoError(e instanceof Error ? e.message : 'Fehler beim Anlegen')
    } finally {
      setMocoBusy(false)
    }
  }

  const unlinkPackage = async (packageIndex: number) => {
    if (!mocoOffer) return
    setPackageSyncing(packageIndex)
    setMocoError(null)
    try {
      const res = await fetch(`/api/admin/offers/${mocoOffer.id}/unlink-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageIndex }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Lösen fehlgeschlagen')
      }
      if (mocoOffer.packages?.items) {
        const items = mocoOffer.packages.items.map((it, idx) =>
          idx === packageIndex ? { ...it, mocoOfferId: null } : it
        )
        refreshOfferInList({
          id: mocoOffer.id,
          packages: { ...mocoOffer.packages, items },
        })
      }
    } catch (e) {
      setMocoError(e instanceof Error ? e.message : 'Fehler beim Lösen')
    } finally {
      setPackageSyncing(null)
    }
  }

  const syncPackage = async (packageIndex: number) => {
    if (!mocoOffer) return
    setPackageSyncing(packageIndex)
    setMocoError(null)
    try {
      const res = await fetch(`/api/admin/offers/${mocoOffer.id}/sync-package`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageIndex }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Sync fehlgeschlagen')
      // Update local cache of package mocoOfferId
      if (mocoOffer.packages?.items) {
        const items = mocoOffer.packages.items.map((it, idx) =>
          idx === packageIndex ? { ...it, mocoOfferId: d.mocoOfferId as number } : it
        )
        refreshOfferInList({
          id: mocoOffer.id,
          packages: { ...mocoOffer.packages, items },
        })
      }
    } catch (e) {
      setMocoError(e instanceof Error ? e.message : 'Fehler beim Sync')
    } finally {
      setPackageSyncing(null)
    }
  }

  // === Bulk selection ===

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === offers.length && offers.length > 0) return new Set()
      return new Set(offers.map((o) => o.id))
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const askBulkArchive = () => {
    const count = selectedIds.size
    if (count === 0) return
    setConfirm({
      title: `${count} Angebote archivieren?`,
      text: `Alle ausgewählten Angebote werden ins Archiv verschoben. Du findest sie weiterhin im Archiv-Tab und kannst sie einzeln wiederherstellen.`,
      busy: false,
      action: async () => {
        setBulkBusy(true)
        try {
          const res = await fetch('/api/admin/offers/bulk-archive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selectedIds) }),
          })
          if (!res.ok) {
            const d = await res.json().catch(() => ({}))
            throw new Error(d.error || 'Bulk-Archive fehlgeschlagen')
          }
          clearSelection()
          await loadOffers(filter, search, filterContactSlug, filterStatus)
          setConfirm(null)
        } catch (e) {
          setConfirm((c) =>
            c ? { ...c, busy: false, text: e instanceof Error ? e.message : c.text } : c
          )
        } finally {
          setBulkBusy(false)
        }
      },
    })
  }

  const askRestoreVersion = (o: OfferRow, versionNum: number) => {
    setConfirm({
      title: `Version v${versionNum} wiederherstellen?`,
      text: `Der Inhalt von v${versionNum} wird als neue aktuelle Version (v${o.version + 1}) gespeichert. Die bisherige aktuelle Version bleibt im Verlauf erhalten.`,
      busy: false,
      action: async () => {
        const res = await fetch(`/api/admin/offers/${o.id}/versions/${versionNum}/restore`, {
          method: 'POST',
        })
        if (res.ok) {
          // Force re-fetch of the versions list for this offer
          setVersions((v) => {
            const next = { ...v }
            delete next[o.id]
            return next
          })
          await loadOffers(filter, search, filterContactSlug, filterStatus)
          setConfirm(null)
        } else {
          const data = await res.json().catch(() => ({}))
          setConfirm((c) => (c ? { ...c, busy: false, text: data.error || c.text } : c))
        }
      },
    })
  }

  const askArchive = (o: OfferRow) => {
    setConfirm({
      title: 'Angebot archivieren?',
      text: `"${o.projectName}" für ${o.clientCompany} wird ins Archiv verschoben. Die Kunden-URL ist danach nicht mehr erreichbar. Wiederherstellen ist jederzeit möglich.`,
      busy: false,
      action: async () => {
        const res = await fetch(`/api/admin/offers/${o.id}/archive`, { method: 'POST' })
        if (res.ok) {
          await loadOffers(filter, search, filterContactSlug, filterStatus)
          setConfirm(null)
        } else {
          setConfirm((c) => (c ? { ...c, busy: false } : c))
        }
      },
    })
  }

  const askRestore = (o: OfferRow) => {
    setConfirm({
      title: 'Angebot wiederherstellen?',
      text: `"${o.projectName}" für ${o.clientCompany} wird aus dem Archiv zurückgeholt. Die Kunden-URL ist danach wieder erreichbar.`,
      busy: false,
      action: async () => {
        const res = await fetch(`/api/admin/offers/${o.id}/restore`, { method: 'POST' })
        if (res.ok) {
          await loadOffers(filter, search, filterContactSlug, filterStatus)
          setConfirm(null)
        } else {
          setConfirm((c) => (c ? { ...c, busy: false } : c))
        }
      },
    })
  }

  const runConfirm = async () => {
    if (!confirm) return
    setConfirm({ ...confirm, busy: true })
    await confirm.action()
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // Kurzform DD.MM.YY, HH:MM für die "letzter Zugriff"-Anzeige in der Liste
  const formatShortDateTime = (d: string) =>
    new Date(d).toLocaleString('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const statusClass = (s: string) => {
    if (s === 'DRAFT') return styles.statusDraft
    if (s === 'PRICED') return styles.statusPriced
    if (s === 'ACCEPTED') return styles.statusAccepted
    if (s === 'DECLINED') return styles.statusDeclined
    return ''
  }
  const statusLabel = (s: string): string =>
    STATUS_LABELS[s as OfferStatus] || s

  const isArchived = filter === 'archived'
  const slugOrigin = typeof window !== 'undefined' ? `${window.location.origin}/o/` : '/o/'

  return (
    <AdminShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Angebote</h1>
        <div className={styles.pageSub}>Alle erstellten Angebotsseiten mit Versionen</div>
      </div>

      <div className={styles.filterBar}>
        <button
          className={`${styles.filterTab} ${filter === 'active' ? styles.filterTabActive : ''}`}
          onClick={() => setFilter('active')}
          title="Nur offene Angebote: Optionsfindung und Angebot"
        >
          Aktiv
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'all' ? styles.filterTabActive : ''}`}
          onClick={() => setFilter('all')}
          title="Alle Angebote außer dem Archiv"
        >
          Alle
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'archived' ? styles.filterTabActive : ''}`}
          onClick={() => setFilter('archived')}
        >
          Archiv
        </button>
      </div>

      <div className={styles.filterRow}>
        <input
          className={styles.searchInput}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Suchen nach Kunde, Projekt oder Angebotsnummer …"
        />
        <select
          className={styles.filterSelect}
          value={filterContactSlug}
          onChange={(e) => setFilterContactSlug(e.target.value)}
        >
          <option value="">Alle Accounter</option>
          {contacts.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as '' | OfferStatus)}
        >
          <option value="">Alle Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        {(search || filterContactSlug || filterStatus) && (
          <button
            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
            onClick={() => {
              setSearchInput('')
              setFilterContactSlug('')
              setFilterStatus('')
            }}
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className={styles.bulkBar}>
          <span className={styles.bulkBarLabel}>
            {selectedIds.size} ausgewählt
          </span>
          <button
            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
            onClick={clearSelection}
          >
            Auswahl aufheben
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
            onClick={askBulkArchive}
            disabled={bulkBusy}
          >
            {bulkBusy ? 'Archiviert …' : 'Ausgewählte archivieren'}
          </button>
        </div>
      )}

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 30 }}>
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === offers.length}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate =
                        selectedIds.size > 0 && selectedIds.size < offers.length
                    }
                  }}
                  onChange={toggleSelectAll}
                  aria-label="Alle auswählen"
                />
              </th>
              <th style={{ width: 30 }}></th>
              <th>Kunde / Projekt</th>
              <th>Status</th>
              <th>Version</th>
              <th>Aufrufe</th>
              <th>Kontakt</th>
              <th>Erstellt</th>
              <th>Moco</th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <Fragment key={o.id}>
                <tr
                  className={`${styles.offerRow} ${o.archivedAt ? styles.archivedRow : ''} ${selectedIds.has(o.id) ? styles.selectedRow : ''}`}
                  onClick={() => toggleVersions(o.id)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(o.id)}
                      onChange={() => toggleSelect(o.id)}
                      aria-label={`${o.clientCompany} auswählen`}
                    />
                  </td>
                  <td>
                    <span
                      className={`${styles.expandIcon} ${expandedId === o.id ? styles.expandIconOpen : ''}`}
                    >
                      ▶
                    </span>
                  </td>
                  <td>
                    <strong>{o.clientCompany}</strong>
                    {o.archivedAt && <span className={styles.archivedBadge}>Archiv</span>}
                    <br />
                    <span style={{ fontSize: 13, color: '#888' }}>{o.projectName}</span>
                  </td>
                  <td>
                    <span className={`${styles.statusPill} ${statusClass(o.status)}`}>{statusLabel(o.status)}</span>
                  </td>
                  <td>
                    <span className={styles.versionBadge}>v{o.version}</span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()} className={styles.viewCountCell}>
                    {o.viewCount > 0 ? (
                      <a
                        href={`/admin/offers/${o.id}/tracking`}
                        className={styles.viewCountLink}
                        title="Tracking ansehen"
                      >
                        {o.viewCount}
                      </a>
                    ) : (
                      <span className={styles.viewCountZero}>0</span>
                    )}
                    {o.lastViewAt && (
                      <div className={styles.viewCountLast}>{formatShortDateTime(o.lastViewAt)}</div>
                    )}
                  </td>
                  <td>{o.contact.name}</td>
                  <td>{formatDate(o.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={styles.mocoIndicator}
                      onClick={() => {
                        setMocoOffer(o)
                        setMocoError(null)
                        setMocoCompanyQ('')
                        setMocoCompanyResults([])
                        setMocoLeadQ('')
                        setMocoLeadResults([])
                      }}
                      title={
                        o.mocoRef
                          ? `Lead #${o.mocoRef}${o.mocoLeadStatus ? ` · ${o.mocoLeadStatus}` : ''}`
                          : o.mocoCompanyId
                          ? 'Kunde verknüpft, aber noch kein Lead'
                          : 'Moco-Verknüpfung einrichten'
                      }
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {o.mocoRef ? (
                        <>
                          <span
                            className={`${styles.mocoIndicatorDot} ${styles.mocoIndicatorDotLinked}`}
                          />
                          Lead
                        </>
                      ) : o.mocoCompanyId ? (
                        <>
                          <span className={styles.mocoIndicatorDot} />
                          Kunde
                        </>
                      ) : (
                        <>
                          <span className={styles.mocoIndicatorDot} />
                          offen
                        </>
                      )}
                    </button>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className={styles.actions}>
                      <a
                        href={`/o/${o.slug}`}
                        target="_blank"
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                        title="Kundenansicht"
                      >
                        <IconEye size={14} />
                      </a>
                      <a
                        href={`/o/${o.slug}?edit=${o.editToken}`}
                        target="_blank"
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                        title="Editor öffnen"
                      >
                        <IconEdit size={14} />
                      </a>
                      <button
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                        onClick={() => copyLink(o.slug)}
                        title="Kunden-Link kopieren"
                      >
                        {copied === o.slug ? (
                          <IconCheck size={14} color="#22c55e" />
                        ) : (
                          <IconLink size={14} />
                        )}
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                        onClick={() => openEdit(o)}
                        title="Metadaten bearbeiten"
                      >
                        <IconSettings size={14} />
                      </button>
                      {o.archivedAt ? (
                        <button
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall}`}
                          onClick={() => askRestore(o)}
                          title="Aus Archiv wiederherstellen"
                        >
                          <IconArchiveRestore size={14} />
                        </button>
                      ) : (
                        <button
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall} ${styles.btnDanger}`}
                          onClick={() => askArchive(o)}
                          title="Archivieren"
                        >
                          <IconArchive size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedId === o.id && (
                  <tr>
                    <td colSpan={10} style={{ padding: 0 }}>
                      <div className={styles.versionsPanel}>
                        <h4>Versionshistorie</h4>
                        {versions[o.id]?.length === 0 && (
                          <div style={{ color: '#888', fontSize: 13 }}>Keine früheren Versionen</div>
                        )}
                        {!versions[o.id] && (
                          <div style={{ color: '#888', fontSize: 13 }}>Laden...</div>
                        )}
                        {versions[o.id]?.map((v, i) => (
                          <div key={v.id} className={styles.versionItem}>
                            <span
                              className={`${styles.versionDot} ${i === 0 ? styles.versionDotCurrent : ''}`}
                            />
                            <span>v{v.version}</span>
                            <span className={styles.versionMeta}>
                              {v.changedBy} · {formatDateTime(v.createdAt)}
                            </span>
                            <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 12, alignItems: 'center' }}>
                              <button
                                onClick={() => askRestoreVersion(o, v.version)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#888',
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                                title="Diese Version als neue aktuelle Version wiederherstellen"
                              >
                                ↺ Wiederherstellen
                              </button>
                              <a
                                href={`/o/${o.slug}?version=${v.version}`}
                                target="_blank"
                                rel="noopener"
                                style={{
                                  color: '#FF1900',
                                  fontSize: 12,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  textDecoration: 'none',
                                }}
                              >
                                Öffnen <IconExternalLink size={11} color="#FF1900" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {offers.length === 0 && (
              <tr>
                <td colSpan={10} className={styles.emptyState}>
                  <div className={styles.emptyText}>
                    {loading
                      ? 'Angebote werden geladen…'
                      : isArchived
                        ? 'Keine archivierten Angebote'
                        : 'Noch keine Angebote erstellt'}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* === METADATEN-MODAL === */}
      {editingOffer && form && (
        <div className={styles.modalOverlay} onClick={closeEdit}>
          <div
            className={`${styles.modal} ${styles.modalWide}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Metadaten bearbeiten</h2>
              <button className={styles.modalClose} onClick={closeEdit}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              {formError && <div className={styles.formError}>{formError}</div>}

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Kunde (Firma)</label>
                  <input
                    className={styles.formInput}
                    value={form.clientCompany}
                    onChange={(e) => setField('clientCompany', e.target.value)}
                    placeholder="z.B. TGW Logistics"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ansprechperson beim Kunden</label>
                  <input
                    className={styles.formInput}
                    value={form.clientName}
                    onChange={(e) => setField('clientName', e.target.value)}
                    placeholder="Vorname Nachname"
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Projektname</label>
                <input
                  className={styles.formInput}
                  value={form.projectName}
                  onChange={(e) => setField('projectName', e.target.value)}
                  placeholder="z.B. Imagefilm 2026"
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Angebotsnummer</label>
                  <input
                    className={styles.formInput}
                    value={form.offerNumber}
                    onChange={(e) => setField('offerNumber', e.target.value)}
                    placeholder="z.B. AN-2026-001"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Gültig bis</label>
                  <input
                    className={styles.formInput}
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => setField('validUntil', e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Template</label>
                  <select
                    className={styles.formInput}
                    value={form.template}
                    onChange={(e) =>
                      setField('template', e.target.value as 'TEMPLATE1' | 'TEMPLATE2')
                    }
                  >
                    <option value="TEMPLATE1">Template 1 (hell)</option>
                    <option value="TEMPLATE2">Template 2 (dunkel)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Status</label>
                  <select
                    className={styles.formInput}
                    value={form.status}
                    onChange={(e) => setField('status', e.target.value as OfferStatus)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Kontakt (Pulpmedia)</label>
                <select
                  className={styles.formInput}
                  value={form.contactSlug}
                  onChange={(e) => setField('contactSlug', e.target.value)}
                >
                  {contacts.length === 0 && <option value={form.contactSlug}>Lädt …</option>}
                  {contacts.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                      {c.role ? ` — ${c.role}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>URL (Slug)</label>
                <div className={styles.slugField}>
                  <span className={styles.slugPrefix}>{slugOrigin}</span>
                  <input
                    className={styles.slugInput}
                    value={form.slug}
                    onChange={(e) => setField('slug', e.target.value)}
                    placeholder="kunde-projekt-2026"
                  />
                </div>
                {form.slug !== editingOffer.slug && (
                  <div className={styles.formHint} style={{ color: '#c0392b' }}>
                    Achtung: Die alte URL <code>{slugOrigin}{editingOffer.slug}</code> funktioniert
                    nach dem Speichern nicht mehr.
                  </div>
                )}
              </div>

            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={closeEdit}
                disabled={saving}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Speichert …' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MOCO-MODAL === */}
      {mocoOffer && (
        <div className={styles.modalOverlay} onClick={() => setMocoOffer(null)}>
          <div
            className={`${styles.modal} ${styles.modalWide}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Moco-Verknüpfung — {mocoOffer.clientCompany}</h2>
              <button className={styles.modalClose} onClick={() => setMocoOffer(null)}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              {mocoError && <div className={styles.formError}>{mocoError}</div>}

              <div className={styles.mocoCard}>
                <div className={styles.mocoCardHeader}>Kunde</div>
                {mocoOffer.mocoCompanyId ? (
                  <div className={styles.mocoRow}>
                    <div className={styles.mocoLinked}>
                      <span className={styles.mocoLinkedLabel}>Kunde</span>
                      <span className={styles.mocoLinkedValue}>
                        {mocoOffer.mocoCompanyName || `Company #${mocoOffer.mocoCompanyId}`}
                      </span>
                      <a
                        className={styles.mocoExternal}
                        href={`https://${MOCO_SUBDOMAIN}.mocoapp.com/companies/${mocoOffer.mocoCompanyId}`}
                        target="_blank"
                        rel="noopener"
                      >
                        Öffnen <IconExternalLink size={11} color="#FF1900" />
                      </a>
                    </div>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                      onClick={unlinkCompany}
                      disabled={mocoBusy}
                    >
                      Lösen
                    </button>
                  </div>
                ) : (
                  <div className={styles.mocoRow}>
                    <div className={styles.mocoSearchWrap}>
                      <input
                        className={styles.formInput}
                        placeholder="Kunde in Moco suchen …"
                        value={mocoCompanyQ}
                        onChange={(e) => setMocoCompanyQ(e.target.value)}
                      />
                      {mocoCompanyQ.trim().length >= 2 && (
                        <div className={styles.mocoSearchDropdown}>
                          {mocoCompanySearching && (
                            <div className={styles.mocoSearchEmpty}>Suche …</div>
                          )}
                          {!mocoCompanySearching && mocoCompanyResults.length === 0 && (
                            <div className={styles.mocoSearchEmpty}>Keine Treffer</div>
                          )}
                          {mocoCompanyResults.map((c) => (
                            <div
                              key={c.id}
                              className={styles.mocoSearchItem}
                              onClick={() => linkCompany(c)}
                            >
                              <strong>{c.name}</strong>
                              {c.website && <small>{c.website}</small>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                      onClick={() => {
                        setNewCompanyName(mocoOffer.clientCompany || '')
                        setNewCompanyOpen(true)
                      }}
                      disabled={mocoBusy}
                    >
                      Neu anlegen
                    </button>
                  </div>
                )}
              </div>

              {mocoOffer.mocoCompanyId && (
                <div className={styles.mocoCard}>
                  <div className={styles.mocoCardHeader}>Lead</div>
                  {mocoOffer.mocoRef ? (
                    <div className={styles.mocoRow}>
                      <div className={styles.mocoLinked}>
                        <span className={styles.mocoLinkedLabel}>Lead</span>
                        <span className={styles.mocoLinkedValue}>
                          #{mocoOffer.mocoRef}
                          {mocoOffer.mocoLeadStatus && (
                            <small style={{ marginLeft: 8, color: '#888' }}>
                              ({mocoOffer.mocoLeadStatus})
                            </small>
                          )}
                        </span>
                        <a
                          className={styles.mocoExternal}
                          href={`https://${MOCO_SUBDOMAIN}.mocoapp.com/deals/${mocoOffer.mocoRef}`}
                          target="_blank"
                          rel="noopener"
                        >
                          Öffnen <IconExternalLink size={11} color="#FF1900" />
                        </a>
                      </div>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                        onClick={unlinkLead}
                        disabled={mocoBusy}
                      >
                        Lösen
                      </button>
                    </div>
                  ) : (
                    <div className={styles.mocoRow}>
                      <div className={styles.mocoSearchWrap}>
                        <input
                          className={styles.formInput}
                          placeholder="Lead in Moco suchen …"
                          value={mocoLeadQ}
                          onChange={(e) => setMocoLeadQ(e.target.value)}
                        />
                        {mocoLeadQ.trim().length >= 2 && (
                          <div className={styles.mocoSearchDropdown}>
                            {mocoLeadSearching && (
                              <div className={styles.mocoSearchEmpty}>Suche …</div>
                            )}
                            {!mocoLeadSearching && mocoLeadResults.length === 0 && (
                              <div className={styles.mocoSearchEmpty}>Keine Treffer</div>
                            )}
                            {mocoLeadResults.map((l) => (
                              <div
                                key={l.id}
                                className={styles.mocoSearchItem}
                                onClick={() => linkLead(l)}
                              >
                                <strong>{l.name}</strong>
                                <small>
                                  {l.company?.name || ''} · {l.status}
                                  {l.money
                                    ? ` · ${l.money.toLocaleString('de-AT')} ${l.currency || ''}`
                                    : ''}
                                </small>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                        onClick={openNewLeadDialog}
                        disabled={mocoBusy}
                      >
                        Neu anlegen
                      </button>
                    </div>
                  )}
                </div>
              )}

              {mocoOffer.mocoRef && mocoOffer.packages?.items?.length ? (
                <div className={styles.mocoCard}>
                  <div className={styles.mocoCardHeader}>Pakete als Moco-Offer</div>
                  {mocoOffer.packages.items.map((pkg, idx) => {
                    const isSynced = !!pkg.mocoOfferId
                    const isBusy = packageSyncing === idx
                    return (
                      <div key={idx} className={styles.mocoPackageRow}>
                        <span className={styles.mocoPackageName}>{pkg.name}</span>
                        <span className={styles.mocoPackagePrice}>
                          {pkg.price != null
                            ? `€ ${pkg.price.toLocaleString('de-AT')}${pkg.priceUnit ? ` ${pkg.priceUnit}` : ''}`
                            : 'Auf Anfrage'}
                        </span>
                        {isSynced ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                            <a
                              className={styles.mocoSyncSynced}
                              href={`https://${MOCO_SUBDOMAIN}.mocoapp.com/offers/${pkg.mocoOfferId}`}
                              target="_blank"
                              rel="noopener"
                            >
                              ✓ in Moco · Öffnen
                            </a>
                            <button
                              type="button"
                              onClick={() => unlinkPackage(idx)}
                              disabled={isBusy}
                              title="Verknüpfung lösen. Das Moco-Offer bleibt erhalten, das Paket kann erneut gepusht werden."
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#888',
                                fontSize: 12,
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              {isBusy ? 'Löse …' : 'Lösen'}
                            </button>
                          </span>
                        ) : (
                          <button
                            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
                            onClick={() => syncPackage(idx)}
                            disabled={isBusy}
                          >
                            {isBusy ? 'Pusht …' : 'Als Offer anlegen'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setMocoOffer(null)}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === NEUE COMPANY IN MOCO === */}
      {newCompanyOpen && (
        <div className={styles.modalOverlay} onClick={() => !mocoBusy && setNewCompanyOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Neuen Kunden in Moco anlegen</h2>
              <button className={styles.modalClose} onClick={() => setNewCompanyOpen(false)}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              {mocoError && <div className={styles.formError}>{mocoError}</div>}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Firmenname</label>
                <input
                  className={styles.formInput}
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="z.B. alao AG"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Website (optional)</label>
                <input
                  className={styles.formInput}
                  value={newCompanyWebsite}
                  onChange={(e) => setNewCompanyWebsite(e.target.value)}
                  placeholder="https://www.beispiel.at"
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setNewCompanyOpen(false)}
                disabled={mocoBusy}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={createCompanyInMoco}
                disabled={mocoBusy || !newCompanyName.trim()}
              >
                {mocoBusy ? 'Lege an …' : 'In Moco anlegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === NEUER LEAD IN MOCO === */}
      {newLeadOpen && mocoOffer && (
        <div className={styles.modalOverlay} onClick={() => !mocoBusy && setNewLeadOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Neuen Lead in Moco anlegen</h2>
              <button className={styles.modalClose} onClick={() => setNewLeadOpen(false)}>
                &times;
              </button>
            </div>
            <div className={styles.modalBody}>
              {mocoError && <div className={styles.formError}>{mocoError}</div>}
              <div className={styles.formHint} style={{ marginBottom: 16 }}>
                Lead-Name wird auf <strong>{mocoOffer.projectName}</strong> gesetzt,
                Kunde auf <strong>{mocoOffer.mocoCompanyName}</strong>.
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Accounter</label>
                  <select
                    className={styles.formInput}
                    value={newLeadUserId}
                    onChange={(e) => setNewLeadUserId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Bitte auswählen …</option>
                    {mocoUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.firstname} {u.lastname}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Kategorie</label>
                  <select
                    className={styles.formInput}
                    value={newLeadCategoryId}
                    onChange={(e) => setNewLeadCategoryId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Bitte auswählen …</option>
                    {mocoCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Status in Moco</label>
                <select
                  className={styles.formInput}
                  value={newLeadStatus}
                  onChange={(e) =>
                    setNewLeadStatus(
                      e.target.value as 'potential' | 'pending' | 'won' | 'lost'
                    )
                  }
                >
                  <option value="potential">Kontaktmöglichkeit</option>
                  <option value="pending">Angebot</option>
                  <option value="won">Gewonnen</option>
                  <option value="lost">Verloren</option>
                </select>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Wert (EUR, optional)</label>
                  <input
                    className={styles.formInput}
                    type="number"
                    value={newLeadMoney}
                    onChange={(e) => setNewLeadMoney(e.target.value)}
                    placeholder="z.B. 14000"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Wiedervorlage</label>
                  <input
                    className={styles.formInput}
                    type="date"
                    value={newLeadReminderDate}
                    onChange={(e) => setNewLeadReminderDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setNewLeadOpen(false)}
                disabled={mocoBusy}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={createLeadInMoco}
                disabled={mocoBusy || !newLeadUserId || !newLeadCategoryId}
              >
                {mocoBusy ? 'Lege an …' : 'Lead in Moco anlegen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === CONFIRM-DIALOG === */}
      {confirm && (
        <div className={styles.confirmOverlay} onClick={() => !confirm.busy && setConfirm(null)}>
          <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
            <h3>{confirm.title}</h3>
            <p>{confirm.text}</p>
            <div className={styles.confirmActions}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setConfirm(null)}
                disabled={confirm.busy}
              >
                Abbrechen
              </button>
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={runConfirm}
                disabled={confirm.busy}
              >
                {confirm.busy ? 'Bitte warten …' : 'Bestätigen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  )
}
