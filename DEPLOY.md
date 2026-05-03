# Deploy — Railway (backend + bot + Postgres) + Vercel (frontend)

```
┌─ Railway project ────────────────────────────────────────┐
│  ┌──────────────────┐    ┌─────────────┐                 │
│  │ backend (Docker) │◀───│ Postgres    │                 │
│  │  :$PORT          │    │ (plugin)    │                 │
│  │  + volume /data  │    └─────────────┘                 │
│  │  for uploads     │           ▲                        │
│  └────────┬─────────┘           │                        │
│           │                     │                        │
│           │  ┌──────────────┐   │                        │
│           └──│ bot (Docker) │───┘                        │
│              │ long-poll    │                            │
│              └──────────────┘                            │
└──────────────────────────────────────────────────────────┘
            ▼  https://<backend>.up.railway.app
   Vercel (static React, calls backend via VITE_API_URL)
            ▲
            │ X-Telegram-Init-Data
   Telegram Mini App  (BotFather → Configure Mini App)
```

The whole stack lives in one Railway **project** with three services:
`Postgres`, `backend`, `bot`. The frontend is separate on Vercel.

## 0. Generate the shared secret

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

This becomes `INTERNAL_BOT_TOKEN` on both backend and bot — they use it to
authenticate `/api/bot/*` traffic.

## 1. Create the Railway project

1. railway.app → **New Project** → **Empty Project**.
2. Project page → **+ New → Database → Add PostgreSQL**. Railway provisions
   a managed Postgres service named `Postgres` and exposes
   `${{ Postgres.DATABASE_URL }}` as a project-shared variable.
3. Don't touch the Postgres service settings; everything is wired by reference.

## 2. Backend service

1. Same project → **+ New → GitHub Repo** → select `ekbmusk/akzholtg`.
2. The new service appears (likely named after the repo). Open it.
3. **Settings → Source**:
   - **Root Directory** = `backend`
   - Builder = **Dockerfile** (auto-detected from `backend/Dockerfile`)
4. **Settings → Networking → Generate Domain** → record
   `https://<backend>.up.railway.app`. Used by the frontend and BotFather.
5. **Settings → Volumes → New Volume**:
   - Mount path = `/data`, size ≥ 1 GB.
   - Stores uploaded lesson images. Postgres data is on the Postgres service,
     not this volume.
6. **Variables** (paste literally — Railway expands `${{ ... }}` references):
   ```
   DATABASE_URL=${{ Postgres.DATABASE_URL }}
   UPLOAD_DIR=/data/uploads
   BOT_TOKEN=<from @BotFather>
   TELEGRAM_BOT_TOKEN=<same as BOT_TOKEN>
   INTERNAL_BOT_TOKEN=<secret from step 0>
   AUTHOR_TELEGRAM_IDS=<comma-separated Telegram user IDs>
   MINI_APP_URL=https://placeholder         # overwritten in step 4
   ```
   `PORT` is injected by Railway — never set it manually. `GROQ_API_KEY` is
   optional; add it only if you want the AI explain/summarise endpoints.
7. Wait for the deploy. Sanity:
   ```
   curl https://<backend>.up.railway.app/api/health
   # {"status":"ok"}
   ```

On first boot the backend:
- Strips the legacy `postgres://` prefix Railway gives and uses
  `postgresql://` (SQLAlchemy 2.x requirement).
- Runs `Base.metadata.create_all` against Postgres — all tables and columns
  are created in one shot. The SQLite-only ALTER-TABLE migration step is
  skipped automatically.
- Seeds default subjects + 21 lessons (3 baseline + 18 lab projects) from
  `backend/seeds/lessons.json`.
- Copies `backend/seeds/lab-images/zertkhana_*.png` into `${UPLOAD_DIR}/lesson-images/`
  if they're not already there. Idempotent — runs every boot but only
  copies missing files.

## 3. Bot service

