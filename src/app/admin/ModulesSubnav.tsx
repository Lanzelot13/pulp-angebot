'use client'

import { usePathname } from 'next/navigation'

// Horizontales Sub-Menü, das auf den Pitch-bezogenen Library-Seiten oben
// auftaucht: Module · Pulpies · Lovebrands. Wenn später noch Sub-Einstellungen
// dazukommen, einfach hier in TABS ergänzen.

const TABS: Array<{ href: string; label: string }> = [
  { href: '/admin/modules',    label: 'Module' },
  { href: '/admin/pulpies',    label: 'Pulpies' },
  { href: '/admin/lovebrands', label: 'Lovebrands' },
]

export function ModulesSubnav() {
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
