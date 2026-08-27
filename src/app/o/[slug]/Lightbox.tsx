'use client'

import { useEffect } from 'react'
import styles from './offer2.module.css'

interface LightboxImage {
  url: string
  caption?: string
}

interface Props {
  images: LightboxImage[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

// Overlay-Lightbox für Moodboard-Bilder. Escape schließt, Pfeile navigieren.
// Klick auf den Hintergrund schließt ebenfalls, auf Bild + Buttons nicht.
export function Lightbox({ images, index, onClose, onPrev, onNext }: Props) {
  const current = images[index]

  // Body-Scroll sperren, während die Lightbox offen ist.
  //
  // Nicht mit `overflow: hidden` — das setzt in Safari die Scroll-Position auf 0
  // zurück und beim Schließen sind alle Sections darunter noch nicht durch den
  // Reveal-Observer sichtbar gemacht worden (sehen wie "ausgeblendet" aus).
  // Stattdessen: Body auf position: fixed mit negativem top einfrieren.
  // Nach dem Schließen zurückscrollen auf die alte Position.
  //
  // Eigener Effect mit []-Deps, damit er bei Parent-Re-Renders nicht neu läuft.
  useEffect(() => {
    const scrollY = window.scrollY
    const prevPos = document.body.style.position
    const prevTop = document.body.style.top
    const prevWidth = document.body.style.width
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    return () => {
      document.body.style.position = prevPos
      document.body.style.top = prevTop
      document.body.style.width = prevWidth
      window.scrollTo(0, scrollY)
    }
  }, [])

  // Key-Handler darf ruhig neu registriert werden, wenn sich die Callbacks
  // ändern — er nutzt sie ja direkt.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onPrev()
      else if (e.key === 'ArrowRight') onNext()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, onPrev, onNext])

  if (!current) return null
  const hasMultiple = images.length > 1

  return (
    <div
      className={styles.lightboxOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        className={styles.lightboxClose}
        onClick={(e) => { e.stopPropagation(); onClose() }}
        aria-label="Schließen"
        type="button"
      >
        ×
      </button>

      {hasMultiple && (
        <button
          className={styles.lightboxPrev}
          onClick={(e) => { e.stopPropagation(); onPrev() }}
          aria-label="Vorheriges Bild"
          type="button"
        >
          ‹
        </button>
      )}

      <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.caption || `Bild ${index + 1}`}
          className={styles.lightboxImage}
        />
        {current.caption && (
          <div className={styles.lightboxCaption}>{current.caption}</div>
        )}
        {hasMultiple && (
          <div className={styles.lightboxCounter}>
            {index + 1} / {images.length}
          </div>
        )}
      </div>

      {hasMultiple && (
        <button
          className={styles.lightboxNext}
          onClick={(e) => { e.stopPropagation(); onNext() }}
          aria-label="Nächstes Bild"
          type="button"
        >
          ›
        </button>
      )}
    </div>
  )
}
