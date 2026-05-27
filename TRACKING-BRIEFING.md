# Tracking für Offers (und später Pitches)

> Briefing für die Implementierung. Geschrieben so, dass das Tracking sowohl für `Offer` als auch für `Pitch` funktioniert. Phase 1: Offers. Phase 2: gleiches Modell auf Pitches anwenden.

## Ziel

Wir wollen wissen, was nach dem Senden mit einer Angebots- oder Pitch-Seite passiert. Konkret:

1. **Wurde sie überhaupt geöffnet?** Wann zum ersten Mal, wann zuletzt.
2. **Wie lange hat der Kunde sich Zeit genommen?** Aktive Verweildauer, nicht nur Tab offen.
3. **Welche Sections hat er wirklich gesehen?** Section-Sichtbarkeit, nicht nur Scrollposition.
4. **Was hat er angeklickt?** Links auf Referenzen, Optionen, Kontakt, Kalender.
5. **Hat er Videos angeschaut?** Start, Fortschritt, Ende.
6. **Aus welchem Kontext?** Device, Land, Referrer.

Was wir **nicht** wollen:

- Keine IP-Adressen speichern.
- Keine personenbezogenen Daten ohne klare Zweckbindung.
- Keine externen Tracker (kein GA, kein Plausible). Alles inhouse, alles in unserer DB.

## Was wir messen

Eine Session pro Browser pro Angebot. Pro Session sammeln wir Events.

| Event-Typ        | Wird ausgelöst wenn                                       | Payload                                  |
| ---------------- | --------------------------------------------------------- | ---------------------------------------- |
| `view_open`      | Seite wird erstmals geöffnet                              | -                                        |
| `section_view`   | Section ist mehr als 50% sichtbar für mindestens 1,5 Sek  | `{ sectionId, sectionType, index }`      |
| `link_click`     | Externer Link, CTA, Kontakt oder Option wird geklickt     | `{ href, label, sectionId }`             |
| `video_play`     | Video startet                                              | `{ videoId, src, sectionId }`            |
| `video_progress` | Bei 25 / 50 / 75 / 100 Prozent                            | `{ videoId, percent }`                   |
| `heartbeat`      | Alle 15 Sekunden, solange der Tab im Vordergrund ist      | `{ activeSeconds }`                      |
| `view_close`     | Tab wird geschlossen oder Seite wechselt (beforeunload)   | `{ totalActiveSeconds }`                 |

Die Verweildauer ergibt sich aus der Summe der Heartbeats, nicht aus Open zu Close. So zählen wir nicht mit, wenn der Kunde den Tab im Hintergrund liegen lässt.

## Datenmodell (Prisma)

Generisch über `targetType` und `targetId`, damit Offer und Pitch sich die Tabellen teilen.

```prisma
enum TrackTargetType {
  OFFER
  PITCH
}

model TrackView {
  id            String          @id @default(cuid())
  targetType    TrackTargetType
  targetId      String          // FK auf Offer.id oder Pitch.id (ohne harte Relation, weil generisch)
  targetSlug    String          // praktisch für Filter im Admin

  sessionId     String          // anonyme UUID aus dem Client (localStorage)
  openedAt      DateTime        @default(now())
  lastEventAt   DateTime        @default(now())
  activeSeconds Int             @default(0)

  // Kontext
  userAgent     String?
  referrer      String?
  country       String?         // 2-Letter, aus Vercel Edge Header (req.geo.country)
  device        String?         // 'mobile' | 'tablet' | 'desktop'

  events        TrackEvent[]

  @@index([targetType, targetId])
  @@index([targetSlug])
  @@index([sessionId])
  @@index([openedAt])
}

model TrackEvent {
  id        String    @id @default(cuid())
  viewId    String
  view      TrackView @relation(fields: [viewId], references: [id], onDelete: Cascade)

  type      String    // siehe Event-Tabelle oben
  payload   Json?
  at        DateTime  @default(now())

  @@index([viewId])
  @@index([type])
  @@index([at])
}
```

