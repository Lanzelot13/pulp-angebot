import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { BRANDMONITOR_BENCHMARK } from '@/lib/brandmonitorBenchmark'

export const dynamic = 'force-dynamic'
// Apify-Profil-Scrapes dauern je nach Anzahl Posts 20-90s. Vercel Pro erlaubt bis 300s.
export const maxDuration = 300

type Platform = 'tiktok' | 'instagram'

interface ParsedInput {
  platform: Platform
  handle: string
  profileUrl: string
}

// Erkennt Plattform + Handle aus einem eingegebenen Link (oder @handle).
function parseInput(raw: string): ParsedInput | null {
  const input = raw.trim()
  if (!input) return null

  const lower = input.toLowerCase()

  // TikTok
  if (lower.includes('tiktok.com')) {
    const m = input.match(/tiktok\.com\/@?([A-Za-z0-9._]+)/i)
    if (m) {
      const handle = m[1].replace(/^@/, '')
      return { platform: 'tiktok', handle, profileUrl: `https://www.tiktok.com/@${handle}` }
    }
  }

  // Instagram
  if (lower.includes('instagram.com')) {
    const m = input.match(/instagram\.com\/([A-Za-z0-9._]+)/i)
    if (m) {
      const handle = m[1].replace(/^@/, '')
      return { platform: 'instagram', handle, profileUrl: `https://www.instagram.com/${handle}/` }
    }
  }

  // Blosser @handle ohne Domain -> nicht eindeutig, wir nehmen an TikTok nur wenn @ davor
  return null
}

interface Metrics {
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  posts: number
  followers: number | null
  avatar: string | null
  displayName: string | null
}

// --- Apify-Aufruf: startet den Actor und wartet synchron auf die Datensaetze ---
async function runApify(actorId: string, input: unknown, token: string): Promise<unknown[]> {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(
    token
  )}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Apify-Fehler (${res.status}): ${text.slice(0, 300)}`)
  }
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return typeof n === 'number' && isFinite(n) ? n : 0
}

// TikTok-Aggregation (clockworks/tiktok-scraper)
async function scrapeTikTok(handle: string, limit: number, token: string): Promise<Metrics> {
  const items = await runApify(
    'clockworks~tiktok-scraper',
    {
      profiles: [handle],
      resultsPerPage: limit,
      profileScrapeSections: ['videos'],
      profileSorting: 'latest',
      excludePinnedPosts: false,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadAvatars: false,
    },
    token
  )

  const m: Metrics = {
    views: 0, likes: 0, comments: 0, shares: 0, saves: 0,
    posts: 0, followers: null, avatar: null, displayName: null,
  }
  for (const it of items as Record<string, unknown>[]) {
    if (!it) continue
    m.views += num(it.playCount)
    m.likes += num(it.diggCount)
    m.comments += num(it.commentCount)
    m.shares += num(it.shareCount)
    m.saves += num(it.collectCount)
    m.posts += 1
    const author = it.authorMeta as Record<string, unknown> | undefined
    if (author && m.followers === null) {
      m.followers = num(author.fans) || null
      m.avatar = (author.avatar as string) || null
      m.displayName = (author.nickName as string) || (author.name as string) || null
    }
  }
  return m
}

// Instagram-Aggregation (apify/instagram-scraper) - defensiv, Felder beim ersten Live-Test verifizieren
async function scrapeInstagram(profileUrl: string, limit: number, token: string): Promise<Metrics> {
  const items = await runApify(
    'apify~instagram-scraper',
    {
      directUrls: [profileUrl],
      resultsType: 'posts',
      resultsLimit: limit,
      addParentData: true,
    },
    token
  )

  const m: Metrics = {
    views: 0, likes: 0, comments: 0, shares: 0, saves: 0,
    posts: 0, followers: null, avatar: null, displayName: null,
  }
  for (const it of items as Record<string, unknown>[]) {
    if (!it) continue
    // Views nur bei Reels/Videos vorhanden
    m.views += num(it.videoPlayCount) || num(it.videoViewCount) || num(it.playCount)
    m.likes += num(it.likesCount)
    m.comments += num(it.commentsCount)
    // IG liefert Shares/Saves oeffentlich nicht
    m.posts += 1
    if (m.followers === null) {
      m.followers =
        num(it.ownerFollowersCount) ||
        num((it.owner as Record<string, unknown>)?.followersCount) ||
        num(it.followersCount) ||
        null
      m.avatar =
        (it.ownerProfilePicUrl as string) ||
        ((it.owner as Record<string, unknown>)?.profilePicUrl as string) ||
        null
      m.displayName =
        (it.ownerFullName as string) || (it.ownerUsername as string) || null
    }
  }
  return m
}

function rankFromEr(er: number): 'A' | 'B' | 'C' | 'D' {
  if (er > 1.5) return 'A'
  if (er > 0.5) return 'B'
  if (er > 0.05) return 'C'
  return 'D'
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) return authResult

  const token = process.env.APIFY_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: 'APIFY_TOKEN ist nicht gesetzt. Bitte in den Vercel-Umgebungsvariablen hinterlegen.' },
      { status: 500 }
    )
  }

  let body: { url?: string; limit?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ungueltiger Request-Body.' }, { status: 400 })
  }

  const parsed = parseInput(body.url || '')
  if (!parsed) {
    return NextResponse.json(
      { error: 'Bitte einen gueltigen TikTok- oder Instagram-Profil-Link eingeben.' },
      { status: 400 }
    )
  }

  // Anzahl Posts pro Scrape - Kosten/Genauigkeit. Default 50, max 200.
  const limit = Math.min(Math.max(Number(body.limit) || 50, 1), 200)

  let metrics: Metrics
  try {
    metrics =
      parsed.platform === 'tiktok'
        ? await scrapeTikTok(parsed.handle, limit, token)
        : await scrapeInstagram(parsed.profileUrl, limit, token)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scrape fehlgeschlagen.' },
      { status: 502 }
    )
  }

  if (metrics.posts === 0) {
    return NextResponse.json(
      { error: 'Keine Posts gefunden. Profil privat, leer oder Link falsch?' },
      { status: 404 }
    )
  }

  const interactions = metrics.likes + metrics.comments + metrics.shares + metrics.saves
  const er = metrics.views > 0 ? (interactions / metrics.views) * 100 : 0
  const rank = rankFromEr(er)

  // Benchmark-Vergleich
  const bench = BRANDMONITOR_BENCHMARK[parsed.platform]
  const higherCount = bench.brands.filter((b) => b.er > er).length
  const position = higherCount + 1 // Rangplatz inkl. des abgefragten Accounts
  const topBrand = bench.brands[0]

  return NextResponse.json({
    platform: parsed.platform,
    handle: parsed.handle,
    displayName: metrics.displayName,
    avatar: metrics.avatar,
    profileUrl: parsed.profileUrl,
    postsScraped: metrics.posts,
    metrics: {
      views: metrics.views,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      saves: metrics.saves,
      interactions,
      followers: metrics.followers,
    },
    er,
    rank,
    benchmark: {
      avgEr: bench.avgEr,
      accountCount: bench.accountCount,
      position,
      topBrand: { handle: topBrand.handle, er: topBrand.er },
    },
  })
}
