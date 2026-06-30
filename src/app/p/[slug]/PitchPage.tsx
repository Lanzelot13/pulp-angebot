'use client'

// =========================================================
// Pulpmedia Pitch Page · Cinema Noir (v7-Port)
// =========================================================
// Rendert eine vollständige Pitch-Page mit allen 18 v7-Modul-Typen
// plus der zugehörigen Interaktivität (Story/Slides-Modus,
// Custom-Cursor, Fullscreen, Counter-Animation, Flip-Cards,
// Embed-Adapter für YouTube/TikTok/Instagram/Video).
//
// Das ganze CSS lebt in pitch-deck-styles.ts und wird hier
// per <style dangerouslySetInnerHTML> injiziert, damit das
// Cascade-Pattern aus dem Clickdummy 1:1 funktioniert.

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import type {
  PitchModuleType,
  HeroContent,
  TeamContent,
  NumbersContent,
  ManifestContent,
  UwContent,
  SpotlightContent,
  LoveBrandsContent,
  RenderedLoveBrand,
  SaeulenContent,
  LeistungenContent,
  CaseVideoContent,
  CaseSocialContent,
  MonitorContent,
  QuoteContent,
  ProcessContent,
  FragenContent,
  TippsContent,
  IdeasContent,
  OptionenContent,
  OutroContent,
  EmbedConfig,
} from '@/lib/pitch-types'
import { ICON_FILES, DEFAULT_CONTENT } from '@/lib/pitch-types'
import type { Person } from '@/lib/team'
import { useTracking } from '@/lib/use-tracking'
import { PITCH_DECK_CSS } from './pitch-deck-styles'

// =========================================================
// Types
// =========================================================

interface PitchModuleSnapshot {
  instanceId: string
  moduleId: string | null
  type: PitchModuleType
  name: string
  content: unknown
  sourceUpdatedAt: string | null
  sortOrder: number
}

interface PitchContact {
  slug: string
  name: string
  role: string
  email: string
  phone: string
  avatarUrl: string | null
}

interface Pitch {
  id: string
  slug: string
  status: 'DRAFT' | 'SENT' | 'ARCHIVED'
  clientCompany: string
  occasion: string | null
  contactSlug: string
  contact: PitchContact
  editToken: string
  archivedAt: string | null
  modules: PitchModuleSnapshot[]
  createdAt: string
  updatedAt: string
}

interface Props {
  pitch: Pitch
  team: Person[]
  lovebrands: RenderedLoveBrand[]
  mode: 'view' | 'edit'
}

// =========================================================
// Konstanten
// =========================================================

const PULP_LOGO_SVG = `
<svg viewBox="0 0 430 100" xmlns="http://www.w3.org/2000/svg" aria-label="Pulpmedia">
  <path d="M110,0h50v50h25V0h25v100h-50c-27.6,0-50-22.4-50-50h0V0Z"/>
  <path d="M75,0H0v100h50v-50h25l25-25L75,0ZM18.6,40.4V9.7l18.4,15.4-18.4,15.4Z"/>
  <path d="M295,50h-25V0h-50v50c0,27.6,22.4,50,50,50h25l25-25-25-25ZM257,37.1h-24.1V13h24.1v24.1Z"/>
  <g><path d="M356.6,71.8v5h5c0-2.7-2.2-5-5-5Z"/><path d="M348.5,76.7h5v-5c-2.7,0-5,2.2-5,5Z"/><path d="M405,0h-75v100h50v-50h25c13.8,0,25-11.2,25-25S418.8,0,405,0ZM365,82.4h-5v5h-2.5v-4.9h-1.3v4.9h-2.3v-4.9h-1.3v4.9h-2.6v-5h-5v-9.9c0-5.5,4.4-9.9,9.9-9.9s9.9,4.4,9.9,9.9v9.9Z"/></g>
</svg>
`

// Custom-Cursor-SVG (Pulp-Hand)
const CURSOR_SVG = `
<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path fill="#FF1900" d="M43.02,11.08c-4.8-4.57-10.36-.15-10.36-.15-5.6-3.82-9.99,1.73-9.99,1.73-2.67-5.87-4.93-8.12-8.03-10.99C12.15-.62,6.13-1.29,6.22,4.53c.03,1.73,2.51,5.12,4.12,8.74,3.2,7.19,5.62,10.68,5.62,10.68-5.07-4.3-11.68,.62-9.35,5.69,6.33,13.79,15.56,16.2,15.56,16.2,1.02,8.62,20.51,1.63,22.87-1.24,2.36-2.86-.04-6.22-.04-6.22,6.93-5.93,.76-24.69-1.99-27.3Zm-12.8,23c-.61-7.98-4.27-11.88-4.31-11.92l1.21-1.17c.17,.17,4.12,4.33,4.78,12.96l-1.68,.13Zm5.74-1.02c.04-7.49-3.48-11.88-3.51-11.93l1.3-1.07c.16,.2,3.94,4.87,3.89,13h-1.68Z"/>
</svg>
`

function iconUrl(key: string | undefined): string | null {
  if (!key) return null
  const path = ICON_FILES[key]
  return path ? '/' + path : null
}

// =========================================================
// Embed-Player
// =========================================================

