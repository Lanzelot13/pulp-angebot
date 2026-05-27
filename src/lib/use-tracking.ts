'use client'

import { useEffect, useRef } from 'react'

type TrackingOpts = {
  targetType: 'OFFER' | 'PITCH'
  targetSlug: string
  /**
   * Wenn true, läuft kein Tracking. Wird typischerweise gesetzt, wenn die
   * Seite im Editor-Modus (?edit=...) oder im Clean-Modus (?clean=1) läuft,
   * damit wir uns selbst nicht mitzählen.
   */
  disabled?: boolean
}

const SESSION_KEY = 'pulp-track-session'
const OPTOUT_KEY = 'pulp-track-optout'
const HEARTBEAT_MS = 30_000 // 30 Sekunden

export function useTracking({ targetType, targetSlug, disabled }: TrackingOpts) {
  const viewIdRef = useRef<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const activeSecondsRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (disabled) return

    // Im Clean-Modus (?clean=1) nicht tracken – das ist die Reinansicht
    // ohne Edit-UI, die wir z.B. für Screenshots/PDF-Export nutzen.
    try {
      const sp = new URLSearchParams(window.location.search)
      if (sp.get('clean') === '1') return
    } catch {
      // egal
    }

    // Opt-Out respektieren
    try {
      if (localStorage.getItem(OPTOUT_KEY) === '1') return
    } catch {
      // localStorage gesperrt: dann auch kein Tracking
      return
    }

    // Session-ID (anonym, persistent pro Browser)
    let sessionId: string
    try {
      const existing = localStorage.getItem(SESSION_KEY)
      if (existing) {
        sessionId = existing
      } else {
        sessionId =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`
        localStorage.setItem(SESSION_KEY, sessionId)
      }
    } catch {
      return
    }
    sessionIdRef.current = sessionId

    let cancelled = false
    let beatInterval: ReturnType<typeof setInterval> | null = null
    let lastBeatAt = Date.now()
    const cleanupFns: Array<() => void> = []

    function sendEvent(type: string, payload?: Record<string, unknown>) {
      if (!viewIdRef.current) return
      try {
        fetch('/api/track/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            viewId: viewIdRef.current,
            type,
            payload,
            sessionId: sessionIdRef.current,
          }),
          keepalive: true,
        }).catch(() => {
          // still fail
        })
      } catch {
        // still fail
      }
    }

    function sendBeacon(type: string, payload?: Record<string, unknown>) {
      if (!viewIdRef.current) return
      try {
        const body = JSON.stringify({
          viewId: viewIdRef.current,
          type,
          payload,
          sessionId: sessionIdRef.current,
        })
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: 'application/json' })
          navigator.sendBeacon('/api/track/event', blob)
        } else {
          fetch('/api/track/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
          }).catch(() => {})
        }
      } catch {
        // still fail
      }
    }

    // View öffnen
    fetch('/api/track/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType, targetSlug, sessionId }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { viewId?: string } | null) => {
        if (cancelled || !data?.viewId) return
        viewIdRef.current = data.viewId
        setupTrackers()
      })
      .catch(() => {
        // still fail
      })

    // Heartbeat-Loop
    beatInterval = setInterval(() => {
      if (document.visibilityState !== 'visible') {
        lastBeatAt = Date.now()
        return
      }
      const now = Date.now()
      const deltaSec = Math.round((now - lastBeatAt) / 1000)
      lastBeatAt = now
      if (deltaSec < 1 || deltaSec > 120) return // Ausreißer wegwerfen
      activeSecondsRef.current += deltaSec
      sendEvent('heartbeat', { activeSeconds: deltaSec })
    }, HEARTBEAT_MS)

    // Beim Tab-Verlassen / Unload finalen view_close schicken
    function onPageHide() {
      sendBeacon('view_close', {
        totalActiveSeconds: activeSecondsRef.current,
      })
    }
    window.addEventListener('pagehide', onPageHide)
    cleanupFns.push(() => window.removeEventListener('pagehide', onPageHide))

    function setupTrackers() {
      // ---- Section-Sichtbarkeit ----
      const sections = document.querySelectorAll<HTMLElement>('[data-track-section]')
      const seen = new Set<string>()
      const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const id = (e.target as HTMLElement).dataset.trackSection
            if (!id) continue

            if (e.intersectionRatio > 0.5) {
              if (!seen.has(id) && !pendingTimers.has(id)) {
                const t = setTimeout(() => {
                  if (seen.has(id)) return
                  seen.add(id)
                  pendingTimers.delete(id)
                  sendEvent('section_view', {
                    sectionId: id,
                    sectionType: (e.target as HTMLElement).dataset.trackType || null,
                    index: Number((e.target as HTMLElement).dataset.trackIndex || 0),
                  })
                }, 1500)
                pendingTimers.set(id, t)
              }
            } else {
              const t = pendingTimers.get(id)
              if (t) {
                clearTimeout(t)
                pendingTimers.delete(id)
              }
            }
          }
        },
        { threshold: [0.5] }
      )
      sections.forEach((s) => io.observe(s))
      cleanupFns.push(() => {
        io.disconnect()
        pendingTimers.forEach((t) => clearTimeout(t))
        pendingTimers.clear()
      })

      // ---- Link-Klicks ----
      function onClick(ev: MouseEvent) {
        const target = ev.target as HTMLElement | null
        if (!target) return
        const a = target.closest('a') as HTMLAnchorElement | null
        if (!a) return
        const href = a.getAttribute('href') || ''
        if (!href || href.startsWith('#')) return

        sendEvent('link_click', {
          href: href.slice(0, 500),
          label: (a.textContent || '').trim().slice(0, 80),
          sectionId:
            a.closest<HTMLElement>('[data-track-section]')?.dataset.trackSection || null,
        })
      }
      document.addEventListener('click', onClick, true)
      cleanupFns.push(() => document.removeEventListener('click', onClick, true))

      // ---- Video-Tracking (HTML5 <video>) ----
      const videos = document.querySelectorAll<HTMLVideoElement>('video')
      videos.forEach((v) => {
        const id = v.dataset.trackVideoId || v.currentSrc || 'video'
        const sectionId =
          v.closest<HTMLElement>('[data-track-section]')?.dataset.trackSection || null
        const milestones = new Set<number>()

        const onPlay = () => sendEvent('video_play', { videoId: id, sectionId })
        const onTimeUpdate = () => {
          if (!v.duration || !isFinite(v.duration)) return
          const p = Math.floor((v.currentTime / v.duration) * 100)
          for (const m of [25, 50, 75, 100]) {
            if (p >= m && !milestones.has(m)) {
              milestones.add(m)
              sendEvent('video_progress', { videoId: id, percent: m, sectionId })
            }
          }
        }
        v.addEventListener('play', onPlay)
        v.addEventListener('timeupdate', onTimeUpdate)
        cleanupFns.push(() => {
          v.removeEventListener('play', onPlay)
          v.removeEventListener('timeupdate', onTimeUpdate)
        })
      })
      // YouTube/Vimeo/TikTok via Postmessage: später in Phase 2 nachrüsten.
    }

    return () => {
      cancelled = true
      if (beatInterval) clearInterval(beatInterval)
      cleanupFns.forEach((fn) => {
        try {
          fn()
        } catch {
          // egal
        }
      })
    }
  }, [targetType, targetSlug, disabled])
}
