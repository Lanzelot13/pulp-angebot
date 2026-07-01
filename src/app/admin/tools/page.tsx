'use client'

import { useCallback, useEffect, useState } from 'react'
import { AdminShell } from '../AdminShell'
import styles from '../admin.module.css'

interface Scan {
  id: string
  scrapedAt: string
  platform: 'tiktok' | 'instagram'
  handle: string
  displayName: string | null
  avatar: string | null
  profileUrl: string
  postsScraped: number
  metrics: {
    views: number
    likes: number
    comments: number
    shares: number
    saves: number
    interactions: number
    followers: number | null
  }
  er: number
  rank: 'A' | 'B' | 'C' | 'D'
  benchmark: {
    avgEr: number
    accountCount: number
    position: number
    topBrand: { handle: string; er: number }
  }
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace('.', ',') + 'Mrd'
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.', ',') + 'K'
  return n.toLocaleString('de-AT')
}

const erPct = (v: number) => v.toFixed(2).replace('.', ',') + '%'

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })
}

const RANK_LABEL: Record<string, string> = {
  A: '> 1,5%',
  B: '0,5–1,5%',
  C: '0,05–0,5%',
  D: '≤ 0,05%',
}
const RANK_COLOR: Record<string, string> = {
  A: '#00e676',
  B: '#2979ff',
  C: '#ffd600',
  D: '#ff1900',
}

