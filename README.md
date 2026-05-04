# PULp angeBOT

Pulpmedia Angebots-Tool – erstellt professionelle Angebotsseiten als interaktive Landingpages.

## Setup

```bash
npm install
cp .env.example .env
# → DATABASE_URL und API_KEY in .env eintragen

npx prisma generate
npx prisma db push
npm run db:seed

npm run dev
```

## Neon-Datenbank erstellen

1. [neon.tech](https://neon.tech) → neues Projekt "pulp-angebot"
2. Connection String kopieren → in `.env` als `DATABASE_URL` eintragen
3. `npx prisma db push` → Schema anlegen
4. `npm run db:seed` → Stammdaten laden

## API

Alle Endpoints unter `/api/`. Auth via `Authorization: Bearer <API_KEY>`.

| Method | Endpoint | Beschreibung |
|--------|----------|-------------|
| POST | /api/offers | Neues Angebot |
| GET | /api/offers | Alle Angebote |
| GET | /api/offers/:id | Ein Angebot |
| PATCH | /api/offers/:id | Angebot updaten |
| PATCH | /api/offers/:id/status | Status wechseln |
| GET | /api/contacts | Team-Kontakte |
| GET | /api/references | Referenzen |
| GET | /api/channels | Social-Kanäle |

## Landingpage

- `/o/:slug` → Kunden-Ansicht
- `/o/:slug?clean=1` → Clean (ohne Editor)
- `/o/:slug?edit=<token>` → mit Inline-Editor
