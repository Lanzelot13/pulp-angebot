'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { IconDashboard, IconFileText, IconLogout, IconPresentation, IconSettings } from './Icons'
import styles from './admin.module.css'

interface User {
  id: number
  email: string
  name: string
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/auth')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setUser(data.user)
        } else {
          router.replace('/admin/login')
        }
        setLoading(false)
      })
      .catch(() => {
        router.replace('/admin/login')
        setLoading(false)
      })
  }, [router])

  const handleLogout = useCallback(async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.replace('/admin/login')
  }, [router])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f5', fontFamily: 'Roboto, sans-serif', color: '#888' }}>
        Laden...
      </div>
    )
  }

  if (!user) return null

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  // Hauptmenü auf drei Bereiche reduziert. Die ehemaligen eigenen Einträge
  // für Ansprechpersonen / Referenzen / Kanäle sind als horizontales
  // Submenü unter "Angebote" gruppiert (siehe OffersSubnav). Module /
  // Pulpies / Lovebrands liegen analog unter "Slidedecks" (ehemals Pitches).
  const nav = [
    { href: '/admin', label: 'Dashboard', icon: <IconDashboard size={18} /> },
    { href: '/admin/offers', label: 'Angebote', icon: <IconFileText size={18} /> },
    { href: '/admin/pitches', label: 'Slidedecks', icon: <IconPresentation size={18} /> },
    { href: '/admin/tools', label: 'Tools', icon: <IconSettings size={18} /> },
  ]

  // Subpfade, die das jeweilige Hauptmenü-Item aktiv lassen sollen
  const offersSubpaths = ['/admin/offers', '/admin/contacts', '/admin/references', '/admin/channels']
  const slidedecksSubpaths = ['/admin/pitches', '/admin/modules', '/admin/pulpies', '/admin/lovebrands']

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className={styles.sidebar}>
        <a href="/admin" className={styles.sidebarLogo}>
          <img src="/pulp-logo.svg" alt="Pulpmedia" />
          <div className={styles.sidebarLogoText}>
            <strong>angeBOT</strong>
            <small>Angebots-Tool</small>
          </div>
        </a>

        <nav style={{ flex: 1 }}>
          {nav.map((item) => {
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : item.href === '/admin/offers'
                  ? offersSubpaths.some((p) => pathname.startsWith(p))
                  : item.href === '/admin/pitches'
                    ? slidedecksSubpaths.some((p) => pathname.startsWith(p))
                    : pathname.startsWith(item.href)
            return (
              <a
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className={styles.sidebarUser}>
          <div className={styles.userAvatar}>{initials}</div>
          <div className={styles.userInfo}>
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </div>
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            title="Abmelden"
          >
            <IconLogout size={16} />
          </button>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  )
}
