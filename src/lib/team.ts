// =========================================================
// Team-Daten von pulpmedia.at/people
// =========================================================
//
// Server-seitiger Fetcher mit Caching. Wir lesen die WordPress-Seite
// pulpmedia.at/people einmal pro Stunde aus und parsen das (sehr saubere)
// .team-item Markup. Bei Fehlern fallen wir auf den letzten erfolgreichen
// Cache zurück, damit eine kurze Downtime auf der Website die Pitch-Seiten
// nicht zerschießt.

import { createSlug } from './slug'

export interface Person {
  slug: string
  name: string
  role: string
  imageUrl: string
  email: string | null
  phone: string | null
}

const SOURCE_URL = 'https://www.pulpmedia.at/people/'
const CACHE_TTL_SECONDS = 3600 // 1h, wird von Next-Fetch übernommen

// Letzter erfolgreicher Snapshot (Fallback bei Fetch-Fehlern)
let lastGood: { fetchedAt: number; people: Person[] } | null = null

export async function fetchTeam(): Promise<{
  people: Person[]
  fetchedAt: number
  fromCache: boolean
}> {
  try {
    // Next.js fetch-Caching: stale-after revalidate, deduped pro Anfrage
    const res = await fetch(SOURCE_URL, {
      next: { revalidate: CACHE_TTL_SECONDS },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Pulp angeBOT) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const people = parsePeople(html)
    if (people.length === 0) {
      throw new Error('parser ergab 0 Personen')
    }
    lastGood = { fetchedAt: Date.now(), people }
    return { people, fetchedAt: lastGood.fetchedAt, fromCache: false }
  } catch (err) {
    if (lastGood) {
      return {
        people: lastGood.people,
        fetchedAt: lastGood.fetchedAt,
        fromCache: true,
      }
    }
    throw err
  }
}

// =========================================================
// Parser
// =========================================================
//
// Jede Person liegt in der Quelle als:
//   <div class="team-item">
//     <img src="..." alt="Name" class="image block full">
//     <div class="overlay ...">
//       <div class="content full">
//         <span class="name block">Name</span>
//         <span class="position block">Role</span>
//         <div class="details">
//           [optional] <a href="tel:...">+43 ...</a><br>
//           [optional] <a href="mailto:...">addr@pulpmedia.at</a>
//         </div>
//       </div>
//     </div>
//   </div>
//
// Wir splitten den HTML-String an `<div class="team-item">` und parsen
// jeden Block einzeln. Das ist robuster als ein einziger Mega-Regex und
// degradiert sauber, wenn ein Block mal abweicht.

const TEAM_ITEM_START = /<div\s+class="team-item"\s*>/i

function parsePeople(html: string): Person[] {
  const chunks = html.split(TEAM_ITEM_START)
  // chunks[0] ist alles vor dem ersten team-item. Den werfen wir weg.
  const items = chunks.slice(1)
  const people: Person[] = []

  for (const chunk of items) {
    const imgSrc = match(chunk, /<img[^>]+src="([^"]+)"[^>]*class="image[^"]*"/i)
    const name = match(
      chunk,
      /<span\s+class="name\s+block">([\s\S]*?)<\/span>/i
    )
    const role = match(
      chunk,
      /<span\s+class="position\s+block">([\s\S]*?)<\/span>/i
    )
    const email = match(chunk, /<a\s+href="mailto:([^"]+)"/i)
    const phoneRaw = match(chunk, /<a\s+href="tel:([^"]+)"[^>]*>([\s\S]*?)<\/a>/i)
    const phone = phoneRaw || match(chunk, /<a\s+href="tel:([^"]+)"/i)

    if (!name) continue
    const cleanName = decodeEntities(name).trim()
    const cleanRole = role ? decodeEntities(role).trim() : ''
    people.push({
      slug: createSlug(cleanName),
      name: cleanName,
      role: cleanRole,
      imageUrl: imgSrc || '',
      email: email ? email.trim() : null,
      phone: phone ? phone.trim() : null,
    })
  }
  return people
}

function match(input: string, re: RegExp): string | null {
  const m = input.match(re)
  return m ? m[1] : null
}

// Minimaler HTML-Entity-Decoder. Reicht für Umlaute und Sonderzeichen, die
// auf der Pulpmedia-People-Seite vorkommen können.
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&bdquo;/g, '„')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&auml;/gi, 'ä')
    .replace(/&ouml;/gi, 'ö')
    .replace(/&uuml;/gi, 'ü')
    .replace(/&szlig;/gi, 'ß')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/<br\s*\/?>/gi, ' ')
}
