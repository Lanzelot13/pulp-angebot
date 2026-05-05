'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Offer, Contact, Reference, Channel } from '@prisma/client'
import type {
  HeroSection, UnderstandingSection, ServicesSection,
  PackagesSection, TimelineSection, StatItem, LegalSection,
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
      const fields = ['hero', 'understanding', 'services', 'packages', 'timeline', 'stats', 'legal', 'referenceIds', 'channelIds'] as const
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
          <span className={`${styles.statusPill} ${styles[`status${draft.status}`]}`}>
            {draft.status}
          </span>
          <span className={styles.statusHint}>
            {draft.status === 'DRAFT' && 'Optionen ohne Preise – zur Abstimmung mit dem Kunden'}
            {draft.status === 'PRICED' && 'Preise sichtbar – Kunde entscheidet'}
            {draft.status === 'ACCEPTED' && 'Kunde hat sich entschieden'}
          </span>
        </div>
      )}

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroTop}>
            <img src="/pulp-logo.svg" alt="Pulpmedia" className={styles.logoImg} />
            <div className={styles.heroMeta}>
              <strong>Angebot {draft.offerNumber || draft.slug}</strong><br />
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
              <span>{draft.clientCompany}</span>
            </div>
            <div className={styles.heroInfoItem}>
              <label>Projekt</label>
              <span>{draft.projectName}</span>
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
              <div key={i} className={styles.serviceItem}>
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
                  {item.optional && <span className={styles.optionalBadge}>Optional</span>}
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
                <div key={i} className={`${styles.package} ${i === 1 ? styles.recommended : ''}`}>
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
                  {packages?.showPrices && pkg.price !== null ? (
                    <>
                      <div className={styles.packagePrice}>{formatPrice(pkg.price)}</div>
                      <div className={styles.packageVat}>zzgl. 20% USt.</div>
                    </>
                  ) : (
                    <>
                      <div className={styles.draftBadge}>DRAFT – Preis folgt</div>
                      <div className={styles.packagePriceHidden}>Preis nach Abstimmung</div>
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
                    {pkg.features.filter(f => f.included).map((f, fi) => (
                      <li key={fi}>
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
                        {f.text}
                      </li>
                    ))}
                  </ul>
                  {isEdit && (
                    <button
                      className={styles.addFeatureBtn}
                      onClick={() => {
                        const items = [...packages!.items]
                        items[i] = { ...items[i], features: [...items[i].features, { text: 'Neues Feature', included: true }] }
                        updateDraft('packages', { ...packages!, items })
                      }}
                      type="button"
                    >+ Feature</button>
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
          </div>
        </section>
      )}

      {/* ABLAUF */}
      {(timeline || isEdit) && (
        <section className={styles.section}>
          <div className={styles.container}>
            <div className={styles.sectionTag}>Ablauf</div>
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
                  <div className={styles.timelineIcon}>{step.icon || '📌'}</div>
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
              {displayRefs.map((ref) => (
                <div key={ref.id} className={styles.refCard}>
                  <div className={styles.refImage}>
                    <span>{ref.name}</span>
                  </div>
                  <div className={styles.refInfo}>
                    <div className={styles.sectionTag}>{ref.name}</div>
                    <h3>{ref.description}</h3>
                    <p>{ref.tags.join(' / ')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {displayRefs.length === 0 && isEdit && (
            <p className={styles.emptyHint}>Noch keine Referenzen zugeordnet. Klicke oben auf &quot;Referenzen auswählen&quot;.</p>
          )}
        </div>
      </section>

      {/* KANÄLE */}
      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionTag}>Kanäle, die wir betreuen</div>
          <h2 className={styles.sectionHeadline}>Wo eure Marke lebt</h2>

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
              {displayChannels.map((ch) => (
                <a key={ch.id} href={ch.url} target="_blank" rel="noopener" className={styles.channelTag}>
                  <span className={styles.channelDot} />
                  {ch.name}
                </a>
              ))}
            </div>
          )}
          {displayChannels.length === 0 && isEdit && (
            <p className={styles.emptyHint}>Noch keine Kanäle zugeordnet. Klicke oben auf &quot;Kanäle auswählen&quot;.</p>
          )}
        </div>
      </section>

      {/* CTA + CONTACT */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <h2 className={styles.ctaHeadline}>Welche Option zündet?</h2>
          <p className={styles.ctaText}>
            Lass uns in einem kurzen Gespräch die Details besprechen und den Projektstart planen.
          </p>
          <div className={styles.contactCard}>
            <div className={styles.contactAvatar}>
              {draft.contact.name.split(' ').map(n => n[0]).join('')}
            </div>
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
