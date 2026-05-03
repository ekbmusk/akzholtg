# Deploy — Vercel (frontend) + Railway (backend + bot)

```
┌─ Railway project ───────────────────────────────────────┐
│  ┌──────────────────┐                ┌──────────────┐   │
│  │ backend (Docker) │◀───────────────│ bot (Docker) │   │
│  │  :$PORT          │  internal URL  │ long-poll    │   │
│  │  + volume /data  │                └──────────────┘   │
│  └────────┬─────────┘                                   │
└───────────┼─────────────────────────────────────────────┘
            ▼  https://<backend>.up.railway.app
   Vercel (static React, calls backend via VITE_API_URL)
            ▲
            │ X-Telegram-Init-Data
   Telegram Mini App  (BotFather → Configure Mini App)
```

## 0. Generate shared secrets first

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

This value goes into both backend and bot as `INTERNAL_BOT_TOKEN`.

## 1. Backend on Railway

1. Railway → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. After the first detection, open the service:
   - **Settings → Source → Root Directory** = `backend`
   - Builder = **Dockerfile** (auto-detected from `backend/Dockerfile`).
3. **Settings → Networking → Generate Domain** to get the public URL.
4. **Settings → Volumes → New Volume**, mount path `/data` (≥ 1 GB). This
   keeps SQLite + uploaded images alive across redeploys.
5. **Variables**:
   ```
   BOT_TOKEN=<from @BotFather>
   TELEGRAM_BOT_TOKEN=<same as BOT_TOKEN>
   INTERNAL_BOT_TOKEN=<the secret from step 0>
   AUTHOR_TELEGRAM_IDS=<comma-separated Telegram user IDs>
   MINI_APP_URL=<placeholder — overwritten in step 3>
   DATABASE_URL=sqlite:////data/stem_theory_bot.db
   UPLOAD_DIR=/data/uploads
   GROQ_API_KEY=<optional — only if AI explanations are enabled>
   ```
   `PORT` is injected by Railway — **do not set it manually**.

Sanity:
```
curl https://<backend>.up.railway.app/api/health
# {"status":"ok"}
```

On first boot the backend runs `Base.metadata.create_all`, lightweight ALTER
migrations, and seeds default subjects + 21 lessons (3 baseline + 18 lab
projects from `Zertkhanalyk_Zhumystar/`). Cover images for the labs come from
`backend/uploads/lesson-images/zertkhana_*.png` baked into the Docker image
and copied to the volume on first request (or by re-running
`scripts/build_zertkhana_seed.py` against a checked-out copy).

## 2. Frontend on Vercel

1. Vercel → **Add New… → Project** → import the same GitHub repo.
2. Configure:
   - **Root Directory** = `frontend`
   - Framework Preset = **Vite** (auto-detected via `frontend/vercel.json`)
   - Build Command, Install Command, Output Directory — auto-filled.
3. **Environment Variables** (Production + Preview):
   ```
   VITE_API_URL=https://<backend>.up.railway.app/api
   ```
   The frontend prepends this origin to relative `/api/uploads/...` image
   URLs via `src/lib/imageUrl.js`, so cover and inline images load correctly
   from Railway. Don't drop the `/api` suffix — axios uses the whole value.
4. **Deploy**. Vercel returns `https://<project>.vercel.app`.

## 3. Wire MINI_APP_URL back

Set `MINI_APP_URL=https://<project>.vercel.app` on the backend (and bot)
Railway services. Both redeploy automatically.

## 4. Bot on Railway (same project)

1. Railway → project → **+ New → GitHub Repo** → same repo, second service.
2. **Settings → Source → Root Directory** = `bot`. Builder = Dockerfile.
3. **Variables**:
   ```
   BOT_TOKEN=<same as backend>
   TELEGRAM_BOT_TOKEN=<same as backend>
   INTERNAL_BOT_TOKEN=<same as backend>
   MINI_APP_URL=https://<project>.vercel.app
   BACKEND_URL=http://<backend-service-name>.railway.internal:${PORT}
   ```
   `BACKEND_URL` uses Railway's private networking — copy the internal
   hostname from the backend service's **Networking → Private** panel.
   Falling back to the public `https://<backend>.up.railway.app` also works
   if private networking is disabled.
4. The bot has no public domain — no need to expose a port.

## 5. BotFather

In Telegram → @BotFather:

1. `/mybots` → pick the bot → **Bot Settings** → **Configure Mini App** →
   **Enable Mini App** → enter the Vercel URL.
2. (Optional) `/setmenubutton` → "Кітапхананы ашу" + same URL → adds the
   blue Mini App button to the chat input area.

## 6. Smoke test

1. `/start` in Telegram → welcome + Mini App button.
2. Tap → app opens inside Telegram, auto-registered as student.
3. Library lists 21 lessons; lab covers load (otherwise `VITE_API_URL` is
   misconfigured or volume mount is missing).
4. Open a lesson → reads through blocks → "Сабақты аяқтадым" marks completion.
5. Add to favourites → opens in `/favourites`.
6. As author (your TG id in `AUTHOR_TELEGRAM_IDS`): bottom nav switches to
   author tabs — Dashboard / Lessons / Broadcast.

## Local dev

```
cd backend && uvicorn main:app --reload --port 8001
cd frontend && npm run dev   # :3001 → /api proxied to :8001
cd bot && python main.py
```

Or `docker compose up --build` (frontend :3001, backend :8001).

## Troubleshooting

- **Lab covers 404 on prod** — `VITE_API_URL` not set in Vercel, or you
  dropped the `/api` suffix. The frontend strips that suffix internally to
  build image origins; without it relative URLs stay relative and 404 on
  vercel.app. Fix: redeploy with `VITE_API_URL=https://<backend>/api`.
- **Lessons disappear after redeploy** — Volume not mounted on the backend
  service, so the SQLite file lived inside the ephemeral container. Add the
  volume at `/data` and re-set `DATABASE_URL=sqlite:////data/stem_theory_bot.db`
  + `UPLOAD_DIR=/data/uploads`.
- **Bot can't reach backend** — `BACKEND_URL` points at the public domain
  but Railway private networking is on, or vice versa. Check the **Network**
  tab and use the matching host.
- **`Author access required` for an admin Telegram ID** — `AUTHOR_TELEGRAM_IDS`
  is missing, comma-separated wrong, or the user authenticated before the
  variable was set; have them reopen the Mini App.
