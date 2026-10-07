# The Retro Talks 🎬 — Gemini & AI Agent Guide

> **For Gemini CLI, Google Antigravity, and AI Coding Agents:**
> This repository is **The Retro Talks**, an editorial cinema diary, review archive, and 9:16 social card studio built with React 19, TypeScript, Tailwind CSS v4, Express, LibSQL/SQLite, and the TMDB API.
>
> Complete project specifications and detailed architecture can also be found in [PROJECT_CONTEXT.md](file:///home/vp/development/theretrotalks/PROJECT_CONTEXT.md).

---

## 1. Quick Technical Reference

- **Frontend**: React 19, TypeScript 6, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), Lucide Icons.
- **Backend**: Node.js, Express 5, `@libsql/client` (supports both local SQLite `retro_talks.db` and Turso Cloud database via `TURSO_DATABASE_URL`).
- **Real-time Sync**: Server-Sent Events (SSE) at `/api/events` broadcasting `reviews_updated`.
- **Image Proxy**: `/api/proxy-image` handles CORS-safe buffering for html-to-image canvas rendering.
- **External API**: The Movie Database (TMDB) API v3 for search, metadata, credits, artwork, and trailers.

---

## 2. Key Directories & Core Files

- `backend/server.js`: Server entry, static dist serving, DB init, and health check.
- `backend/src/db/connection.js`: `@libsql/client` auto-switching between Turso cloud & local SQLite.
- `backend/src/db/schema.js`: SQLite schema definition and non-destructive migrations.
- `backend/src/routes/`: Express routers for reviews (`reviewRoutes.js`), TMDB movies (`movieRoutes.js`), admin auth/backup (`authRoutes.js`), and SSE (`index.js`).
- `frontend/src/App.tsx`: Root component with lightweight hash/path SPA routing, admin authentication, and SSE live listener.
- `frontend/src/index.css`: Tailwind CSS v4 configuration (`@import "tailwindcss"`, `@theme`, custom CSS variables).
- `frontend/src/components/StoryCardBuilderModal.tsx`: 9:16 social story studio (Summary, Rating, Full Multi-Slide Set) with single PNG and ZIP export.
- `frontend/src/components/FormattedReviewText.tsx`: Markdown parser supporting interactive spoilers (`||spoiler||`), blockquotes, lists, and formatting.
- `frontend/src/pages/ReviewPage.tsx`: Single review permalink view (`/review/:slugOrId`).
- `frontend/src/pages/AdminPage.tsx`: Admin console for adding, editing, reordering, and backing up reviews.

---

## 3. Critical Design Constraints & Recent Rules

1. **No "Favorite" Tags**: Do **not** render favorite tags/badges on the home page or review page cards.
2. **No "TV Show" Badges on Home Cards**: Keep home review cards uniform and cinematic.
3. **Review Card Image Borders**: Must match the site background color (`#07080a`) or be transparent.
4. **Story Studio Presets**: Only **3** presets exist:
   - `cinematic` (Cinematic Glass)
   - `poster_hero` (Poster Hero)
   - `editorial` (Editorial Journal)
   *(Auteur Monolith, Cinemascope 2.39:1, and Cahiers Masthead have been removed).*
5. **Story Studio Typography**:
   - Only **Inter** and **Poppins** fonts are enabled.
   - Title weight is strictly capped at **600** (`normal` 400, `medium` 500, `semibold` 600).
6. **No Material Finish Option**: The user-facing finish selector was removed. Cards use static obsidian glass.
7. **Rating Metrics in Story Studio**:
   - Only `stars_metric` (Stars + Index) and `stars_minimal` (Minimalist Stars) are available.
   - *Director Index* has been removed.
8. **Multiple Directors**: When multiple directors are present in TMDB credits, list them comma-separated (e.g. "Dir. Daniel Kwan, Daniel Scheinert").

---

## 4. Common Commands

```bash
# Backend dev server (Port 5000)
npm --prefix backend run dev

# Frontend dev server (Port 5173)
npm --prefix frontend run dev

# Frontend build & typecheck verification
npm --prefix frontend run build
```

---

## 5. Development Guidelines for AI

- **Tailwind v4**: Do NOT create `tailwind.config.js`. Use `@theme` in `frontend/src/index.css`.
- **CORS Image Safety**: Preload or proxy any remote images rendered on HTML5 canvas via `/api/proxy-image`.
- **Database Safety**: Never run destructive table drops. Add columns idempotently in `backend/src/db/schema.js`.
- **Verification**: Always run `npm --prefix frontend run build` to confirm zero TypeScript compilation errors before finishing work.
