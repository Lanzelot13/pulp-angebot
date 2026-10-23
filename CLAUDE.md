# CLAUDE.md – Projekt-Briefing für Co-Work

> **Hinweis:** Dieses Dokument ist für Claude beim Start einer neuen Co-Work-Session gedacht. Bei jedem Projektstart zuerst lesen.

## Projekt

**Name:** PULP angeBOT (intern: "pulp-angebot")
**Was:** Interaktiver Angebotsseiten-Generator für Pulpmedia. Erstellt professionelle Kunden-Landingpages mit Inline-Editor, Admin-Backend, Versionierung und API für den Claude-Skill. Kunden bekommen einen Link zu einer schönen Angebotsseite, das Team bearbeitet alles direkt im Browser.
**Status:** Live (Production)

## Tech-Stack

- **Framework:** Next.js 14 (App Router), TypeScript
- **ORM:** Prisma 6.x
- **Datenbank:** PostgreSQL (Neon, via Vercel)
- **Hosting:** Vercel
- **Auth:** JWT-Cookie (Admin-Backend, Moco-Login) + Bearer API-Key (Skill-API)
- **Styling:** CSS Modules (kein Tailwind)
- **Fonts:** Anton (Headlines), Roboto (Body), JetBrains Mono (Labels/UI)

## Deployment & Git