function EmbedPlayer({ embed }: { embed: EmbedConfig | undefined }) {
  if (!embed || !embed.type) {
    return (
      <div className="slot-lbl">
        <span>EMBED-SLOT · Typ + ID/URL fehlt</span>
      </div>
    )
  }
  const { type, id, url, autoplay, mute, loop, controls } = embed

  if (type === 'youtube' && id) {
    const params = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
      controls: controls === false ? '0' : '1',
      autoplay: autoplay ? '1' : '0',
      mute: mute === false ? '0' : '1',
      loop: loop ? '1' : '0',
      playsinline: '1',
    })
    if (loop) params.set('playlist', id)
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
        title="YouTube"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    )
  }

  if (type === 'video' && (url || id)) {
    const src = url || id || ''
    return (
      <video
        src={src}
        autoPlay={!!autoplay}
        muted={mute !== false}
        loop={!!loop}
        controls={controls !== false}
        playsInline
      />
    )
  }

  if (type === 'tiktok' && (id || url)) {
    const u = url || `https://www.tiktok.com/@_/video/${id}`
    return (
      <blockquote
        className="tiktok-embed embed"
        cite={u}
        data-video-id={id}
        style={{ maxWidth: '100%', margin: 0 }}
      >
        <a href={u}> </a>
      </blockquote>
    )
  }

  if (type === 'instagram' && url) {
    return (
      <blockquote
        className="instagram-media embed"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{ margin: 0, maxWidth: '100%', width: '100%' }}
      />
    )
  }

  return (
    <div className="slot-lbl">
      <span>EMBED konnte nicht gerendert werden</span>
    </div>
  )
}

// =========================================================
// Hauptkomponente
// =========================================================