Hinweis: `targetId` ist absichtlich keine harte Foreign-Key-Relation, weil sie auf zwei verschiedene Tabellen zeigen kann (Offer oder Pitch). Wir lösen das im Code beim Lookup. Das ist eine bewusste Inkaufnahme, die uns das Mehrfach-Schema erspart.

## API-Endpoints

Alle unter `/api/track/...`, **öffentlich** erreichbar (kein Auth-Header nötig), weil sie vom Client der Public-Page aus aufgerufen werden. Schutz gegen Spam: Rate-Limit pro IP (zb 60 Requests pro Minute), und Validation auf vorhandenen Slug.

### `POST /api/track/view`

Öffnet eine Session. Wird beim Page-Load einmal aufgerufen.

```ts
// Request
{
  targetType: 'OFFER' | 'PITCH',
  targetSlug: string,
  sessionId: string  // Client-generierte UUID aus localStorage
}

// Response
{
  viewId: string
}
```

Server-seitig:
- Slug auflösen → `targetId`. Wenn nicht gefunden: 404.
- `country` aus `req.headers['x-vercel-ip-country']` lesen.
- `userAgent`, `referrer`, `device` aus Request.
- `TrackView` anlegen, `viewId` zurückgeben.

Wenn schon eine View mit gleicher `sessionId` + `targetId` existiert: bestehende View zurückgeben, `lastEventAt` updaten. So bleibt eine wiederkehrende Ansicht eine View, nicht zwei.

### `POST /api/track/event`

Loggt einen Event.

```ts
// Request
{
  viewId: string,
  type: string,      // siehe Event-Tabelle
  payload?: object   // Event-spezifisch
}

// Response
{ ok: true }
```

Server-seitig:
- `viewId` validieren.
- Event anlegen.
- `view.lastEventAt = now()`.
- Bei `type === 'heartbeat'`: `view.activeSeconds += payload.activeSeconds || 15`.

### `POST /api/track/heartbeat` (Convenience)

Eigener Endpoint nur für Heartbeats. Macht Logs sauberer und erlaubt unterschiedliche Rate-Limits. Effekt wie `event` mit `type: 'heartbeat'`.

## Client-Side-Tracking

Als React-Hook, der in `OfferPage2.tsx` (Phase 1) und später in `PitchPage.tsx` eingebunden wird.

