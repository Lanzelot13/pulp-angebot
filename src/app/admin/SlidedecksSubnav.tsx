'use client'

import { usePathname } from 'next/navigation'

// Horizontales Submenü für den Slidedecks-Bereich: Slidedecks · Module ·
// Pulpies · Lovebrands. Slidedecks ist die Übersicht (intern: /admin/pitches),
// die anderen drei sind die wiederverwendbaren Bausteine.

const TABS: Array<{ href: string; label: string }> = [
  { href: '/admin/pitches',         label: 'Slidedecks' },
  { href: '/admin/modules',         label: 'Module' },
  { href: '/admin/pulpies',         label: 'Pulpies' },
  { href: '/admin/lovebrands',      label: 'Lovebrands' },
  { href: '/admin/case-references', label: 'Case-Referenzen' },
]

export function SlidedecksSubnav() {
  const pathname = usePathname()
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        marginBottom: 28,
        borderBottom: '1px solid #eee',
      }}
    >
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href)
        return (
          <a
            key={tab.href}
            href={tab.href}
            style={{
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              color: active ? '#FF1900' : '#666',
              textDecoration: 'none',
              borderBottom: active ? '2px solid #FF1900' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.18s, border-color 0.18s',
            }}
          >
            {tab.label}
          </a>
        )
      })}
    </div>
  )
}
