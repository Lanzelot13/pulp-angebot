'use client'

import { useState } from 'react'
import { AdminShell } from '../AdminShell'

interface Result {
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
  const [result, setResult] = useState<Result | null>(null)

  const analyze = async () => {
    if (!url.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
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
        setResult(data)
      }
    } catch {
      setError('Netzwerkfehler. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  const erPct = (v: number) => v.toFixed(2).replace('.', ',') + '%'

  // Balken relativ zum groessten der drei Werte
  const barMax = result
    ? Math.max(result.er, result.benchmark.topBrand.er, result.benchmark.avgEr, 0.001)
    : 1

  return (
    <AdminShell>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .bm-wrap { padding: 32px 40px; max-width: 760px; }
          .bm-input-row { display:flex; gap:10px; margin-top:20px; flex-wrap:wrap; }
          .bm-input { flex:1; min-width:260px; padding:12px 14px; border:1px solid #ddd; border-radius:8px; font-size:14px; font-family:'Roboto',sans-serif; outline:none; }
          .bm-input:focus { border-color:#ff1900; }
          .bm-btn { background:#ff1900; color:#fff; border:none; padding:12px 26px; border-radius:8px; font-weight:700; font-size:14px; cursor:pointer; letter-spacing:.03em; }
          .bm-btn:disabled { opacity:.5; cursor:default; }
          .bm-hint { color:#888; font-size:12px; margin-top:8px; }
          .bm-loading { margin-top:28px; color:#666; font-size:14px; display:flex; align-items:center; gap:12px; }
          .bm-spinner { width:18px; height:18px; border:2px solid #eee; border-top-color:#ff1900; border-radius:50%; animation:bmspin .7s linear infinite; }
          @keyframes bmspin { to { transform:rotate(360deg); } }
          .bm-error { margin-top:24px; background:#fff0ef; border:1px solid #ffd3ce; color:#c0271b; padding:14px 16px; border-radius:8px; font-size:14px; }

          /* Dunkle Ergebnis-Karte im Brand-Monitor-Look */
          .bm-card { margin-top:28px; background:#0a0a0a; color:#f0f0f0; border-radius:14px; padding:34px 36px; font-family:'Roboto',sans-serif; }
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
      <div className="bm-wrap">
        <h1 style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, letterSpacing: '.01em' }}>
          Brand Monitor
        </h1>
        <p style={{ color: '#666', fontSize: 14, marginTop: 6 }}>
          TikTok- oder Instagram-Profil eingeben und die Social-Kennzahlen live ziehen. Ergebnisse
          werden nicht gespeichert.
        </p>

        <div className="bm-input-row">
          <input
            className="bm-input"
            type="text"
            placeholder="https://www.tiktok.com/@marke  oder  https://www.instagram.com/marke"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyze()}
          />
          <button className="bm-btn" onClick={analyze} disabled={loading}>
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

        {result && (
          <div className="bm-card">
            <div className="bm-card-top">
              <div>
                <div className="bm-handle">@{result.handle}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 6, textTransform: 'uppercase', letterSpacing: '.1em' }}>
                  {result.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
                  {result.metrics.followers != null && ` · ${fmt(result.metrics.followers)} Follower`}
                </div>
              </div>
              <div className="bm-rankbox">
                <div className="bm-rankbadge" style={{ background: RANK_COLOR[result.rank] }}>
                  {result.rank}
                </div>
                <div className="bm-rankmeta">
                  Rank<br />Eng.-Rate<br />{RANK_LABEL[result.rank]}
                </div>
              </div>
            </div>

            <div className="bm-kpis">
              <div>
                <div className="bm-kpi-val">{result.postsScraped}</div>
                <div className="bm-kpi-label">Posts</div>
              </div>
              <div>
                <div className="bm-kpi-val">{fmt(result.metrics.views)}</div>
                <div className="bm-kpi-label">Views</div>
              </div>
              <div>
                <div className="bm-kpi-val">{fmt(result.metrics.interactions)}</div>
                <div className="bm-kpi-label">Interaktionen</div>
              </div>
              <div>
                <div className="bm-kpi-val accent">{erPct(result.er)}</div>
                <div className="bm-kpi-label">Engagement Rate</div>
              </div>
            </div>

            <div className="bm-cmp-title">Engagement-Rate im Vergleich</div>

            <div className="bm-bar-row">
              <div className="bm-bar-label">@{result.handle} #{result.benchmark.position}</div>
              <div className="bm-bar-track">
                <div className="bm-bar-fill" style={{ width: `${(result.er / barMax) * 100}%`, background: '#ff1900' }} />
              </div>
              <div className="bm-bar-val">{erPct(result.er)}</div>
            </div>
            <div className="bm-bar-row">
              <div className="bm-bar-label">@{result.benchmark.topBrand.handle} #1</div>
              <div className="bm-bar-track">
                <div className="bm-bar-fill" style={{ width: `${(result.benchmark.topBrand.er / barMax) * 100}%`, background: '#666' }} />
              </div>
              <div className="bm-bar-val">{erPct(result.benchmark.topBrand.er)}</div>
            </div>
            <div className="bm-bar-row">
              <div className="bm-bar-label">Ø alle erfassten Marken</div>
              <div className="bm-bar-track">
                <div className="bm-bar-fill" style={{ width: `${(result.benchmark.avgEr / barMax) * 100}%`, background: '#444' }} />
              </div>
              <div className="bm-bar-val">{erPct(result.benchmark.avgEr)}</div>
            </div>

            <div className="bm-foot">
              <span><b>{fmt(result.metrics.likes)}</b> Likes</span>
              <span><b>{fmt(result.metrics.comments)}</b> Kommentare</span>
              {result.platform === 'tiktok' && <span><b>{fmt(result.metrics.shares)}</b> Shares</span>}
              {result.platform === 'tiktok' && <span><b>{fmt(result.metrics.saves)}</b> Saves</span>}
              <a href={result.profileUrl} target="_blank" rel="noreferrer">Profil öffnen →</a>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