```tsx
// src/lib/use-tracking.ts
import { useEffect, useRef } from 'react';

type TrackingOpts = {
  targetType: 'OFFER' | 'PITCH';
  targetSlug: string;
};

export function useTracking({ targetType, targetSlug }: TrackingOpts) {
  const viewIdRef = useRef<string | null>(null);
  const activeSecondsRef = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Session-ID (anonym, persistent pro Browser)
    let sessionId = localStorage.getItem('pulp-track-session');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('pulp-track-session', sessionId);
    }

    // View öffnen
    let cancelled = false;
    fetch('/api/track/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType, targetSlug, sessionId }),
    })
      .then(r => r.json())
      .then(({ viewId }) => {
        if (cancelled) return;
        viewIdRef.current = viewId;
        setupTracking(viewId);
      })
      .catch(() => { /* still fail */ });

    // Heartbeat-Loop (nur wenn Tab im Vordergrund)
    let lastBeat = Date.now();
    const beat = setInterval(() => {
      if (document.visibilityState !== 'visible') { lastBeat = Date.now(); return; }
      const now = Date.now();
      const delta = Math.round((now - lastBeat) / 1000);
      lastBeat = now;
      if (delta < 1 || delta > 60) return; // throttle Ausreißer
      activeSecondsRef.current += delta;
      if (viewIdRef.current) {
        sendEvent('heartbeat', { activeSeconds: delta });
      }
    }, 15000);

    // beforeunload: finale Verweildauer melden
    const onBeforeUnload = () => {
      if (!viewIdRef.current) return;
      // sendBeacon, damit es auch beim Schließen ankommt
      navigator.sendBeacon(
        '/api/track/event',
        JSON.stringify({
          viewId: viewIdRef.current,
          type: 'view_close',
          payload: { totalActiveSeconds: activeSecondsRef.current },
        })
      );
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      cancelled = true;
      clearInterval(beat);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };

    function sendEvent(type: string, payload?: object) {
      if (!viewIdRef.current) return;
      fetch('/api/track/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewId: viewIdRef.current, type, payload }),
        keepalive: true,
      }).catch(() => {});
    }

    function setupTracking(viewId: string) {
      // Section-Sichtbarkeit
      const sections = document.querySelectorAll('[data-track-section]');
      const seen = new Set<string>();
      const timers = new Map<string, number>();

      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          const id = (e.target as HTMLElement).dataset.trackSection!;
          if (e.intersectionRatio > 0.5) {
            // 1,5 Sek warten, dann als gesehen melden
            if (!seen.has(id) && !timers.has(id)) {
              const t = window.setTimeout(() => {
                if (seen.has(id)) return;
                seen.add(id);
                sendEvent('section_view', {
                  sectionId: id,
                  sectionType: (e.target as HTMLElement).dataset.trackType,
                  index: Number((e.target as HTMLElement).dataset.trackIndex || 0),
                });
                timers.delete(id);
              }, 1500);
              timers.set(id, t);
            }
          } else {
            const t = timers.get(id);
            if (t) { clearTimeout(t); timers.delete(id); }
          }
        });
      }, { threshold: [0.5] });
      sections.forEach(s => io.observe(s));

      // Link-Klicks
      document.addEventListener('click', (ev) => {
        const a = (ev.target as HTMLElement).closest('a');
        if (!a) return;
        const href = a.getAttribute('href') || '';
        if (!href || href.startsWith('#')) return;
        sendEvent('link_click', {
          href,
          label: (a.textContent || '').trim().slice(0, 80),
          sectionId: a.closest('[data-track-section]')?.getAttribute('data-track-section') || null,
        });
      });

      // Video-Tracking (HTML5 <video>)
      document.querySelectorAll('video').forEach(v => {
        const id = v.dataset.trackVideoId || v.currentSrc || 'video';
        const milestones = new Set<number>();
        v.addEventListener('play', () => sendEvent('video_play', { videoId: id }));
        v.addEventListener('timeupdate', () => {
          const p = Math.floor((v.currentTime / v.duration) * 100);
          for (const m of [25, 50, 75, 100]) {
            if (p >= m && !milestones.has(m)) {
              milestones.add(m);
              sendEvent('video_progress', { videoId: id, percent: m });
            }
          }
        });
      });
      // YouTube / Vimeo / TikTok: per Postmessage-API, in Phase 2 nachrüsten.
    }
  }, [targetType, targetSlug]);
}
```

In `OfferPage2.tsx`:

```tsx
'use client';
useTracking({ targetType: 'OFFER', targetSlug: slug });
```

Und in jeder Section ein `data-track-section`-Attribut anhängen:

```tsx
<section data-track-section={section.id} data-track-type={section.type} data-track-index={i}>
  ...
</section>
```

## Admin-View

Neuer Tab pro Angebot: **Tracking**. Erreichbar unter `/admin/offers/[id]/tracking`.

Inhalte:

1. **Header-Stats**
   - Anzahl Views (Sessions gesamt)
   - Davon: Anzahl unique Tage angeschaut
   - Total aktive Verweildauer (Summe über alle Sessions)
   - Letzte Aktivität

2. **Session-Tabelle** (eine Zeile pro `TrackView`)
   - Datum + Uhrzeit der ersten Ansicht
   - Verweildauer aktiv (`activeSeconds` formatiert)
   - Anzahl gesehener Sections (deduped)
   - Land + Device
   - Klick für Detailansicht der Events

