'use client'

import { useEffect, useState } from 'react'

interface CreateResult {
  slug: string
  editToken: string
  url: string
  editUrl: string
}

export default function CreateOfferPage() {
  const [status, setStatus] = useState<'loading' | 'creating' | 'success' | 'error'>('loading')
  const [result, setResult] = useState<CreateResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const hash = window.location.hash.slice(1) // remove #
    if (!hash) {
      setStatus('error')
      setError('Kein Angebots-JSON im Link gefunden. Bitte verwende einen gültigen Erstellungs-Link.')
      return
    }

    let json: string
    try {
      json = atob(hash)
    } catch {
      setStatus('error')
      setError('Link konnte nicht dekodiert werden. Bitte verwende einen gültigen Erstellungs-Link.')
      return
    }

    let data: Record<string, unknown>
    try {
      data = JSON.parse(json)
    } catch {
      setStatus('error')
      setError('Ungültiges JSON im Link. Bitte verwende einen gültigen Erstellungs-Link.')
      return
    }

    setStatus('creating')

    fetch('/api/create-offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Fehler beim Erstellen')
        }
        return res.json()
      })
      .then((res: CreateResult) => {
        setResult(res)
        setStatus('success')
      })
      .catch((err: Error) => {
        setError(err.message)
        setStatus('error')
      })
  }, [])

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Roboto', sans-serif",
      background: '#fafafa',
      padding: '2rem',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
        padding: '3rem',
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center',
      }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Link wird verarbeitet…</h1>
          </>
        )}

        {status === 'creating' && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}>🚀</div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Angebot wird erstellt…</h1>
            <p style={{ color: '#666' }}>Einen Moment bitte.</p>
          </>
        )}

        {status === 'success' && result && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Angebot erstellt!</h1>

            <div style={{
              textAlign: 'left',
              background: '#f8f8f8',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.85rem', color: '#888' }}>
                KUNDEN-LINK (zum Verschicken)
              </label>
              <a
                href={`${baseUrl}${result.url}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#e63946', wordBreak: 'break-all', fontSize: '0.95rem' }}
              >
                {baseUrl}{result.url}
              </a>

              <div style={{ margin: '1rem 0', borderTop: '1px solid #eee' }} />

              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.85rem', color: '#888' }}>
                BEARBEITUNGS-LINK (nur intern!)
              </label>
              <a
                href={`${baseUrl}${result.editUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#e63946', wordBreak: 'break-all', fontSize: '0.95rem' }}
              >
                {baseUrl}{result.editUrl}
              </a>
            </div>

            <p style={{ color: '#666', fontSize: '0.85rem', lineHeight: '1.5' }}>
              Im Bearbeitungs-Modus kannst du Texte, Pakete, Preise und Reihenfolgen direkt im Browser ändern.
              <br />
              <strong>Den Bearbeitungs-Link niemals an Kunden weitergeben!</strong>
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>❌</div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Fehler</h1>
            <p style={{ color: '#e63946' }}>{error}</p>
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