export default function ToolsPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scans, setScans] = useState<Scan[]>([])
  const [selected, setSelected] = useState<Scan | null>(null)
  const [showBenchmark, setShowBenchmark] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadScans = useCallback(() => {
    fetch('/api/admin/tools/brandmonitor')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (Array.isArray(d)) setScans(d) })
      .catch(() => {})
  }, [])

  useEffect(() => { loadScans() }, [loadScans])

  const analyze = async () => {
    if (!url.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/tools/brandmonitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Etwas ist schiefgelaufen.')
      } else {
        setUrl('')
        setSelected(data)
        loadScans()
      }
    } catch {
      setError('Netzwerkfehler. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Diesen Scan löschen?')) return
    setDeleting(id)
    await fetch(`/api/admin/tools/brandmonitor/${id}`, { method: 'DELETE' }).catch(() => {})
    setDeleting(null)
    if (selected?.id === id) setSelected(null)
    loadScans()
  }

  const barMax = selected
    ? Math.max(selected.er, selected.benchmark.topBrand.er, selected.benchmark.avgEr, 0.001)
    : 1

  return (
    <AdminShell>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .bm-input-row { display:flex; gap:10px; margin-bottom:8px; flex-wrap:wrap; }
          .bm-input-row .bm-field { flex:1; min-width:260px; }
          .bm-hint { color:#888; font-size:12px; }
          .bm-loading { margin-top:20px; color:#666; font-size:14px; display:flex; align-items:center; gap:12px; }
          .bm-spinner { width:18px; height:18px; border:2px solid #eee; border-top-color:#ff1900; border-radius:50%; animation:bmspin .7s linear infinite; }
          @keyframes bmspin { to { transform:rotate(360deg); } }
          .bm-error { margin-top:16px; background:#fff0ef; border:1px solid #ffd3ce; color:#c0271b; padding:14px 16px; border-radius:8px; font-size:14px; }

          .bm-plat { display:inline-block; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; padding:3px 8px; border-radius:4px; }
          .bm-plat.tiktok { background:#111; color:#fff; }
          .bm-plat.instagram { background:#ffe9f3; color:#c13584; }
          .bm-rank-pill { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:5px; font-weight:800; font-size:12px; color:#0a0a0a; }

          .bm-toggle { display:inline-flex; align-items:center; gap:8px; font-size:13px; color:#555; cursor:pointer; user-select:none; margin-bottom:16px; }
          .bm-toggle input { accent-color:#ff1900; width:16px; height:16px; cursor:pointer; }

          /* Dunkle Ergebnis-Karte im Brand-Monitor-Look */
          .bm-card { background:#0a0a0a; color:#f0f0f0; border-radius:12px; padding:34px 36px; font-family:'Roboto',sans-serif; }
          .bm-card-top { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
          .bm-handle { font-family:'Anton',sans-serif; font-size:34px; color:#ff1900; letter-spacing:.01em; line-height:1; word-break:break-word; }
          .bm-rankbox { display:flex; align-items:center; gap:12px; }
          .bm-rankbadge { font-family:'Anton',sans-serif; font-size:26px; width:52px; height:52px; border-radius:8px; display:flex; align-items:center; justify-content:center; color:#0a0a0a; }
          .bm-rankmeta { font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:#888; line-height:1.5; }
          .bm-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:34px; }
          .bm-kpi-val { font-family:'Anton',sans-serif; font-size:40px; line-height:1; }
          .bm-kpi-val.accent { color:#ff1900; }
          .bm-kpi-label { font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:#888; margin-top:8px; }
          .bm-cmp-title { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#888; margin:40px 0 16px; }
          .bm-bar-row { display:grid; grid-template-columns:190px 1fr 64px; align-items:center; gap:14px; margin-bottom:12px; }
          .bm-bar-label { font-size:13px; color:#f0f0f0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
          .bm-bar-track { background:#222; height:14px; border-radius:7px; overflow:hidden; }
          .bm-bar-fill { height:100%; border-radius:7px; }
          .bm-bar-val { font-size:13px; color:#ff1900; text-align:right; font-weight:700; }
          .bm-foot { display:flex; gap:26px; flex-wrap:wrap; margin-top:34px; padding-top:22px; border-top:1px solid #222; font-size:13px; color:#bbb; }
          .bm-foot b { color:#f0f0f0; }
          .bm-foot a { color:#ff1900; text-decoration:none; margin-left:auto; }
          @media (max-width:640px){ .bm-kpis{grid-template-columns:repeat(2,1fr);} .bm-bar-row{grid-template-columns:120px 1fr 56px;} }
        `,
        }}
      />

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Brand Monitor</h1>
        <div className={styles.pageSub}>
          TikTok- oder Instagram-Profil eingeben und die Social-Kennzahlen live ziehen. Jeder Scan wird gespeichert.
        </div>
      </div>

      {!selected && (
        <>
          <div className="bm-input-row">
            <input
              className={`${styles.formInput} bm-field`}
              type="text"
              placeholder="https://www.tiktok.com/@marke  oder  https://www.instagram.com/marke"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && analyze()}
            />
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={analyze} disabled={loading}>
              {loading ? 'Analysiere…' : 'Analysieren →'}
            </button>
          </div>
          <div className="bm-hint">
            Analysiert die letzten ~50 Beiträge. Der Scrape kann bis zu ein bis zwei Minuten dauern.
          </div>

          {loading && (
            <div className="bm-loading">
              <div className="bm-spinner" />
              Scrape läuft, bitte kurz Geduld…
            </div>
          )}
          {error && <div className="bm-error">{error}</div>}

          <div className={styles.sectionHeader} style={{ marginTop: 32 }}>
            <div className={styles.sectionTitle}>Gespeicherte Scans</div>
          </div>

          <div className={styles.card}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Plattform</th>
                  <th>Account</th>
                  <th>ER</th>
                  <th>Rank</th>
                  <th>Views</th>
                  <th>Follower</th>
                  <th>Gescannt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <tr key={s.id} className={styles.clickableRow} onClick={() => { setSelected(s); setShowBenchmark(true) }}>
                    <td><span className={`bm-plat ${s.platform}`}>{s.platform === 'tiktok' ? 'TikTok' : 'Instagram'}</span></td>
                    <td style={{ fontWeight: 600 }}>@{s.handle}</td>
                    <td style={{ color: RANK_COLOR[s.rank], fontWeight: 700 }}>{erPct(s.er)}</td>
                    <td><span className="bm-rank-pill" style={{ background: RANK_COLOR[s.rank] }}>{s.rank}</span></td>
                    <td>{fmt(s.metrics.views)}</td>
                    <td>{fmt(s.metrics.followers)}</td>
                    <td style={{ color: '#888', whiteSpace: 'nowrap' }}>{fmtDate(s.scrapedAt)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={`${styles.btn} ${styles.btnGhost} ${styles.btnSmall} ${styles.btnDanger}`}
                          onClick={(e) => remove(s.id, e)}
                          disabled={deleting === s.id}
                        >
                          {deleting === s.id ? '…' : 'Löschen'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {scans.length === 0 && !loading && (
                  <tr><td colSpan={8} className={styles.emptyState}><div className={styles.emptyText}>Noch keine Scans gespeichert</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selected && (
        <>
          <a
            className={styles.backLink}
            href="#"
            onClick={(e) => { e.preventDefault(); setSelected(null) }}
          >
            ← Zurück zur Liste
          </a>

          <label className="bm-toggle" style={{ display: 'flex', marginTop: 12 }}>
            <input
              type="checkbox"
              checked={showBenchmark}
              onChange={(e) => setShowBenchmark(e.target.checked)}
            />
            Benchmark-Vergleich anzeigen
          </label>

          <div className="bm-card">
            <div className="bm-card-top">
              <div>
                <div className="bm-handle">@{selected.handle}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 6, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                  {selected.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
                  {selected.metrics.followers != null && ` · ${fmt(selected.metrics.followers)} Follower`}
                  {` · gescannt ${fmtDate(selected.scrapedAt)}`}
                </div>
              </div>
              <div className="bm-rankbox">
                <div className="bm-rankbadge" style={{ background: RANK_COLOR[selected.rank] }}>{selected.rank}</div>
                <div className="bm-rankmeta">Rank<br />Eng.-Rate<br />{RANK_LABEL[selected.rank]}</div>
              </div>
            </div>

            <div className="bm-kpis">
              <div>
                <div className="bm-kpi-val">{selected.postsScraped}</div>
                <div className="bm-kpi-label">Posts</div>
              </div>
              <div>
                <div className="bm-kpi-val">{fmt(selected.metrics.views)}</div>
                <div className="bm-kpi-label">Views</div>
              </div>
              <div>
                <div className="bm-kpi-val">{fmt(selected.metrics.interactions)}</div>
                <div className="bm-kpi-label">Interaktionen</div>
              </div>
              <div>
                <div className="bm-kpi-val accent">{erPct(selected.er)}</div>
                <div className="bm-kpi-label">Engagement Rate</div>
              </div>
            </div>

            {showBenchmark && (
              <>
                <div className="bm-cmp-title">Engagement-Rate im Vergleich</div>
                <div className="bm-bar-row">
                  <div className="bm-bar-label">@{selected.handle} #{selected.benchmark.position}</div>
                  <div className="bm-bar-track">
                    <div className="bm-bar-fill" style={{ width: `${(selected.er / barMax) * 100}%`, background: '#ff1900' }} />
                  </div>
                  <div className="bm-bar-val">{erPct(selected.er)}</div>
                </div>
                <div className="bm-bar-row">
                  <div className="bm-bar-label">@{selected.benchmark.topBrand.handle} #1</div>
                  <div className="bm-bar-track">
                    <div className="bm-bar-fill" style={{ width: `${(selected.benchmark.topBrand.er / barMax) * 100}%`, background: '#666' }} />
                  </div>
                  <div className="bm-bar-val">{erPct(selected.benchmark.topBrand.er)}</div>
                </div>
                <div className="bm-bar-row">
                  <div className="bm-bar-label">Ø alle erfassten Marken</div>
                  <div className="bm-bar-track">
                    <div className="bm-bar-fill" style={{ width: `${(selected.benchmark.avgEr / barMax) * 100}%`, background: '#444' }} />
                  </div>
                  <div className="bm-bar-val">{erPct(selected.benchmark.avgEr)}</div>
                </div>
              </>
            )}

            <div className="bm-foot">
              <span><b>{fmt(selected.metrics.likes)}</b> Likes</span>
              <span><b>{fmt(selected.metrics.comments)}</b> Kommentare</span>
              {selected.platform === 'tiktok' && <span><b>{fmt(selected.metrics.shares)}</b> Shares</span>}
              {selected.platform === 'tiktok' && <span><b>{fmt(selected.metrics.saves)}</b> Saves</span>}
              <a href={selected.profileUrl} target="_blank" rel="noreferrer">Profil öffnen →</a>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  )
}