3. **Detailansicht einer Session**
   - Liste aller Events chronologisch
   - Visualisierung: Welche Sections wann gesehen
   - Welche Links wurden geklickt
   - Videoabspielraten

4. **Section-Heatmap** (Phase 2, optional)
   - Pro Section: wie oft gesehen, durchschnittliche Anschau-Dauer

API für Admin: `GET /api/admin/offers/[id]/tracking` mit JWT-Cookie-Auth (wie die anderen Admin-APIs).

## Privacy

Was rein muss:

1. **Cookie-frei**. SessionId in `localStorage`, nicht in Cookie. Ist technisch unkritisch, keine Personenbezogenheit.
2. **Keine IP-Speicherung**. Geo nur als 2-Letter-Country aus Vercel Edge Header. Country reicht uns.
3. **Hinweis im Footer der Public-Page**:
   > Wir messen die Nutzung dieser Seite anonym, um sie besser zu machen. Keine Cookies, keine IP. Mehr im Datenschutz.
4. **Aufbewahrung**: 24 Monate, danach Cron-Job, der ältere `TrackView` plus zugehörige `TrackEvent` löscht.
5. **Opt-Out**: kleine Checkbox im Footer "Nicht messen". Setzt `pulp-track-optout` in `localStorage`, der Hook prüft das beim Start und springt früh raus.

## Implementations-Plan

1. **Schema erweitern**: `TrackView`, `TrackEvent`, `TrackTargetType` in `prisma/schema.prisma`.
2. **DB pushen**: `npx prisma generate && npx prisma db push --accept-data-loss`.
3. **API-Routes** anlegen unter `src/app/api/track/view/route.ts`, `event/route.ts`, optional `heartbeat/route.ts`.
4. **Hook** `src/lib/use-tracking.ts` schreiben.
5. **In `OfferPage2.tsx`** einbinden, `data-track-section`-Attribute an die Sections hängen.
6. **Admin-View** unter `/admin/offers/[id]/tracking` bauen. API: `src/app/api/admin/offers/[id]/tracking/route.ts`.
7. **Datenschutz-Hinweis** im Footer der Public-Page.
8. **Privacy-Cron** (optional, später): Vercel Cron, der nach 24 Monaten alte Daten löscht.
9. **Test**: Eigenes Angebot öffnen, in Inkognito öffnen, Mobile-Browser, verschiedene Sections scrollen, Links klicken. Im Admin prüfen.

## Was später für Pitches kommt

Nichts am Schema ändern. Nur:

1. In `PitchPage.tsx`: `useTracking({ targetType: 'PITCH', targetSlug: slug })`.
2. `data-track-section` an die Pitch-Module hängen.
3. Admin-View für Pitches: gleicher Code wie für Offers, nur ein zweiter Endpoint unter `/admin/pitches/[id]/tracking`. Oder: gemeinsame Komponente `<TrackingTab targetType="PITCH" targetId={id}>`, die in beiden Admin-Detail-Pages eingebunden wird. Vorschlag: gemeinsame Komponente, weniger Duplikat.

## Offene Fragen für Paul

1. **Verweildauer-Definition**: Ist "aktive Sekunden" (nur Tab im Vordergrund) das Richtige, oder willst du auch "Tab offen, aber im Hintergrund"-Zeiten sehen?
2. **Notification bei erstem Öffnen**: Sollen wir dir eine Mail oder Slack-Nachricht schicken, wenn ein Angebot zum ersten Mal geöffnet wird?
3. **Geo-Detail**: Reicht Country, oder willst du Region/City auch?
4. **Mehrere Empfänger**: Wenn das gleiche Angebot an drei Personen geht, willst du sehen können, welche Person was angeschaut hat? Das ginge mit einem `recipient`-Token im Slug, ist aber ein eigener Schritt.

Wenn du das vor der Implementierung beantwortest, baut der andere Cowork das gleich richtig.
