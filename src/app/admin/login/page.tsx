'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../admin.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        router.replace('/admin')
      } else {
        const data = await res.json()
        setError(data.error || 'Login fehlgeschlagen')
      }
    } catch {
      setError('Netzwerkfehler – bitte erneut versuchen')
    }

    setLoading(false)
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginBox}>
        <div className={styles.loginLogo}>
          <img src="/pulp-logo.svg" alt="Pulpmedia" style={{ height: 36 }} />
        </div>
        <div className={styles.loginSubtitle}>
          PULP ange<span>BOT</span> · Admin
        </div>

        {error && <div className={styles.loginError}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.loginFormGroup}>
            <label className={styles.loginLabel}>E-Mail</label>
            <input
              type="email"
              className={styles.loginInput}
              placeholder="vorname@pulpmedia.at"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={styles.loginFormGroup}>
            <label className={styles.loginLabel}>Moco Passwort</label>
            <input
              type="password"
              className={styles.loginInput}
              placeholder="Dein Moco-Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className={styles.loginBtn}
            disabled={loading}
          >
            {loading ? 'Anmelden...' : 'Mit Moco einloggen'}
          </button>
        </form>
        <div className={styles.loginHint}>
          Login nur für Pulpmedia-Mitarbeiter mit Moco-Zugang
        </div>
      </div>
    </div>
  )
}