1. Same project → **+ New → GitHub Repo** → same repo again.
2. **Settings → Source → Root Directory** = `bot`. Builder = Dockerfile.
3. **Variables**:
   ```
   BOT_TOKEN=<same as backend>
   TELEGRAM_BOT_TOKEN=<same as backend>
   INTERNAL_BOT_TOKEN=<same as backend>
   MINI_APP_URL=https://placeholder         # overwritten in step 4
   BACKEND_URL=https://<backend>.up.railway.app
   ```
   You can also use Railway private networking if you enable it on both
   services: `BACKEND_URL=http://<backend-service-name>.railway.internal:${PORT}`.
4. The bot has no public domain — it long-polls Telegram and pushes
   notifications via the backend's internal endpoints.

## 4. Frontend on Vercel

1. vercel.com → **Add New… → Project** → import `ekbmusk/akzholtg`.
2. Configure:
   - **Root Directory** = `frontend`
   - Framework Preset = **Vite** (auto-detected via `frontend/vercel.json`)
3. **Environment Variables** (Production + Preview):
   ```
   VITE_API_URL=https://<backend>.up.railway.app/api
   ```
   Don't drop the `/api` suffix. Axios uses the whole value, and the image
   helper (`src/lib/imageUrl.js`) strips `/api` to derive the backend
   origin for relative `/api/uploads/...` paths.
4. **Deploy** → record `https://<project>.vercel.app`.

## 5. Wire MINI_APP_URL back

In Railway, update both backend and bot services' `MINI_APP_URL` env var
to `https://<project>.vercel.app`. Both redeploy automatically.

## 6. BotFather

In Telegram → @BotFather:

1. `/mybots` → pick the bot → **Bot Settings** → **Configure Mini App** →
   **Enable Mini App** → enter the Vercel URL.
2. (Optional) `/setmenubutton` → "Кітапхананы ашу" + same URL → adds the
   blue Mini App button to the chat input area.

## 7. Smoke test

1. `/start` in Telegram → welcome + Mini App button.
2. Tap → app opens inside Telegram, auto-registered as student.
3. Library lists 21 lessons; lab covers load (otherwise `VITE_API_URL` is
   misconfigured or the volume mount is missing on the backend service).
4. Open a lesson → reads through blocks → "Сабақты аяқтадым" marks completion.
5. Add to favourites → opens in `/favourites`.
6. As author (your TG id in `AUTHOR_TELEGRAM_IDS`): bottom nav switches to
   author tabs — Dashboard / Lessons / Broadcast.

## Local dev

```
cd backend && uvicorn main:app --reload --port 8001    # SQLite by default
cd frontend && npm run dev                             # :3001 → /api proxied to :8001
cd bot && python main.py
```

Local default `DATABASE_URL=sqlite:///./stem_theory_bot.db` — Postgres is
production-only.

## Troubleshooting

- **`could not translate host name` / DB connection refused** — backend
  redeployed before Postgres came up. Restart the backend service; the
  variable reference will resolve correctly once Postgres is healthy.
- **`InvalidTextRepresentation` or schema mismatch on Postgres** — you
  redeployed an old build against a Postgres provisioned by a newer schema.
  Drop the dev database (Railway → Postgres → **Data → Drop database**) and
  let the next backend boot recreate everything. Lessons reseed
  automatically.
- **Lab covers 404 on prod** — `VITE_API_URL` not set in Vercel, or you
  dropped the `/api` suffix.
- **Uploaded images vanish after redeploy** — Volume not mounted on the
  backend service, so the upload root lived inside the ephemeral container.
  Mount it at `/data` and re-set `UPLOAD_DIR=/data/uploads`.
- **Bot can't reach backend** — `BACKEND_URL` mismatch (private vs public).
  Check the Railway service's Networking panel.
- **`Author access required` for an admin Telegram ID** — `AUTHOR_TELEGRAM_IDS`
  missing or comma-spaced wrong; after fixing, ask the user to reopen the
  Mini App so the next `/users/register` picks up the new role.
