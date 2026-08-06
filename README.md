# Terrain IQ Mapper

A tool for asset management teams to catalog data-dictionary **collections**
(Security Data, Positions Data, Holdings Data), upload each one's field
listing from Excel, and run AI-assisted field matching between any two
collections.

This is the **full-stack** version: a React/TypeScript client talking to an
Express/SQLite API, so collections are stored centrally and shared across
everyone who uses the site — not just kept in one browser's local storage.

## Project structure

```
terrain-iq-mapper/
├── client/          React + TypeScript + Vite frontend
│   └── src/
│       ├── components/   Dashboard, NewCollectionPage, CollectionDetail, MappingPage, ...
│       ├── lib/           api.ts (fetch wrapper), parseExcel.ts, exportMapping.ts
│       ├── App.tsx        view routing + top-level state
│       └── styles.css     all styling (design tokens, layout, components)
├── server/          Express + SQLite API
│   └── src/
│       ├── db.ts          SQLite schema + queries
│       ├── routes/        /api/collections, /api/mapping
│       └── index.ts       server entrypoint (also serves the built client)
├── shared/           TypeScript types + the matching algorithm,
│                      used by the server (and importable by the client)
└── package.json      npm workspaces root (runs client + server together)
```

## How it works

- **Collections** (name, type, and a field list) are created in the browser —
  the client parses Row 1 of the uploaded Excel file into field names — then
  saved to the server via `POST /api/collections`, which persists them in a
  SQLite database (`server/data/terrain.db`).
- **Everyone hitting the same deployed URL sees the same collections**,
  because they all come from that one database, not from browser storage.
- **Map Collections** sends `{ sourceId, targetId }` to
  `POST /api/mapping/run`; the server loads both collections and scores every
  field pair using a synonym dictionary + token overlap + string similarity
  (`shared/matching.ts`), so the matching logic is identical no matter who
  runs it.
- **Exporting a mapping to Excel** happens client-side (no extra request) —
  it just formats whatever's currently on screen, including any manual
  overrides, into an `.xlsx` download.

## Running it locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install          # installs client + server dependencies (npm workspaces)
npm run dev           # runs the API on :8787 and the client on :5173
```

Open http://localhost:5173 — the Vite dev server proxies `/api/*` requests
to the Express server automatically.

## Building for production

```bash
npm run build         # builds client/dist and compiles server to server/dist
npm start              # runs the compiled server, which also serves client/dist
```

Once built, **one process serves both the site and the API** on a single
port (`PORT` env var, default `8787`) — there's nothing else to run.

## Deploying somewhere with a real URL, for free

This needs an actual Node.js host (not GitHub Pages, since GitHub Pages only
serves static files and this has a real backend + database). Two solid free
options:

### Option A — Render.com (recommended, simplest)

1. Push this project to a GitHub repository (public or private).
2. On [render.com](https://render.com), create a free account, then
   **New → Web Service** and connect your repo.
3. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Deploy. Render gives you a free `https://your-app.onrender.com` URL.

> **Note on data persistence:** Render's free tier does not include a
> persistent disk, so the SQLite file can reset on redeploys or after long
> idle periods. This is fine for trying things out or low-stakes use. For
> data you don't want to lose, either add Render's paid persistent disk, or
> swap SQLite for a free hosted database like
> [Turso](https://turso.tech) or [Supabase](https://supabase.com) — the
> `server/src/db.ts` file is the only place that would need to change.

### Option B — Railway.app

Same idea: connect your GitHub repo, Railway auto-detects the Node app,
set the start command to `npm run build && npm start`. Railway's free tier
includes a small persistent volume you can mount for the SQLite file if you
want durability without switching databases.

## Optional: AI-assisted matching ("Ask AI")

The deterministic algorithm (synonym dictionary + token overlap + spelling
similarity) needs no configuration and always works. On top of that, low-confidence
and unmatched rows in the Map Collections results show an **"Ask AI"** action that
asks Claude for a second opinion on just that one field — useful for genuinely
ambiguous industry terminology the synonym dictionary doesn't cover.

To enable it:

1. Get an API key at [console.anthropic.com](https://console.anthropic.com).
2. **Locally:** copy `server/.env.example` to `server/.env` and paste your key in.
3. **On Render:** go to your service → **Environment** → add an environment
   variable named `ANTHROPIC_API_KEY` with your key as the value, then redeploy.

Without a key configured, "Ask AI" simply shows a clear message explaining it
isn't set up yet — nothing else in the app is affected.

## Notes

- The matching algorithm is deterministic (synonym dictionary + fuzzy string
  matching), not a hosted LLM call — this keeps the app simple to run and
  deploy with no API keys to manage. If true semantic (LLM-based) matching is
  wanted later, that logic slots into `server/src/routes/mapping.ts` without
  touching the client.
- There's no authentication layer yet — anyone with the URL can create,
  view, and delete collections. Add an auth check in `server/src/index.ts`
  before deploying anywhere sensitive.
