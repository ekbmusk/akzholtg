# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

STEM Theory Bot — a Telegram Mini App that delivers STEM knowledge through curated **theoretical lessons** (теориялық сабақтар). Unlike its sibling project `stem-bot` (which is case-based with graded tasks), this bot is **read-only learning**: students browse, read, watch, and absorb. There are **no tasks, no submissions, no grading**. Progress is tracked passively (what was opened / completed by reading).

A lesson (сабақ) has:

- **тақырыбы** — title (`title_kk`)
- **мақсаты** — learning objective (`objective_kk`)
- **қысқаша сипаттама** — short summary shown in catalogue (`summary_kk`)
- **мұқаба** — cover image (`cover_image_url`)
- **кіріспе** — intro / hook narrative (`intro_kk`)
- **теория** — main theoretical body assembled from ordered content blocks
- **формулалар** — LaTeX formulas embedded as blocks
- **видео** — YouTube embeds as first-class blocks
- **суреттер** — inline images / diagrams
- **қызықты факт** — "did you know" callouts (`fact` blocks)
- **қорытынды** — summary / takeaways (`summary_kk` block at the end)
- **сілтемелер** — further reading (`references` JSON list)

**One Mini App** serves two roles, gated by Telegram user ID:

- **Student** (оқушы) — browses the lesson library by subject / difficulty / tag, opens a lesson, reads through blocks, watches videos, marks lesson as completed (or it auto-marks after scrolling to the end). Can favourite lessons and view their reading history.
- **Author / mentor** (автор / мұғалім) — same Mini App, recognised server-side via `AUTHOR_TELEGRAM_IDS`. Unlocks: lesson authoring with a block editor (text / formula / image / video / fact / quote / divider), library curation, simple analytics (views per lesson, top readers), broadcast composer.

There is **no separate web app**. Role detection happens server-side; the frontend renders student or author screens from the same React app.

### How this differs from `stem-bot`

