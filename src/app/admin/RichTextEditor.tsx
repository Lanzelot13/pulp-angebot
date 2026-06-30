'use client'

// =========================================================
// RichTextEditor – minimaler WYSIWYG für den Module-Body
// =========================================================
//
// contentEditable + kleine Toolbar (Fett, Kursiv, Unterstrichen, Link).
// Nutzt document.execCommand. Der Output ist HTML (sanitisiert beim
// Speichern in der Modulseite). Wir speichern nicht innerHTML bei jedem
// Tastendruck zurück in den State, sondern syncen den Wert über einen
// Ref/effect und feuern onChange beim onInput.

import { useEffect, useRef } from 'react'

interface RichTextEditorProps {
  value: string
  onChange: (next: string) => void
  placeholder?: string
}

function exec(cmd: string, arg?: string) {
  // execCommand ist deprecated, läuft aber stabil in allen aktuellen Browsern
  // für unsere Mini-Formatierung. Reicht für den internen Editor.
  document.execCommand(cmd, false, arg)
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Initial einsetzen + bei externem value-Wechsel (z.B. neues Modul
  // im Modal) den Inhalt synchronisieren, ohne den Cursor beim Tippen
  // zu zerschießen.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.innerHTML !== value) el.innerHTML = value || ''
  }, [value])

  const handleLink = () => {
    const url = prompt('Link-URL eingeben:', 'https://')
    if (!url) return
    exec('createLink', url)
  }

  const buttonStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    background: '#fff',
    padding: '4px 10px',
    fontSize: 13,
    fontFamily: 'JetBrains Mono, monospace',
    borderRadius: 4,
    cursor: 'pointer',
    color: '#444',
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        <button
          type="button"
          style={{ ...buttonStyle, fontWeight: 700 }}
          onMouseDown={(e) => {
            e.preventDefault()
            exec('bold')
          }}
          title="Fett (Strg+B)"
        >
          B
        </button>
        <button
          type="button"
          style={{ ...buttonStyle, fontStyle: 'italic' }}
          onMouseDown={(e) => {
            e.preventDefault()
            exec('italic')
          }}
          title="Kursiv (Strg+I)"
        >
          I
        </button>
        <button
          type="button"
          style={{ ...buttonStyle, textDecoration: 'underline' }}
          onMouseDown={(e) => {
            e.preventDefault()
            exec('underline')
          }}
          title="Unterstrichen (Strg+U)"
        >
          U
        </button>
        <button
          type="button"
          style={buttonStyle}
          onMouseDown={(e) => {
            e.preventDefault()
            handleLink()
          }}
          title="Link einfügen"
        >
          🔗
        </button>
        <button
          type="button"
          style={{ ...buttonStyle, color: '#a8201a' }}
          onMouseDown={(e) => {
            e.preventDefault()
            exec('removeFormat')
          }}
          title="Formatierung entfernen"
        >
          ✕
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        data-placeholder={placeholder}
        style={{
          minHeight: 80,
          width: '100%',
          padding: '10px 14px',
          border: '1px solid #ddd',
          borderRadius: 8,
          fontSize: 14,
          fontFamily: 'Roboto, sans-serif',
          background: '#fff',
          color: '#111',
          lineHeight: 1.5,
          outline: 'none',
        }}
      />
      <style>{`
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #aaa;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