- **Branches:**
  - `main` → **Production** (https://angebot.pulpmedia.at)
  - `dev` → **Preview** (https://pulp-angebot.vercel.app/)
  - Feature-Arbeit passiert direkt auf `dev`. Wenn alles läuft, wird `dev` → `main` gemergt.
- **Deployment:** Vercel baut automatisch bei `git push` – separater Deploy pro Branch.
- **Datenbank (Neon):** Pro Git-Branch **ein eigener DB-Branch** (ephemeral). `dev` hat also seine eigene DB, `main` ihre eigene. Kein Datenaustausch zwischen den beiden.
- **Vercel Blob:** **Nicht** zwischen Preview und Production getrennt – beide Umgebungen schreiben und lesen aus demselben Bucket. Uploads aus einem Preview-Test sind also auch in Production sichtbar (Vorteil: einfache Reproduktion; Nachteil: keine "Test-Assets" isoliert löschbar).
- **Prisma-Schema-Push:** **Manuell pro Umgebung.** Nach jeder Schema-Änderung muss Paul zweimal pushen (siehe Workflow unten).
- **Build-Command:** `prisma generate && next build`
- **Admin-URL:** https://angebot.pulpmedia.at/admin/ (Login mit Moco-Daten)
- **Git-Push aus Sandbox geht NICHT** (Proxy-403). Paul muss lokal pushen.
- **Paul braucht Copy/Paste-Befehle** für Git/Terminal-Operationen.

### Workflow für Änderungen

Standard (ohne Schema-Änderung):
```bash
# Änderungen auf dev pushen → automatisch Preview-Deploy
git checkout dev
git add -A && git commit -m "…" && git push

# Wenn Preview OK: dev in main mergen → Production-Deploy
git checkout main
git merge dev
git push
```

Mit Prisma-Schema-Änderung (zwei Umgebungen, zwei Pushes):
```bash
# 1) Auf dev pushen
git checkout dev
git add -A && git commit -m "…" && git push

# 2) Preview-DB updaten (Env aus Vercel ziehen, dann Schema pushen)
vercel env pull .env.local --environment=preview
npx prisma db push --accept-data-loss
npx prisma generate

# 3) Auf Preview-URL testen

# 4) dev → main mergen
git checkout main
git merge dev
git push

# 5) Production-DB updaten
vercel env pull .env.local --environment=production
npx prisma db push --accept-data-loss
npx prisma generate
```

**Wichtig:** Nach `vercel env pull` liegt in `.env.local` die DB-URL der jeweils gepullten Umgebung. Also nicht zwischen den Umgebungen wechseln, ohne bewusst neu zu pullen — sonst pushed man das Schema in die falsche DB.

## Konventionen

- Komponenten in PascalCase, Dateien in camelCase
- Server Components default, Client Components nur wo nötig (`'use client'`)
- Deutsch in UI-Texten, Englisch in Code (Variablen, Funktionen)
- CSS Modules statt Tailwind (`.module.css` pro Komponente)
- Kein Auto-Commit – immer erst zeigen, dann Paul pushen lassen
- Template 1 (OfferPage.tsx) NIEMALS anfassen – nur Template 2 bearbeiten

## Aktueller Stand

- Zwei Templates live: TEMPLATE1 (hell, klassisch) und TEMPLATE2 (dunkel, modern, Standard)
- Inline-Editor mit Drag-and-Drop, Icon-Picker, ContentEditable, Status-Bar
- Admin-Backend mit Angebots-Übersicht, Versionierung, Kontakte/Referenzen/Kanäle-CRUD
- Claude-Skill ("angebot") erstellt Angebote per API-Call
- Öffentliche API für Referenzen/Kanäle, geschützte API für Angebots-CRUD

## Offene Punkte / Next Steps

1. Optional: Moco-Integration für automatischen Import von Deal-Daten
2. Optional: PDF-Export der Angebotsseiten
3. Optional: Analytics (Wann hat der Kunde die Seite angeschaut?)

## Wichtige Entscheidungen (mit Begründung)

- **Zwei separate Template-Komponenten statt eine konfigurierbare:** Weniger Risiko, Template 1 kaputt zu machen. Jedes Template lebt völlig unabhängig.
- **CSS Modules statt Tailwind:** Mehr Kontrolle über das dunkle Theme, bessere Lesbarkeit bei komplexen Animationen.
- **JSON-Felder in Prisma statt normalisierte Tabellen:** Flexibilität für unterschiedliche Section-Strukturen ohne ständige Migrations.
- **Öffentliche Endpoints für Referenzen/Kanäle:** Damit der Claude-Skill ohne Admin-Session darauf zugreifen kann. Keine sensiblen Daten enthalten.
- **Bearer API-Key für Angebots-CRUD:** Einfacher als OAuth für den Skill. Key liegt als Env-Variable in Vercel.

## Bekannte Probleme / Technische Schulden

- `(offer as unknown as { template?: string }).template` Type-Assertion statt sauberem Prisma-Typ (Prisma-Client muss lokal regeneriert werden)
- ESLint Warnings: `<img>` statt `<Image />`, Custom Fonts, React Hook dependency – alles nicht kritisch
- Template-DB-Default ist `TEMPLATE1` (historisch). Neue Angebote über den Skill bekommen `TEMPLATE2` explizit mitgeschickt.
- `useEffect` Dependency-Warning für `rev` Variable – funktioniert aber korrekt

## Wo ist was?

```
src/
├── app/
│   ├── o/[slug]/          ← Angebots-Rendering (Kundenansicht + Editor)
│   │   ├── page.tsx       ← Template-Routing (TEMPLATE1 vs TEMPLATE2)
│   │   ├── OfferPage.tsx  ← Template 1 (NICHT ANFASSEN!)
│   │   ├── OfferPage2.tsx ← Template 2 (aktiv bearbeitet, ~1200 Zeilen)
│   │   ├── offer.module.css   ← CSS Template 1
│   │   └── offer2.module.css  ← CSS Template 2
│   ├── admin/             ← Admin-Backend (Dashboard, Offers, Contacts, Refs, Channels)
│   ├── api/
│   │   ├── offers/        ← CRUD + Status + Versions (Bearer-Auth)
│   │   ├── references/    ← Öffentlich (GET, kein Auth)
│   │   ├── channels/      ← Öffentlich (GET, kein Auth)
│   │   └── admin/         ← Admin-APIs (JWT-Cookie-Auth via Moco)
│   └── layout.tsx
├── lib/
│   ├── prisma.ts          ← Prisma Client
│   ├── auth.ts            ← Bearer API-Key Validierung
│   ├── admin-auth.ts      ← JWT Cookie Auth (Moco)
│   ├── types.ts           ← TypeScript Interfaces für JSON-Sections
│   └── slug.ts            ← Slug-Generator
prisma/
└── schema.prisma          ← Datenbankmodell
```

**Deployment:** https://angebot.pulpmedia.at
**Admin:** https://angebot.pulpmedia.at/admin/
**Skill-Datei:** Im selben Projektordner als `angebot.skill`

## Wie wir zusammenarbeiten

- **Shell-Befehle:** Immer als Copy/Paste-Block ausgeben (Paul kennt sich mit Git/Terminal nicht so gut aus)
- **Pfad:** Das Projekt liegt lokal unter `~/Desktop/projects/pulp-angebot`
- **Kein Auto-Commit:** Erst zeigen was geändert wurde, dann den git-Befehl zum Pushen ausgeben
- **Template 1 NIEMALS ändern** – nur Template 2 (OfferPage2.tsx + offer2.module.css) bearbeiten
- **Prisma:** Nach Schema-Änderungen muss Paul lokal `npx prisma generate` und `npx prisma db push --accept-data-loss` ausführen
- **ESLint/TypeScript:** Immer `npx next lint` nach Änderungen laufen lassen bevor Paul pushed
- **Pulpmedia-Tonalität:** Alle Texte duzen, kurze Sätze, keine Buzzwords, gendergerechte Sprache mit Doppelpunkt

---

*Letztes Update: 11. Mai 2026*