| Aspect | `stem-bot` (sibling) | `stem-theory-bot` (this project) |
|--------|----------------------|----------------------------------|
| Core unit | Case (kейс) with situation + tasks | Lesson (сабақ) with theory only |
| Student output | Submits answers, gets graded | Reads, marks complete, favourites |
| Teacher work | Authors cases, grades submissions | Authors lessons, watches view stats |
| Server tables | `STEMCase`, `CaseTask`, `CaseSubmission`, `TaskAnswer` | `Lesson`, `LessonBlock`, `LessonProgress`, `LessonFavourite` |
| Block types | text/formula/image/video/equipment/safety/divider/**task** | text/formula/image/video/**fact**/**quote**/divider |
| AI usage | Hints for tasks, concept explanations | Concept explanations, lesson summarisation on demand |
| Visual identity | Dark purple (#0F0F1A / #6C63FF), case-driven, dense | Lighter editorial feel: warm dark teal (#0B1320 / #1E2A3A) with accent #14B8A6, reading-optimised typography, generous whitespace |

## Local Development Commands

```bash
# Backend (API docs at localhost:8001/docs) — run from backend/
cd backend && source .venv/bin/activate && pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# Frontend — Vite dev server on :3001 (different port from stem-bot to allow both running)
cd frontend && npm install && npm run dev

# Bot
cd bot && pip install -r requirements.txt && python main.py

# Docker (frontend :3001, backend :8001)
docker-compose up --build
```

### Deployment

```bash
# Frontend — Cloudflare Pages
cd frontend && npm run build && npm run pages:deploy

# Backend — Render (configured in render.yaml)
```

## Architecture

### Three services

- **frontend/** — Single Telegram Mini App for both roles. React 18 + Vite 5 + TailwindCSS 3 + Zustand + axios + Recharts (author analytics) + react-hook-form/zod + hello-pangea/dnd (lesson editor). On launch backend returns `{ role: "student" | "author" }`; the app branches into `routes/student/*` or `routes/author/*`. Sends `X-Telegram-Init-Data` header on every API request. Deployed via Cloudflare Pages.
- **backend/** — FastAPI REST API. All routes under `/api/`. Thin routers → `app/services/` for business logic. SQLite DB auto-creates, migrates, and seeds on startup. Author-only routes protected by `require_author` dependency that checks Telegram ID against `AUTHOR_TELEGRAM_IDS`.
- **bot/** — aiogram 3 long-polling bot. Sends "new lesson published" notifications and weekly digests of recommended lessons. Communicates with backend via httpx.

### Backend internals

- **AI service** (`app/services/ai_service.py`, optional): Groq API via `AsyncOpenAI(base_url="https://api.groq.com/openai/v1")`, model `llama-3.3-70b-versatile`, temp 0.3. Two endpoints: `/api/ai/explain` (deepen a concept the student is reading) and `/api/ai/summarise` (TL;DR for a long lesson). Kazakh-only system prompt with jailbreak detection.
- **Database** (`app/database/database.py`): `create_tables()` on startup → `_migrate_sqlite()` (ALTER TABLE for missing columns) → seed default subjects and a small lesson library. Idempotent.
- **Auth** (`app/utils/auth.py`): No password login, no JWT. Both students and authors authenticate purely via Telegram initData (`X-Telegram-Init-Data`). Author role decided server-side via `AUTHOR_TELEGRAM_IDS` env var (comma-separated). Students auto-registered on first launch. The `require_author` dependency rejects non-authors from `/api/author/*`.
- **Models**:
  - `User` (role: student | author) with `progress`, `favourites` cascade.
  - `Subject` — taxonomy (`code`, `title_kk`, `icon`, `color`).
  - `Lesson` — top-level lesson record. Fields: `title_kk`, `objective_kk`, `summary_kk`, `intro_kk`, `cover_image_url`, `subject_code`, `difficulty` (`easy`|`medium`|`hard`), `age_range`, `tags` (JSON list), `references` (JSON list of `{title, url}`), `estimated_minutes`, `is_published` (defaults to `True` — drafts are explicit, not implicit), `is_featured` (drives `/lessons/featured`), `published_at`, `author_id`.
  - `LessonBlock` — ordered rich content blocks per lesson. Block types: `text` | `formula` | `image` | `video` | `fact` | `quote` | `divider`. Editor reorders via drag-and-drop.
  - `LessonVideo` — denormalised video pointers for the catalogue. Fields: `provider` (`youtube` | `mp4`), `external_id_or_url`, `title_kk`, `duration_sec`, `position`. Either embedded inline as a `video` block or surfaced as a top-level video count on the lesson card.
  - `LessonProgress` — per-user, per-lesson reading state. Fields: `user_id`, `lesson_id`, `status` (`opened` | `in_progress` | `completed`), `last_block_position`, `opened_at`, `completed_at`, `seconds_spent`.
  - `LessonFavourite` — bookmark (`user_id`, `lesson_id`, `created_at`).
  - `Notification`, `BroadcastLog` — same patterns as the sibling project.
- **Cascades**: `User → LessonProgress`, `User → LessonFavourite`, `Lesson → LessonBlock`, `Lesson → LessonVideo`, `Lesson → LessonProgress` all cascade delete.

### Backend API routes (`/api/`)

| Group | Key endpoints |
|-------|--------------|
| `/users` | `POST /register` (returns role), `GET /{id}/avatar` (proxies Telegram API), `GET /me` |
| `/lessons` | `GET /` (filter by subject / difficulty / tag / search), `GET /{id}` (full lesson + blocks + videos), `GET /featured`, `GET /subjects` |
| `/progress` | `POST /{lesson_id}/open`, `PATCH /{lesson_id}` (update `last_block_position`, `seconds_spent`), `POST /{lesson_id}/complete`, `GET /mine` |
| `/favourites` | `POST /{lesson_id}`, `DELETE /{lesson_id}`, `GET /` |
| `/author` | Telegram-ID-gated via `require_author`. `GET /stats`, `POST /lessons` / `PATCH /lessons/{id}` / `DELETE /lessons/{id}`, `POST /lessons/{id}/publish`, `POST /broadcast`. |
| `/ai` | `POST /explain`, `POST /summarise`. Optional, requires `GROQ_API_KEY`. |
| `/uploads` | `POST /lesson-images` (author uploads cover / inline images), `GET /lesson-images/{filename}` (public, cached). No student uploads since there are no tasks. |
| `/bot` | Internal endpoints used by the bot process. Gated by `X-Bot-Token` shared secret (`require_bot_token` → `INTERNAL_BOT_TOKEN`). Used by `notifier.py` to drain queued notifications and broadcasts. Not for public clients. |

### Frontend internals

- **State**: `store/userStore.js` (user + role + isAuthenticated), `store/lessonStore.js` (lesson catalogue cache by subject, current lesson, current reading progress with `last_block_position`), `store/uiStore.js` (font size preference for reading comfort). Zustand, no persist middleware.
- **API layer**: `src/api/client.js` (axios, baseURL from `VITE_API_URL` or `/api`, 15s timeout, auto-attaches Telegram initData). One module per domain (`lessons.js`, `progress.js`, `favourites.js`, `author.js`, `ai.js`).
- **Role routing**: `App.jsx` reads `user.role` after `/users/register`. Student → `/library` + lesson reader + favourites + history. Author → `/author/dashboard` (stats, lesson list, editor, broadcast). Both roles share `FormulaRenderer`, `VideoPlayer`, `LessonBlocks`, the lesson reader.
- **Author views** (under `src/routes/author/`):
  - `Dashboard.jsx` — Recharts: views over time, top lessons, completion funnel.
  - `LessonList.jsx` — table of all lessons (draft / published), inline publish toggle.
  - `LessonEditor.jsx` — drag-and-drop block editor (hello-pangea/dnd) with live KaTeX preview, inline YouTube preview, image upload. Block types: text, formula, image, video, fact, quote, divider.
  - `Broadcast.jsx` — composer (optionally attach a lesson link) → bot sends to all students or a filtered subset.
- **Authorization**: the frontend hides author routes for students, but the real gate is the backend `require_author` dependency. Don't rely on UI hiding alone.
- **FormulaRenderer** (`src/components/FormulaRenderer.jsx`): KaTeX-backed, parses mixed text + LaTeX. Reused from `stem-bot` patterns.
- **VideoPlayer** (`src/components/VideoPlayer.jsx`): YouTube embeds via `<iframe src="https://www.youtube-nocookie.com/embed/<id>?rel=0&modestbranding=1">` 16:9. For `provider="mp4"` falls back to `<video controls preload="metadata">`. Includes "YouTube-те ашу" escape hatch via `Telegram.WebApp.openLink(url)`.
- **Lesson content blocks**: Rendered by `LessonBlocks.jsx`, one component per block type. The reader auto-advances `last_block_position` as the student scrolls (IntersectionObserver). Hitting the bottom triggers `POST /progress/{id}/complete`.
- **Reading comfort affordances** (this is the differentiator vs `stem-bot`):
  - Font size toggle (S / M / L) persisted in `localStorage`.
  - Optional "focus mode" — fades chrome, expands content column.
  - Estimated reading time on lesson cards.
  - Resume banner on lesson open if `last_block_position > 0`.
- **Telegram SDK**: `WebApp.ready()` + `expand()` + `setHeaderColor('#0B1320')` in App.jsx. Onboarding gate via `localStorage.onboarding_completed`.
- **Vite config**: `envDir: '../'`, dev server port `3001`, proxy `/api` → `localhost:8001`.
- **Tailwind theme**: Dark mode only. Colors:
  - bg `#0B1320`, surface `#1E2A3A`, surface-alt `#243446`
  - primary `#14B8A6` (teal), accent `#F59E0B` (amber, for `fact` callouts)
  - text `#E2E8F0`, muted `#94A3B8`
  - Typography: Inter for UI, **Lora** (serif) for `.lesson-prose` body text.

### Bot internals

- **Handlers** (`bot/handlers/__init__.py`): `start`, `library`, `history`, `favourites`, `digest` (weekly recommendations), `help`. There is **no** broadcast/notification *handler* — outbound messages flow through `bot/notifier.py`, which polls the backend's internal `/api/bot/*` endpoints on `NOTIFIER_INTERVAL_SEC` and pushes via `Bot.send_message`.
- **Communication**: All backend calls via `httpx.AsyncClient` with `BOT_HTTP_TIMEOUT_SEC` (default 10s). Internal calls send `X-Bot-Token: $INTERNAL_BOT_TOKEN`. Silent failure pattern — handlers log and continue rather than raising to the user.
- **Startup contract** (`bot/config.py:assert_runtime_config`): bot fails fast if `BOT_TOKEN`, `INTERNAL_BOT_TOKEN`, or `MINI_APP_URL` are missing.

## Content Model

Lessons categorised primarily by **subject**, secondarily by **difficulty** and **age_range**:

- **subject**: `biology`, `chemistry`, `physics`, `mathematics`, `informatics`, `engineering`, `astronomy`, `ecology`, `interdisciplinary`
- **difficulty**: `easy` | `medium` | `hard`
- **age_range**: free-form (`12-14`, `15-17`, `7+`)
- **tags**: open list — `robotics`, `climate`, `genetics`, `data-analysis`, etc.

### Block types (`LessonBlock.type`)

| Type | Payload shape | Render |
|------|---------------|--------|
| `text` | `{ "text_kk": "..." }` (markdown allowed) | Serif body paragraph |
| `formula` | `{ "latex": "..." , "caption_kk": "..." }` | Centred KaTeX block with caption |
| `image` | `{ "url": "...", "caption_kk": "...", "alt_kk": "..." }` | Rounded image with caption |
| `video` | `{ "provider": "youtube"\|"mp4", "external_id_or_url": "...", "title_kk": "..." }` | 16:9 player with title |
| `fact` | `{ "text_kk": "...", "icon": "💡" }` | Amber-tinted callout card |
| `quote` | `{ "text_kk": "...", "author_kk": "..." }` | Italic block quote with author |
| `divider` | `{}` | Thin horizontal rule |

### Video conventions

- For YouTube store **just the video ID**, not the full URL — frontend builds the embed.
- Use `youtube-nocookie.com` for embeds.
- For Kazakhstan school networks that throttle YouTube, attach a fallback `LessonVideo` row with `provider="mp4"` pointing at a self-hosted file. The player picks the working source.

## Engineering Conventions

- User-facing content in Kazakh; code/docs in English.
- Frontend: 100% Tailwind utilities (no `.module.css`). Mobile-first, Telegram WebView compatible. Haptic feedback on key interactions (favourite, complete).
- Backend: Thin routers → services. Pydantic schemas for all request/response. LaTeX validation checks brace/`$` balance in author-facing schemas.
- Reading progress writes are debounced on the client (~5s); backend caps `seconds_spent` at 4× `estimated_minutes` to discourage gaming.
- Image uploads to `backend/uploads/lesson-images/`, served via `/api/uploads/lesson-images/...`. Public read, author-only write.
- `.env` sits at project root, loaded by backend and bot via python-dotenv, by frontend via Vite `envDir: '../'`.

## Environment Variables

Required in `.env`:
```
BOT_TOKEN (or TELEGRAM_BOT_TOKEN — bot accepts either; BOT_TOKEN wins),
MINI_APP_URL,
INTERNAL_BOT_TOKEN (shared secret between backend and bot for /api/bot/*),
AUTHOR_TELEGRAM_IDS (comma-separated Telegram user IDs recognized as content authors;
                     legacy TEACHER_TELEGRAM_IDS is read as a fallback),
BACKEND_URL (default http://localhost:8001),
DATABASE_URL (default sqlite:///./stem_theory_bot.db)
```
Optional: `GROQ_API_KEY`, `NOTIFIER_INTERVAL_SEC` (default 30), `BOT_HTTP_TIMEOUT_SEC` (default 10), `LOG_LEVEL`.
Frontend: `VITE_API_URL` (defaults to `/api` via dev proxy).

## Testing

There is currently **no automated test suite** (no `tests/` directory, no `pytest`, no Vitest). When changing behaviour, validate manually:
- Backend: `curl localhost:8001/api/health` and exercise endpoints from `localhost:8001/docs`.
- Frontend: `npm run dev` and click through the affected screens inside Telegram (initData is required for non-public routes — the app shows a "кіру қатесі" message when opened in a plain browser).
- Bot: `python bot/main.py` against a dev backend; `/start` in Telegram should render the Mini App button.