export function PitchPage({ pitch, team, lovebrands, mode: accessMode }: Props) {
  // Anonymes Tracking, identisch zur Offer-Page. Im Edit-Modus deaktiviert,
  // damit wir uns selbst nicht mitzählen.
  useTracking({
    targetType: 'PITCH',
    targetSlug: pitch.slug,
    disabled: accessMode === 'edit',
  })

  const [pagerLabel, setPagerLabel] = useState('')
  const [pagerCur, setPagerCur] = useState('01')
  const [pagerTot, setPagerTot] = useState('01')
  const [progress, setProgress] = useState(0)
  const [mode, setMode] = useState<'slides' | 'story'>('slides')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const lenisRef = useRef<unknown>(null)
  const visibleModules = pitch.modules.filter((m) => m && m.type)

  // ---------- MODE TOGGLE ----------
  const setModeWith = (m: 'slides' | 'story') => {
    setMode(m)
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('pitch-mode', m) } catch {}
    }
    if (m === 'slides') {
      // sofort nach oben scrollen
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
  }

  // Load saved mode (default: slides)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pitch-mode')
      if (saved === 'story') setMode('story')
    } catch {}
  }, [])

  // ---------- CUSTOM CURSOR ----------
  useEffect(() => {
    const cursor = cursorRef.current
    if (!cursor) return
    const onMove = (e: MouseEvent) => {
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
    }
    const hoverables = 'a, button, [data-cursor=hover], .slide.saeulen .pillar, .slide.leistungen .it'
    const onOver = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(hoverables)) cursor.classList.add('hover')
    }
    const onOut = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest(hoverables)) cursor.classList.remove('hover')
    }
    const onDown = () => cursor.classList.add('click')
    const onUp = () => cursor.classList.remove('click')
    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  // ---------- COUNTERS ----------
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const counterIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          const el = e.target as HTMLElement
          const target = parseFloat(el.dataset.target || '0')
          const dec = parseInt(el.dataset.decimals || '0', 10)
          const dur = parseInt(el.dataset.duration || '1800', 10)
          const start = performance.now()
          function tick(now: number) {
            const t = Math.min(1, (now - start) / dur)
            const ease = 1 - Math.pow(1 - t, 3)
            const val = target * ease
            el.textContent = dec
              ? val.toFixed(dec)
              : Math.round(val).toLocaleString('de-AT')
            if (t < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          counterIO.unobserve(el)
        })
      },
      { threshold: 0.4 }
    )
    root.querySelectorAll<HTMLElement>('[data-counter]').forEach((el) => counterIO.observe(el))
    return () => counterIO.disconnect()
  }, [pitch.id])

  // ---------- TRACK-SECTION-ATTRIBUTE ----------
  // Jeder Folie ein data-track-section + type + index dranhängen, damit der
  // useTracking-IntersectionObserver section_view-Events erkennt.
  // Zusätzlich für interaktive Sub-Elemente (Flip-Cards, Option-Cards) eigene
  // Sub-Sections und data-track-click-Attribute setzen — so wissen wir, welche
  // Karte konkret beachtet oder geklickt wurde.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const slides = root.querySelectorAll<HTMLElement>('.slide')
    slides.forEach((slide, idx) => {
      const type = slide.getAttribute('data-slide-type') || 'unknown'
      const slideId = `${String(idx + 1).padStart(2, '0')}-${type}`
      slide.setAttribute('data-track-section', slideId)
      slide.setAttribute('data-track-type', type)
      slide.setAttribute('data-track-index', String(idx))

      // Flip-Cards (Fragen, Tipps, Ideas) als eigene Sub-Sections + klickbar
      slide.querySelectorAll<HTMLElement>('.flip-card').forEach((card, cardIdx) => {
        const subId = `${slideId}-card-${cardIdx}`
        card.setAttribute('data-track-section', subId)
        card.setAttribute('data-track-type', `${type}-card`)
        card.setAttribute('data-track-index', String(cardIdx))
        card.setAttribute('data-track-click', subId)
      })

      // Option-Cards in der Optionen-Folie
      slide.querySelectorAll<HTMLElement>('.opt').forEach((opt, optIdx) => {
        const subId = `${slideId}-option-${optIdx}`
        opt.setAttribute('data-track-section', subId)
        opt.setAttribute('data-track-type', 'option')
        opt.setAttribute('data-track-index', String(optIdx))
        opt.setAttribute('data-track-click', subId)
      })
    })
  }, [pitch.id])

  // ---------- INTERSECTION REVEAL ----------
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('revealed')
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    root.querySelectorAll('.slide').forEach((s) => io.observe(s))
    requestAnimationFrame(() => root.querySelector('.slide')?.classList.add('revealed'))
    return () => io.disconnect()
  }, [pitch.id])

  // ---------- LENIS (story mode only) ----------
  useEffect(() => {
    if (typeof window === 'undefined') return
    interface LenisCtor {
      new (opts: { lerp: number; smoothWheel: boolean }): { raf: (t: number) => void; destroy: () => void }
    }
    const Lenis = (window as unknown as { Lenis?: LenisCtor }).Lenis
    if (mode === 'story' && Lenis && !lenisRef.current) {
      const lenis = new Lenis({ lerp: 0.085, smoothWheel: true })
      lenisRef.current = lenis
      const raf = (t: number) => {
        const cur = lenisRef.current as { raf: (t: number) => void } | null
        if (cur) {
          cur.raf(t)
          requestAnimationFrame(raf)
        }
      }
      requestAnimationFrame(raf)
    }
    if (mode === 'slides' && lenisRef.current) {
      (lenisRef.current as { destroy: () => void }).destroy()
      lenisRef.current = null
    }
  }, [mode])

  // ---------- FULLSCREEN ----------
  const toggleFs = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.()
    } else {
      document.documentElement.requestFullscreen?.()
    }
  }
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // ---------- KEYBOARD NAV ----------
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFs(); return }
      const slides = Array.from(root.querySelectorAll<HTMLElement>('.slide'))
      if (slides.length === 0) return
      const mid = window.scrollY + window.innerHeight * 0.45
      let idx = 0
      slides.forEach((s, i) => { if (s.offsetTop <= mid) idx = i })
      const goto = (n: number) => {
        const clamped = Math.max(0, Math.min(slides.length - 1, n))
        slides[clamped].scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault(); goto(idx + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault(); goto(idx - 1)
      } else if (e.key === 'Home') {
        e.preventDefault(); goto(0)
      } else if (e.key === 'End') {
        e.preventDefault(); goto(slides.length - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ---------- PROGRESS + PAGER ----------
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const slides = Array.from(root.querySelectorAll<HTMLElement>('.slide'))
    setPagerTot(String(slides.length).padStart(2, '0'))
    const update = () => {
      const max = Math.max(1, document.body.scrollHeight - window.innerHeight)
      const p = Math.max(0, Math.min(1, window.scrollY / max))
      setProgress(p * 100)
      const mid = window.scrollY + window.innerHeight * 0.45
      let idx = 0
      slides.forEach((s, i) => { if (s.offsetTop <= mid) idx = i })
      setPagerCur(String(idx + 1).padStart(2, '0'))
      const lbl = slides[idx]?.dataset.screenLabel || ''
      setPagerLabel(lbl.replace(/^\d+\s+/, '').slice(0, 32))
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [pitch.id])

  // ---------- INSTAGRAM EMBED RENDER (nach Mount + Mode-Wechsel) ----------
  useEffect(() => {
    const win = window as unknown as { instgrm?: { Embeds?: { process: () => void } } }
    if (win.instgrm?.Embeds?.process) {
      try { win.instgrm.Embeds.process() } catch {}
    }
  }, [pitch.id, mode])

  return (
    <div ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: PITCH_DECK_CSS }} />

      {/* Externe Embed-Scripts. Lenis bei story-mode geladen, plus TikTok/Instagram. */}
      <Script src="https://www.tiktok.com/embed.js" strategy="lazyOnload" />
      <Script src="https://www.instagram.com/embed.js" strategy="lazyOnload" />
      <Script src="https://cdn.jsdelivr.net/npm/lenis@1.0.42/dist/lenis.min.js" strategy="afterInteractive" />

      <div className="progress" style={{ width: `${progress}%` }} />

      <header className="bar">
        <a className="logo" href="#" aria-label="Pulpmedia" dangerouslySetInnerHTML={{ __html: PULP_LOGO_SVG }} />
        <div className="center">
          <span>{pitch.clientCompany?.toUpperCase()}</span>
          <span className="dot" />
          <span>{(pitch.occasion || '').toUpperCase()}</span>
        </div>
        <div className="right">
          <div className="mode-toggle" role="tablist" aria-label="Lesemodus">
            <button type="button" className={mode === 'story' ? 'on' : ''} onClick={() => setModeWith('story')}>STORY</button>
            <button type="button" className={mode === 'slides' ? 'on' : ''} onClick={() => setModeWith('slides')}>SLIDES</button>
          </div>
          <button
            type="button"
            className="fs-btn"
            aria-label={isFullscreen ? 'Vollbild verlassen' : 'Vollbild'}
            title={isFullscreen ? 'Vollbild verlassen (F)' : 'Vollbild (F)'}
            onClick={toggleFs}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
              {!isFullscreen && (
                <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              )}
              {isFullscreen && (
                <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
              )}
            </svg>
          </button>
        </div>
      </header>

      <main className={mode === 'slides' ? 'mode-slides' : ''}>
        <div className={mode === 'slides' ? 'mode-slides-wrap' : ''}>
          {visibleModules.map((m, idx) => (
            <ModuleRouter
              key={m.instanceId}
              module={m}
              index={idx}
              team={team}
              lovebrands={lovebrands}
              occasion={pitch.occasion}
              clientCompany={pitch.clientCompany}
            />
          ))}
        </div>
      </main>

      <div className="pager">
        <span className="label">FOLIE</span>
        <span className="cur">{pagerCur}</span> / <span>{pagerTot}</span>
        <span style={{ marginLeft: 14, opacity: 0.6 }}>{pagerLabel}</span>
      </div>

      <div id="cursor" ref={cursorRef} dangerouslySetInnerHTML={{ __html: CURSOR_SVG }} />

      {/* mode-slides Klasse auf <body> übertragen */}
      <BodyModeSync mode={mode} />
    </div>
  )
}

// =========================================================
// BodyModeSync — fügt .mode-slides am <body> hinzu/entfernt es
// =========================================================
function BodyModeSync({ mode }: { mode: 'slides' | 'story' }) {
  useEffect(() => {
    if (mode === 'slides') document.body.classList.add('mode-slides')
    else document.body.classList.remove('mode-slides')
    return () => document.body.classList.remove('mode-slides')
  }, [mode])
  return null
}

// =========================================================
// Module-Router
// =========================================================

