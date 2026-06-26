'use client'

import { usePathname } from 'next/navigation'

// Horizontales Submenü, das auf allen Angebots-bezogenen Library-Seiten
// oben sitzt: Angebote · Ansprechpersonen · Referenzen · Kanäle.

const TABS: Array<{ href: string; label: string }> = [
  { href: '/admin/offers',     label: 'Angebote' },
  { href: '/admin/contacts',   label: 'Ansprechpersonen' },
  { href: '/admin/references', label: 'Referenzen' },
  { href: '/admin/channels',   label: 'Kanäle' },
]

export function OffersSubnav() {
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
