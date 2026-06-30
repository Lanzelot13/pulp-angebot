'use client'

import { useState } from 'react'
import { PitchModuleType } from '@/lib/pitch-types'
import { MODULE_SCHEMA } from './module-schema-help'

interface SchemaHelpProps {
  type: PitchModuleType
}

// Kollabierbare Box, die unter dem JSON-Editor steht und für den
// aktuell gewählten Modul-Typ alle erlaubten Felder mit Typ,
// Pflicht-Markierung, Beschreibung und Beispiel listet.
export function SchemaHelp({ type }: SchemaHelpProps) {
  const [open, setOpen] = useState(false)
  const fields = MODULE_SCHEMA[type] || []

  return (
    <div
      style={{
        marginTop: 10,
        border: '1px solid #eee',
        borderRadius: 8,
        background: '#fafafa',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '10px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: 13,
          fontFamily: 'JetBrains Mono, monospace',
          color: '#444',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>
          {open ? '▾' : '▸'} Schema-Hilfe ({fields.length} Felder)
        </span>
        <span style={{ color: '#aaa', fontSize: 11 }}>
          {open ? 'einklappen' : 'aufklappen'}
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #eee' }}>
          <table
            style={{
              width: '100%',
              fontSize: 12,
              borderCollapse: 'collapse',
              marginTop: 8,
            }}
          >
            <thead>
              <tr style={{ textAlign: 'left', color: '#888' }}>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #eee' }}>Feld</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #eee' }}>Typ</th>
                <th style={{ padding: '6px 8px', borderBottom: '1px solid #eee' }}>Beschreibung</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.name} style={{ verticalAlign: 'top' }}>
                  <td
                    style={{
                      padding: '6px 8px',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: '#222',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.name}
                    {f.required && <span style={{ color: '#FF1900' }}> *</span>}
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: '#666',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.type}
                  </td>
                  <td style={{ padding: '6px 8px', color: '#444' }}>
                    {f.description}
                    {f.example && (
                      <div
                        style={{
                          marginTop: 4,
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 11,
                          color: '#888',
                        }}
                      >
                        z.B. {f.example}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 10, fontSize: 11, color: '#888' }}>
            <span style={{ color: '#FF1900' }}>*</span> Pflichtfeld.
            Standard-Header-Felder (eyebrow, headline, sub) sind optional, der Renderer
            nutzt sonst den eingebauten Default. In headline wird `**Text**` rot dargestellt.
          </div>
        </div>
      )}
    </div>
  )
}