function ModuleRouter({
  module,
  index,
  team,
  lovebrands,
  occasion,
  clientCompany,
}: {
  module: PitchModuleSnapshot
  index: number
  team: Person[]
  lovebrands: RenderedLoveBrand[]
  occasion: string | null
  clientCompany: string
}) {
  const label = `${String(index + 1).padStart(2, '0')} ${module.type}`
  const content = module.content as unknown

  switch (module.type) {
    case 'hero':         return <HeroModule data={content as HeroContent} occasion={occasion} clientCompany={clientCompany} label={label} />
    case 'team':         return <TeamModule data={content as TeamContent} team={team} label={label} />
    case 'numbers':      return <NumbersModule data={content as NumbersContent} label={label} />
    case 'manifest':     return <ManifestModule data={content as ManifestContent} label={label} />
    case 'uw':           return <UwModule data={content as UwContent} label={label} />
    case 'spotlight':    return <SpotlightModule data={content as SpotlightContent} label={label} />
    case 'love-brands':  return <LoveBrandsModule data={content as LoveBrandsContent} pool={lovebrands} label={label} />
    case 'saeulen':      return <SaeulenModule data={content as SaeulenContent} label={label} />
    case 'leistungen':   return <LeistungenModule data={content as LeistungenContent} label={label} />
    case 'case-video':   return <CaseVideoModule data={content as CaseVideoContent} label={label} />
    case 'case-social':  return <CaseSocialModule data={content as CaseSocialContent} label={label} />
    case 'monitor':      return <MonitorModule data={content as MonitorContent} label={label} />
    case 'quote':        return <QuoteModule data={content as QuoteContent} label={label} />
    case 'process':      return <ProcessModule data={content as ProcessContent} label={label} />
    case 'fragen':       return <FragenModule data={content as FragenContent} label={label} />
    case 'tipps':        return <TippsModule data={content as TippsContent} label={label} />
    case 'ideas':        return <IdeasModule data={content as IdeasContent} label={label} />
    case 'optionen':     return <OptionenModule data={content as OptionenContent} label={label} />
    case 'outro':        return <OutroModule data={content as OutroContent} label={label} />
    default:
      return (
        <section className="slide" data-screen-label={label}>
          <p style={{ color: '#fff', padding: 40 }}>Unbekannter Modul-Typ: {module.type}</p>
        </section>
      )
  }
}

// =========================================================
// 01 · HERO
// =========================================================
function HeroModule({
  data,
  occasion,
  clientCompany,
  label,
}: {
  data: HeroContent
  occasion: string | null
  clientCompany: string
  label: string
}) {
  const pulpPeople = (data.fromPulp || []).filter((p) => p && p.name)
  const clientPeople = (data.fromClient || []).filter((p) => p && p.name)
  const hasPulp = pulpPeople.length > 0
  const hasClient = clientPeople.length > 0
  // Anlass kommt aus den Pitch-Metadaten (single source of truth), fällt nur
  // dann auf data.kicker1 zurück wenn keine occasion gesetzt ist.
  const kickerAnlass = (occasion || data.kicker1 || '').toUpperCase()
  const kickerKunde = (data.kicker3 || clientCompany || '').toUpperCase()
  return (
    <section className="slide hero" data-slide-type="hero" data-screen-label={label}>
      <div className="meta-top reveal-fade">
        {kickerAnlass && <span>{kickerAnlass}</span>}
        {kickerAnlass && data.kicker2 && <span className="dot" />}
        {data.kicker2 && <span>{data.kicker2}</span>}
        {(kickerAnlass || data.kicker2) && kickerKunde && <span className="dot" />}
        {kickerKunde && <span>{kickerKunde}</span>}
      </div>
      <h1>
        <span className="hand hand-l" aria-hidden="true" />
        {data.greeting || 'HALLO'}
        <span className="hand hand-r" aria-hidden="true" />
      </h1>
      <div className="meta-bottom reveal-fade delay-3">
        {hasPulp && (
          <div className="it">
            <span className="k">Wir</span>
            <span className="v">
              {pulpPeople.map((p, i) => (
                <span key={i} className="hero-person">{p.name}</span>
              ))}
            </span>
          </div>
        )}
        {hasClient && (
          <div className="it">
            <span className="k">Ihr</span>
            <span className="v">
              {clientPeople.map((p, i) => (
                <span key={i} className="hero-person">{p.name}</span>
              ))}
            </span>
          </div>
        )}
      </div>
      <div className="scroll-hint reveal-fade delay-5">
        <span>SCROLL</span><span className="line" />
      </div>
    </section>
  )
}

