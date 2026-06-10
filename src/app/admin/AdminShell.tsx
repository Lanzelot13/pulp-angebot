'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { IconDashboard, IconFileText, IconUser, IconBuilding, IconShare2, IconLogout, IconPresentation, IconLayers } from './Icons'
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

  // Pulpies und Lovebrands sind Pitch-Submenüs unter /admin/modules
  // (siehe ModulesSubnav). Sie tauchen nicht in der Sidebar als eigene
  // Punkte auf, damit das Hauptmenü ruhig bleibt.
  const nav = [
    { href: '/admin', label: 'Dashboard', icon: <IconDashboard size={18} /> },
    { href: '/admin/offers', label: 'Angebote', icon: <IconFileText size={18} /> },
    { href: '/admin/pitches', label: 'Pitches', icon: <IconPresentation size={18} /> },
    { href: '/admin/modules', label: 'Module', icon: <IconLayers size={18} /> },
    { href: '/admin/contacts', label: 'Ansprechpersonen', icon: <IconUser size={18} /> },
    { href: '/admin/references', label: 'Referenzen', icon: <IconBuilding size={18} /> },
    { href: '/admin/channels', label: 'Kanäle', icon: <IconShare2 size={18} /> },
  ]

  // Module-Subnav highlighting: /admin/modules, /admin/pulpies, /admin/lovebrands
  // sollen alle den "Module"-Eintrag aktiv markieren.
  const moduleSubpaths = ['/admin/modules', '/admin/pulpies', '/admin/lovebrands']

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
                : item.href === '/admin/modules'
                  ? moduleSubpaths.some((p) => pathname.startsWith(p))
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
