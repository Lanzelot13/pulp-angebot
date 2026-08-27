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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onPrev()
      else if (e.key === 'ArrowRight') onNext()
    }
    document.addEventListener('keydown', onKey)
    // Body-Scroll unterbinden, solange die Lightbox offen ist
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
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