// =========================================================
// 02 · TEAM
// =========================================================
function TeamModule({ data, team, label }: { data: TeamContent; team: Person[]; label: string }) {
  const attending = new Set(data.attendingSlugs || [])
  const attendingCount = attending.size
  // Reihenfolge: die Anwesenden zuerst (in der gewählten Reihenfolge), dann der Rest
  const attendingSorted = (data.attendingSlugs || [])
    .map((slug) => team.find((p) => p.slug === slug))
    .filter((p): p is Person => !!p)
  const others = team.filter((p) => !attending.has(p.slug))
  const list = [...attendingSorted, ...others]
  const headline = data.headline || `${team.length} Pulpies, ${attendingCount} sind heute dabei`
  // Den dynamischen Akzent-Part nach dem Komma rot färben, wenn keine Custom-Headline
  return (
    <section className="slide team" data-slide-type="team" data-screen-label={label}>
      <div className="intro intro-team">
        <div className="eyebrow reveal-fade"><span className="bar" /><span>Wer heute dabei ist</span></div>
        <h2 className="slide-title reveal-fade delay-2">
          {data.headline ? (
            headline
          ) : (
            <>
              {team.length} Pulpies,{' '}
              <span className="red">
                {attendingCount === 0
                  ? 'niemand ist heute dabei'
                  : attendingCount === 1
                    ? '1 ist heute dabei'
                    : `${attendingCount} sind heute dabei`}
              </span>
            </>
          )}
          <span className="title-ico" aria-hidden="true" />
        </h2>
      </div>
      <div className="all-pulpies reveal-fade delay-3">
        {list.map((p) => {
          const first = p.name?.split(' ')[0] || p.name
          const isAttending = attending.has(p.slug)
          return (
            <div key={p.slug} className="pulpie" data-attending={isAttending ? '1' : undefined}>
              <div className="photo">
                {p.imageUrl && <img src={p.imageUrl} alt={p.name} />}
              </div>
              <span className="nm">{first}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// =========================================================
// 03 · NUMBERS
// =========================================================
function NumbersModule({ data, label }: { data: NumbersContent; label: string }) {
  return (
    <section className="slide numbers" data-slide-type="numbers" data-screen-label={label}>
      <div className="intro">
        <div className="eyebrow reveal-fade"><span className="bar" /><span>Pulpmedia in Zahlen</span></div>
      </div>
      <div className="grid">
        {data.items?.map((item, i) => {
          const ico = iconUrl(item.iconKey)
          return (
            <div key={i} className={`num-item reveal-fade delay-${i + 2}`}>
              {ico && <div className="icon"><img src={ico} alt="" /></div>}
              <div className="num">
                <span data-counter="" data-target={item.target}>0</span>
                {item.suffix && <span className="suffix">{item.suffix}</span>}
              </div>
              <div className="lbl">{item.label}</div>
              {item.description && <div className="desc">{item.description}</div>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// =========================================================
// 04 · MANIFEST
// =========================================================
function ManifestModule({ data: raw, label }: { data: ManifestContent; label: string }) {
  // Defensive Defaults: wenn der Skill nur ein leeres Objekt schickt, nehmen wir
  // die Pulp-Standard-Manifest-Werte. Sonst hätten wir eine leere Folie.
  const fallback = DEFAULT_CONTENT['manifest'] as ManifestContent
  const data: ManifestContent = {
    line1: raw?.line1 || fallback.line1,
    line2: raw?.line2 || fallback.line2,
    body: raw?.body ?? fallback.body,
  }
  const heart = iconUrl('pixel-heart')
  return (
    <section className="slide manifest" data-slide-type="manifest" data-screen-label={label}>
      {heart && <div className="icon-wm"><img src={heart} alt="" /></div>}
      <div className="wrap">
        <div className="eyebrow reveal-fade" style={{ marginBottom: 48 }}><span className="bar" /><span>Unser Manifest</span></div>
        <h2>
          <span className="reveal-mask"><span>{data.line1}</span></span><br />
          <span className="punch">
            <span className="reveal-mask"><span className="red">{data.line2}</span></span>
            {heart && <span className="ic"><img src={heart} alt="" /></span>}
          </span>
        </h2>
        {data.body && <p className="body reveal-fade delay-4">{data.body}</p>}
      </div>
    </section>
  )
}

// =========================================================
// 05 · UNNÜTZES WISSEN (UW)
// =========================================================
function UwModule({ data, label }: { data: UwContent; label: string }) {
  return (
    <section className="slide uw" data-slide-type="uw" data-screen-label={label}>
      <div className="uw-head">
        <div className="eyebrow reveal-fade"><span className="bar" /><span>Origin Story</span></div>
        <h2 className="slide-title reveal-fade delay-2">Unnützes <span className="red">Wissen</span><span className="title-ico" aria-hidden="true" /></h2>
      </div>
      <div className="uw-cols">
        {data.cols?.map((col, i) => (
          <figure key={i} className={`uw-col reveal-fade delay-${i + 2}`}>
            {col.imageUrl && (
              <div className="uw-img uw-img-logo">
                <img src={col.imageUrl.startsWith('/') ? col.imageUrl : '/' + col.imageUrl} alt={col.heading} />
              </div>
            )}
            {col.imageStack && col.imageStack.length > 0 && (
              <div className="uw-img uw-img-books">
                {col.imageStack.map((url, j) => (
                  <img key={j} className={`book b${j + 1}`} src={url.startsWith('/') ? url : '/' + url} alt="" />
                ))}
              </div>
            )}
            <figcaption>
              <h3 className="uw-h">{col.heading}</h3>
              <p className="uw-p">{col.sub}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

// =========================================================
// 06 · SPOTLIGHT (Layout wie Case-Social, mit Counter-Zahlen)
// =========================================================
function SpotlightModule({ data, label }: { data: SpotlightContent; label: string }) {
  return (
    <section className="slide social-case spotlight" data-slide-type="spotlight" data-screen-label={label}>
      <div className="layout">
        <div className="copy">
          <h3 className="reveal-fade delay-2">{data.title}<span className="title-ico" aria-hidden="true" /></h3>
          {data.body && <p className="lead reveal-fade delay-3">{data.body}</p>}
          <div className="metrics metrics-big reveal-fade delay-4">
            {data.metrics?.map((m, i) => (
              <div key={i} className="m">
                <div className="v">
                  <span className="red">
                    <span data-counter="" data-target={m.target}>0</span>
                  </span>
                  {m.unit && <span className="u"> {m.unit}</span>}
                </div>
                <div className="l">{m.label}</div>
              </div>
            ))}
          </div>
          {data.channelUrl && (
            <a
              className="platform-tag reveal-fade delay-5"
              href={data.channelUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="ic" />
              <span>{data.channelLabel || data.channelUrl}</span>
            </a>
          )}
        </div>
        <div className="phone-frame reveal-fade delay-3">
          <div className="screen">
            <EmbedPlayer embed={data.embed} />
          </div>
        </div>
      </div>
    </section>
  )
}

// =========================================================
// 07 · LOVE BRANDS
// =========================================================
function LoveBrandsModule({
  data,
  pool,
  label,
}: {
  data: LoveBrandsContent
  pool: RenderedLoveBrand[]
  label: string
}) {
  // Lookup gegen den Pool, behalte die Pitch-Reihenfolge.
  const slugs = Array.isArray(data.brandSlugs) ? data.brandSlugs : []
  const poolBySlug = new Map(pool.map((b) => [b.slug, b]))
  const brands = slugs.map((s) => poolBySlug.get(s)).filter((b): b is RenderedLoveBrand => !!b)
  return (
    <section className="slide love-brands" data-slide-type="love-brands" data-screen-label={label}>
      <div className="intro">
        <div className="eyebrow reveal-fade"><span className="bar" /><span>Mit wem wir arbeiten dürfen</span></div>
        <h2 className="slide-title reveal-fade delay-2"><span className="red">Lovebrands</span><span className="title-ico" aria-hidden="true" /></h2>
      </div>
      <div className="grid">
        {brands.map((b) => (
          <div
            key={b.slug}
            className="brand"
            data-shape={b.shape && b.shape !== 'default' ? b.shape : undefined}
            data-invert={b.invertOnDark ? undefined : 'false'}
          >
            <div className="logo-slot">
              <img src={b.logoUrl} alt={b.name} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// =========================================================
// 08 · SÄULEN
// =========================================================
function SaeulenModule({ data: raw, label }: { data: SaeulenContent; label: string }) {
  // Defensive Defaults: ohne pillars wäre die Folie leer.
  const fallback = DEFAULT_CONTENT['saeulen'] as SaeulenContent
  const data: SaeulenContent = {
    pillars: raw?.pillars && raw.pillars.length > 0 ? raw.pillars : fallback.pillars,
  }
  return (
    <section className="slide saeulen" data-slide-type="saeulen" data-screen-label={label}>
      <div className="intro">
        <div className="eyebrow reveal-fade"><span className="bar" /><span>Fünf Säulen für Brand Love</span></div>
        <h2 className="slide-title reveal-fade delay-2">So bauen wir <span className="red">Lovebrands</span><span className="title-ico" aria-hidden="true" /></h2>
      </div>
      <div className="pillars reveal-fade delay-2">
        {data.pillars?.map((p, i) => {
          const ico = iconUrl(p.iconKey)
          return (
            <div key={i} className="pillar">
              <div className="num">{String(i + 1).padStart(2, '0')}</div>
              {ico && <div className="icon"><img src={ico} alt="" /></div>}
              <h3>
                <span className="t">{p.title}</span>
                <span className="s">{p.subtitle}</span>
              </h3>
              <p>{p.body}</p>
            </div>
          )
        })}
      </div>
      <div className="indicator reveal-fade delay-4"><span className="pulse" /><span>→ Hover, um zu vertiefen</span></div>
    </section>
  )
}

// =========================================================
// 09 · LEISTUNGEN
// =========================================================
function LeistungenModule({ data: raw, label }: { data: LeistungenContent; label: string }) {
  // Defensive Defaults: ohne items wäre die Folie leer. Leistungen sind Pulp-Standard,
  // der Default-Content passt fast immer.
  const fallback = DEFAULT_CONTENT['leistungen'] as LeistungenContent
  const data: LeistungenContent = {
    items: raw?.items && raw.items.length > 0 ? raw.items : fallback.items,
  }
  return (
    <section className="slide leistungen" data-slide-type="leistungen" data-screen-label={label}>
      <div className="intro">
        <div className="eyebrow reveal-fade"><span className="bar" /><span>Was wir tagtäglich tun</span></div>
        <h2 className="slide-title reveal-fade delay-2">Unsere <span className="red">Leistungen</span><span className="title-ico" aria-hidden="true" /></h2>
      </div>
      <div className="grid">
        {data.items?.map((it, i) => {
          const ico = iconUrl(it.iconKey)
          return (
            <div key={i} className={`it reveal-fade delay-${(i % 3) + 1}`}>
              <div className="row">
                {ico && <div className="icon"><img src={ico} alt="" /></div>}
                <div>
                  <div className="num">{String(i + 1).padStart(2, '0')}</div>
                  <h3>{it.title}</h3>
                </div>
              </div>
              <p>{it.description}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// =========================================================
// 10 · CASE VIDEO (Hero, full-bleed)
// =========================================================
function CaseVideoModule({ data, label }: { data: CaseVideoContent; label: string }) {
  // Plain and simple: nur das Video, kein Overlay.
  return (
    <section className="slide case" data-slide-type="case-video" data-screen-label={label}>
      <div className="media">
        <EmbedPlayer embed={data.embed} />
      </div>
    </section>
  )
}

// =========================================================
// 11 · CASE SOCIAL (Phone Frame)
// =========================================================
function CaseSocialModule({ data, label }: { data: CaseSocialContent; label: string }) {
  return (
    <section className="slide social-case" data-slide-type="case-social" data-screen-label={label}>
      <div className="layout">
        <div className="copy">
          <div className="client reveal-fade delay-1">{data.client}</div>
          <h3 className="reveal-fade delay-2">
            {data.title}{' '}
            {data.titleAccent && <span className="red">{data.titleAccent}</span>}
            <span className="title-ico" aria-hidden="true" />
          </h3>
          {data.body && <p className="lead reveal-fade delay-3">{data.body}</p>}
          <div className="metrics reveal-fade delay-4">
            {data.metrics?.map((m, i) => (
              <div key={i} className="m">
                <div className="v"><span className={m.accent ? 'red' : ''}>{m.value}</span></div>
                <div className="l">{m.label}</div>
              </div>
            ))}
          </div>
          {data.channelUrl ? (
            <a
              className="platform-tag reveal-fade delay-5"
              href={data.channelUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="ic" />
              <span>{data.platform}</span>
            </a>
          ) : (
            <div className="platform-tag reveal-fade delay-5"><span className="ic" /><span>{data.platform}</span></div>
          )}
        </div>
        <div className="phone-frame reveal-fade delay-3">
          <div className="screen">
            <EmbedPlayer embed={data.embed} />
          </div>
        </div>
      </div>
    </section>
  )
}

// =========================================================
// 12 · MONITOR (TikTok Brand Monitor)
// =========================================================
function MonitorModule({ data, label }: { data: MonitorContent; label: string }) {
  return (
    <section className="slide monitor" data-slide-type="monitor" data-screen-label={label}>
      <div className="intro">
        <div className="eyebrow reveal-fade"><span className="bar" /><span>TikTok Brand Monitor</span></div>
        <h2 className="slide-title reveal-fade delay-2">Wo <span className="red">{data.brand}</span> auf TikTok steht<span className="title-ico" aria-hidden="true" /></h2>
      </div>
      <div className="bm-card reveal-fade delay-2">
        <div className="bm-head">
          <div className="acct">
            <span className="at">@</span>
            <span>{data.handle}</span>
          </div>
          <div className={`rank-badge r-${data.rank}`}>
            <span className="rk">{data.rank.toUpperCase()}</span>
            <span className="rl">
              Rank{data.placement ? ` · ${data.placement}` : ' · Eng.-Rate > 1,5%'}
            </span>
          </div>
        </div>
        <div className="bm-stats">
          <div className="st"><div className="v">{data.posts}</div><div className="l">Posts</div></div>
          <div className="st"><div className="v">{data.views}</div><div className="l">Views</div></div>
          <div className="st"><div className="v">{data.interactions}</div><div className="l">Interaktionen</div></div>
          <div className="st accent"><div className="v">{data.engagementRate}</div><div className="l">Engagement-Rate</div></div>
        </div>
        <div className="bm-compare">
          <div className="cmp-head">
            <span className="lbl">Engagement-Rate im Vergleich</span>
            <span className="zones">
              <span className="z d">D</span><span className="z c">C</span><span className="z b">B</span><span className="z a">A</span>
            </span>
          </div>
          <div className="cmp-rows">
            {data.comparison?.map((row, i) => (
              <div key={i} className={`row ${row.focus ? 'focus' : ''}`}>
                <span className="nm">{row.name}</span>
                <span className="track"><span className={`fill ${row.ghost ? 'ghost' : ''}`} style={{ width: `${row.percent}%` }} /></span>
                <span className="pct">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
        <a
          className="bm-link"
          href="https://tiktokmonitor.pulpmedia.at/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Alle Zahlen live im Pulp TikTok Monitor →
        </a>
      </div>
    </section>
  )
}

// =========================================================
// 13 · QUOTE
// =========================================================
function QuoteModule({ data, label }: { data: QuoteContent; label: string }) {
  const ico = iconUrl('blitz')
  return (
    <section className="slide quote" data-slide-type="quote" data-screen-label={label}>
      <div className="wrap">
        {ico && <div className="ic reveal-fade"><img src={ico} alt="" /></div>}
        <p className="q reveal-fade delay-2">{data.text}</p>
        <div className="by reveal-fade delay-3">
          <div className="avatar"><img alt="" /></div>
          <div className="info">
            <div className="n">{data.name}</div>
            <div className="r">{data.role}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// =========================================================
// 14 · PROCESS TIMELINE
// =========================================================
function ProcessModule({ data, label }: { data: ProcessContent; label: string }) {
  const colsClass = `cols-${Math.max(1, Math.min(7, data.steps?.length || 7))}`
  return (
    <section className="slide process" data-slide-type="process" data-screen-label={label}>
      <div className="intro">
        <div className="eyebrow reveal-fade"><span className="bar" /><span>So läuft&apos;s ab</span></div>
        <h2 className="slide-title reveal-fade delay-2">Ein typischer <span className="red">Ablauf</span><span className="title-ico" aria-hidden="true" /></h2>
        <p className="sub reveal-fade delay-3">Vorlaufzeit und Dauer im Überblick. Im Detail stimmen wir alles gemeinsam ab.</p>
      </div>
      <div className={`timeline ${colsClass}`}>
        {data.steps?.map((step, i) => (
          <div key={i} className={`step reveal-fade delay-${i + 1}`}>
            <div className="dot" />
            <div className="num">{String(i + 1).padStart(2, '0')}</div>
            <div className="when">{step.when}</div>
            <h3>{step.title}</h3>
          </div>
        ))}
      </div>
    </section>
  )
}

// =========================================================
// 15 · FRAGEN (Flip-Cards)
// =========================================================
function FragenModule({ data, label }: { data: FragenContent; label: string }) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set())
  const toggle = (i: number) => {
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }
  return (
    <section className="slide tipps fragen" data-slide-type="fragen" data-screen-label={label}>
      <div className="intro">
        <div className="eyebrow reveal-fade"><span className="bar" /><span>Drei Fragen an euch</span></div>
        <h2 className="slide-title reveal-fade delay-2">Bevor wir <span className="red">loslegen</span><span className="title-ico" aria-hidden="true" /></h2>
        <p className="sub reveal-fade delay-3">Damit wir nicht ins Blaue planen, würden wir gern zuerst von euch hören.</p>
      </div>
      <div className="grid flip-grid">
        {data.items?.map((q, i) => (
          <button key={i} type="button" className={`flip-card reveal-fade delay-${i + 1} ${flipped.has(i) ? 'flipped' : ''}`} onClick={() => toggle(i)}>
            <div className="flip-inner">
              <div className="flip-face flip-front">
                <div className="num">FRAGE {String(i + 1).padStart(2, '0')}</div>
                <div className="qmark">?</div>
                <span className="flip-hint">Antippen</span>
              </div>
              <div className="flip-face flip-back">
                <div className="num">FRAGE {String(i + 1).padStart(2, '0')}</div>
                <h3>
                  {q.title}{' '}
                  {q.titleAccent && <span className="red">{q.titleAccent}</span>}
                </h3>
                <p>{q.body}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

// =========================================================
// 16 · TIPPS (Flip-Cards)
// =========================================================
function TippsModule({ data, label }: { data: TippsContent; label: string }) {
  const [flipped, setFlipped] = useState<Set<number>>(new Set())
  const toggle = (i: number) => {
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }
  return (
    <section className="slide tipps" data-slide-type="tipps" data-screen-label={label}>
      <div className="intro">
        <div className="eyebrow reveal-fade"><span className="bar" /><span>Drei Tipps</span></div>
        <h2 className="slide-title reveal-fade delay-2">Drei Tipps <span className="red">für euch</span><span className="title-ico" aria-hidden="true" /></h2>
        <p className="sub reveal-fade delay-3">Konkrete Hebel, die ihr mit oder ohne uns umsetzen könnt. Pro Pitch individuell.</p>
      </div>
      <div className="grid flip-grid">
        {data.items?.map((t, i) => {
          const ico = iconUrl(t.iconKey)
          return (
            <button key={i} type="button" className={`flip-card reveal-fade delay-${i + 1} ${flipped.has(i) ? 'flipped' : ''}`} onClick={() => toggle(i)}>
              <div className="flip-inner">
                <div className="flip-face flip-front">
                  <div className="num">TIPP {String(i + 1).padStart(2, '0')}</div>
                  {ico && <div className="icon"><img src={ico} alt="" /></div>}
                  <span className="flip-hint">Antippen</span>
                </div>
                <div className="flip-face flip-back">
                  <div className="num">TIPP {String(i + 1).padStart(2, '0')}</div>
                  <h3>
                    {t.title}{' '}
                    {t.titleAccent && <span className="red">{t.titleAccent}</span>}
                  </h3>
                  <p>{t.body}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// =========================================================
// IDEAS · Vorschläge pro Pitch (was wir konkret tun würden)
// =========================================================
function IdeasModule({ data, label }: { data: IdeasContent; label: string }) {
  // Flip-Cards wie bei Fragen/Tipps: Vorderseite zeigt Icon + Title (+ optional Image),
  // Rückseite zeigt Title + Body. Antippen dreht die Karte.
  const [flipped, setFlipped] = useState<Set<number>>(new Set())
  const toggle = (i: number) => {
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }
  return (
    <section className="slide ideas" data-slide-type="ideas" data-screen-label={label}>
      <div className="intro">
        <div className="eyebrow reveal-fade"><span className="bar" /><span>{data.eyebrow || 'Was wir uns überlegt haben'}</span></div>
        <h2 className="slide-title reveal-fade delay-2">
          {data.headline}{' '}
          {data.headlineAccent && <span className="red">{data.headlineAccent}</span>}
          <span className="title-ico" aria-hidden="true" />
        </h2>
        {data.sub && <p className="sub reveal-fade delay-3">{data.sub}</p>}
      </div>
      <div className="grid flip-grid ideas-flip-grid">
        {data.items?.map((it, i) => {
          const ico = iconUrl(it.iconKey)
          const isFlipped = flipped.has(i)
          return (
            <button
              key={i}
              type="button"
              className={`flip-card idea-flip reveal-fade delay-${(i % 4) + 1} ${isFlipped ? 'flipped' : ''}`}
              onClick={() => toggle(i)}
            >
              <div className="flip-inner">
                <div className="flip-face flip-front">
                  {it.imageUrl && (
                    <div className="idea-front-image">
                      <img src={it.imageUrl} alt="" />
                    </div>
                  )}
                  {ico && <div className="idea-front-icon"><img src={ico} alt="" /></div>}
                  <h3 className="idea-front-title">{it.title}</h3>
                  <span className="flip-hint">Antippen</span>
                </div>
                <div className="flip-face flip-back">
                  <h3 className="idea-back-title">{it.title}</h3>
                  <p className="idea-back-text">{it.body}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// =========================================================
// 17 · OPTIONEN
// =========================================================
function OptionenModule({ data, label }: { data: OptionenContent; label: string }) {
  return (
    <section className="slide optionen" data-slide-type="optionen" data-screen-label={label}>
      <div className="intro">
        <div className="eyebrow reveal-fade"><span className="bar" /><span>Drei Einstiegspunkte</span></div>
        <h2 className="slide-title reveal-fade delay-2">Wie wir <span className="red">starten können</span><span className="title-ico" aria-hidden="true" /></h2>
      </div>
      <div className="grid">
        {data.options?.map((opt, i) => {
          const ico = iconUrl(opt.iconKey)
          return (
            <div key={i} className={`opt reveal-fade delay-${i + 1}`}>
              <span className="pkg-name">{opt.pkgName}</span>
              {ico && <div className="icon-large"><img src={ico} alt="" /></div>}
              <h3>{opt.title}</h3>
              <p className="desc">{opt.description}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// =========================================================
// 18 · OUTRO
// =========================================================
function OutroModule({ data, label }: { data: OutroContent; label: string }) {
  const ico = iconUrl('pixel-heart')
  return (
    <section className="slide outro" data-slide-type="outro" data-screen-label={label}>
      {ico && <div className="icon reveal-fade"><img src={ico} alt="" /></div>}
      <h2>
        <span className="reveal-mask"><span>LET&apos;S</span></span>
        <span className="reveal-mask"><span className="red">TALK.</span></span>
      </h2>
      <div className="contact reveal-fade delay-4">
        {data.email && <a href={`mailto:${data.email}`}>{data.email}</a>}
        {data.phone && <a href={`tel:${data.phone.replace(/[^+\d]/g, '')}`}>{data.phone}</a>}
        {data.web && <a href={data.web.startsWith('http') ? data.web : `https://${data.web}`} target="_blank" rel="noopener noreferrer">{data.web}</a>}
      </div>
      {data.sig && (
        <div className="sig">
          {data.sig.split('.').map((part, i, arr) => (
            <span key={i}>
              {i === arr.length - 2 ? <span className="red">{part}.</span> : part + (i < arr.length - 1 ? '.' : '')}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
