# The Retro Talks 🎬 — Project Context & AI Agent Guide

> **For AI Agents (Gemini, Claude, GPT, Cursor, Antigravity, etc.):**
> This file is the single source of truth for the architecture, tech stack, data schemas, design philosophies, feature implementations, and recent decisions of **The Retro Talks**. Read this document thoroughly before proposing or executing code changes.

---

## 1. Project Overview & Vision

**The Retro Talks** is a personal cinema diary, film reflections archive, and editorial story card platform created by **Vishakhan Pillai** ([@vishakhanpillai](https://github.com/vishakhanpillai) / [@theretrotalks](https://instagram.com/theretrotalks)).

- **Purpose**: A platform for publishing long-form and short-form film critiques, tracking watched films/series with personalized ratings (0.5 to 5.0 stars), and generating 9:16 high-resolution social media cards for Instagram/TikTok stories.
- **Design Philosophy**: High-end cinema editorial ("Oppenheimer Noir"). Dark obsidian surface (`#07080a`), vibrant retro-orange accent (`#ff5500`), clean modern typography, glassmorphism, and cinematic framing. It feels like *Letterboxd meets Criterion Collection meets A24*.
- **Current Branch**: `turso-db` (Production branch supporting both Turso Cloud and local SQLite).

---

## 2. Complete Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) (`react: ^19.2.8`, `react-dom: ^19.2.8`)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (`typescript: ~6.0.2`, strict types)
- **Bundler / Tooling**: [Vite 8](https://vite.dev/) (`vite: ^8.2.2`) with `@vitejs/plugin-react`
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite: ^4.3.3`, `tailwindcss: ^4.3.3`)
  - *Note on Tailwind v4*: Uses `@import "tailwindcss";` and `@theme` directives directly in `frontend/src/index.css`. There is **no** `tailwind.config.js`.
- **Icons**: [Lucide React](https://lucide.dev/) (`lucide-react: ^1.41.0`)
- **Canvas / Export Tools**:
  - `html-to-image: ^1.11.13`: For rendering DOM nodes into lossless 1080×1920 PNG images.
  - `jszip: ^3.10.2`: For bundling multi-slide story sets into `.zip` archives.

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (Compatible with Node 20+ and Node 22+)
- **Server Framework**: [Express 5](https://expressjs.com/) (`express: ^5.2.1`)
- **Database Client**: [`@libsql/client: ^0.18.0`](https://docs.turso.tech/sdk/ts/reference)
  - **Dual Database Architecture**: Automatically switches between **Turso Cloud DB** (`libsql://...`) when `TURSO_DATABASE_URL` is set, and a **local SQLite file** (`file:retro_talks.db`) when running locally or in standalone Docker.
- **Real-Time Synchronization**: Native **Server-Sent Events (SSE)** via `/api/events`. Broadcasts events whenever reviews are created, updated, reordered, or deleted so open browser clients revalidate in real time without polling.
- **Image Proxying**: `/api/proxy-image` server endpoint fetches TMDB images and serves them with permissive CORS headers to prevent canvas tainting during Story Studio PNG/ZIP exports.
- **File Upload / Import**: `multer: ^2.4.0` for handling JSON database backups and restores.

### External APIs
- **[The Movie Database (TMDB) API v3](https://developer.themoviedb.org/docs)**:
  - Multi-search (`/search/multi` for movies & TV shows).
  - Metadata, runtimes, genres, taglines, synopsis.
  - High-resolution poster and backdrop artwork galleries.
  - Cast and crew credits with prioritized directorial/cinematography hierarchy.
  - Upcoming theatrical releases and official YouTube trailer keys.

---

## 3. Repository Directory Structure

```
theretrotalks/
├── backend/
│   ├── .env.example              # Sample environment configuration
│   ├── package.json              # Backend scripts & dependencies
│   ├── retro_talks.db            # Local SQLite database file (when Turso not configured)
│   ├── server.js                 # Express app initialization, static serving & startup logic
│   └── src/
│       ├── config/
│       │   ├── crewPriority.js   # Hierarchical ranking for movie crew (Dir, Cinematographer, etc.)
│       │   └── env.js            # Environment variable validation and paths
│       ├── controllers/
│       │   ├── authController.js   # Admin login, logout, verification status
│       │   ├── backupController.js # Database export (JSON) & import (merge/replace)
│       │   ├── movieController.js  # TMDB search, details, upcoming releases, galleries
│       │   └── reviewController.js # CRUD, reordering, slug resolution
│       ├── db/
│       │   ├── connection.js     # @libsql/client initialization (Turso vs. SQLite)
│       │   ├── index.js          # DB export wrapper & init hook
│       │   ├── schema.js         # Table definitions & non-destructive migrations
│       │   └── seed.js           # Default reviews seed for fresh installs
│       ├── middleware/
│       │   └── auth.js           # Bearer token verification middleware for admin routes
│       ├── routes/
│       │   ├── authRoutes.js     # /api/admin/*
│       │   ├── index.js          # Root API router, SSE stream, /proxy-image
│       │   ├── movieRoutes.js    # /api/movies/*
│       │   └── reviewRoutes.js   # /api/reviews/*
│       ├── services/
│       │   ├── eventsService.js            # SSE connection manager & event broadcaster
│       │   ├── reviewEnrichmentService.js  # Background credit backfill from TMDB
│       │   └── tmdbService.js              # TMDB API wrapper (search, details, credits, images)
│       └── utils/
│           └── slugify.js        # URL slug generation utility (Node.js)
│
├── frontend/
│   ├── index.html                # HTML entry point (loads Poppins & Inter fonts)
│   ├── package.json              # Frontend scripts & dependencies
│   ├── vite.config.ts            # Vite config with React plugin & Tailwind v4
│   ├── tsconfig.json             # TypeScript root config
│   ├── public/                   # Static assets (favicons, promotional graphics)
│   └── src/
│       ├── App.tsx               # Root component: custom SPA router, admin auth, SSE sync
│       ├── main.tsx              # React DOM render entry
│       ├── index.css             # Tailwind v4 directives, @theme, custom CSS variables
│       ├── types.ts              # Core TypeScript interfaces (Review, Movie, CastMember, etc.)
│       ├── components/
│       │   ├── AboutModal.tsx              # "About The Retro Talks" information modal
│       │   ├── AdminSidebar.tsx            # Left drawer for review reordering & DB backups
│       │   ├── AvengersCountdown.tsx       # Countdown widget for upcoming marquee films
│       │   ├── AvengersDoomsdayModal.tsx   # Feature spotlight modal
│       │   ├── BackdropFramingModal.tsx    # Interactive pan/zoom framing adjuster
│       │   ├── BackdropSelectorModal.tsx   # Choose alternate backdrop from TMDB
│       │   ├── CinemaReviewStudioModal.tsx # Quick reflection view modal
│       │   ├── CinemaSearchModal.tsx       # Live TMDB search for adding new reviews
│       │   ├── DatabaseImportModal.tsx     # Merge/replace JSON database backups
│       │   ├── DeleteConfirmModal.tsx      # Confirmation dialog for review deletion
│       │   ├── EditReviewModal.tsx         # Comprehensive review editor modal
│       │   ├── Footer.tsx                  # Site footer with social links & copyright
│       │   ├── FormattedReviewText.tsx     # Custom markdown parser (spoilers, formatting)
│       │   ├── Icons.tsx                   # SVG icon definitions
│       │   ├── MovieModal.tsx              # Quick details & trailer player modal
│       │   ├── PosterSelectorModal.tsx     # Alternate poster picker from TMDB
│       │   ├── ReviewCard.tsx              # Horizontal review diary card on home page
│       │   ├── ReviewEditor.tsx            # Form controls for writing/editing reviews
│       │   ├── ReviewModal.tsx             # Full review reader modal
│       │   ├── ReviewPosterCard.tsx        # Vertical poster card presentation
│       │   ├── StarRating.tsx              # Interactive & display star rating component
│       │   ├── StoryCardBuilderModal.tsx   # 9:16 Social Story Studio (Single & Multi-slide)
│       │   └── UpcomingMoviesSidebar.tsx   # Sidebar showing TMDB upcoming releases
│       ├── data/
│       │   └── sampleReviews.ts  # Fallback reviews for offline or demo initialization
│       ├── pages/
│       │   ├── AdminPage.tsx     # Dedicated admin review management console
│       │   ├── RetroTalksPage.tsx# Home cinema diary feed with filters & search
│       │   └── ReviewPage.tsx    # Standalone permalink review page (/review/:slugOrId)
│       └── utils/
│           ├── draftStorage.ts   # LocalStorage draft persistence for review authoring
│           ├── formatRating.ts   # Rating number formatting helper
│           ├── images.ts         # TMDB image URL builder (w500, original)
│           └── slugify.ts        # Client-side URL slug generator
│
├── Dockerfile                    # Multi-stage production build (Node 22 Alpine)
├── docker-compose.yml            # Container orchestration with persistent volume
├── render.yaml                   # Render deployment configuration
└── README.md                     # Public user documentation
```

---

## 4. Database Architecture & Schema

The database uses SQLite / LibSQL via `@libsql/client`. Schema initialization and non-destructive column additions are managed in `backend/src/db/schema.js`.

### Primary Tables

#### `reviews`
Stores all published film and television critiques:
- `id` (TEXT, PRIMARY KEY): Unique string or timestamp-based ID.
- `tmdb_id` (INTEGER): TMDB movie or TV ID.
- `title` (TEXT, NOT NULL): Film or show title.
- `year` (TEXT): Release year (e.g., `"2023"`).
- `poster` (TEXT, NOT NULL): TMDB poster path or absolute URL.
- `backdrop` (TEXT): TMDB backdrop path or absolute URL.
- `backdrop_framing` (TEXT): JSON string storing `{ x: number, y: number, height: number, zoom: number }` for custom viewport framing.
- `director` (TEXT): Director name(s). Supports multiple directors (comma-separated).
- `genres` (TEXT): JSON array string of genres (e.g. `'["Sci-Fi", "Drama"]'`).
- `rating` (REAL, NOT NULL): Numerical rating from `0.5` to `5.0` (in 0.5 increments).
- `review` (TEXT, NOT NULL): The full review body (supports custom markdown formatting).
- `watched_date` (TEXT): Date watched (e.g., `"2026-03-15"`).
- `is_favorite` (INTEGER, DEFAULT 0): Legacy boolean flag (1 or 0).
- `created_at` (INTEGER): Unix timestamp (ms) when created.
- `updated_at` (INTEGER): Unix timestamp (ms) when last modified.
- `cast` (TEXT): JSON array string of top billed cast members `{ id, name, character, picture }`.
- `crew` (TEXT): JSON array string of key crew members `{ id, name, job, department, picture }`.
- `overview` (TEXT): Plot synopsis / summary.
- `slug` (TEXT): URL-friendly slug derived from `title` (e.g., `"oppenheimer-2023"`).
- `display_order` (INTEGER, DEFAULT 0): Order index for custom admin drag-and-drop sorting.
- `media_type` (TEXT, DEFAULT 'movie'): Either `'movie'` or `'tv'`.

#### `admin_config`
Key-value store for system configurations (e.g., custom admin password hashes).

#### `admin_sessions`
Active admin authentication session tokens:
- `token` (TEXT, PRIMARY KEY): Random hex token generated on successful login.
- `created_at` (INTEGER): Timestamp of creation.

---

## 5. Core Features & Subsystems

### A. Story Studio (`StoryCardBuilderModal.tsx`)
A 9:16 (1080×1920) social card design suite for exporting Instagram, TikTok, and Twitter stories.

1. **Three Studio Modes**:
   - `summary`: Single Quick Story Card with floating poster and concise review quote/reflection.
   - `rating`: Minimalist Rating Card focusing purely on poster, film metadata, and star rating.
   - `full_set`: Multi-Slide Full Review Set that paginates long-form reviews across consecutive slides.
2. **Three Curated Layout Presets**:
   - `cinematic`: **Cinematic Glass** — Balanced floating poster with glassmorphic review quote card.
   - `poster_hero`: **Poster Hero** — Enlarged hero poster with centered quote callout.
   - `editorial`: **Editorial Journal** — Compact poster with two-deck editorial column layout.
3. **Typography Constraints**:
   - Only **Inter** and **Poppins** fonts are enabled.
   - Title weight is strictly capped up to **600** (`normal` 400, `medium` 500, `semibold` 600).
4. **Rating Metric Presentation**:
   - `stars_metric`: Visual stars with decimal metric (e.g. `★★★★☆ 4.5/5`).
   - `stars_minimal`: Clean minimalist stars only (e.g. `★★★★☆`).
5. **Manual Layout & Spacing Engine**:
   - Granular user control over side padding (`cardPaddingX`), top inset (`topBarPaddingY`), footer margin (`footerPaddingY`), header gap (`headerGapY`), poster scale (`posterScale`), title scale (`titleScale`), star rating scale, font size, line height, paragraph spacing, and image border mode.
6. **Lossless Export Engine**:
   - Single PNG export: Captures the active card ref at 360×640 with `pixelRatio: 3` resulting in 1080×1920 resolution.
   - Batch ZIP export: Automates headless rendering across all generated slides and downloads a `.zip` archive via JSZip.
   - CORS prevention: Images are preloaded as base64 data URLs via `/api/proxy-image` before export so the canvas is never tainted.

### B. Custom Review Text Formatter (`FormattedReviewText.tsx`)
A specialized markdown parser and renderer:
- **Spoilers**: `||spoiler text||` or `<spoiler>text</spoiler>` renders an interactive spoiler tag that starts blurred and unblurs upon click/tap.
- **Bold**: `**text**`, `<b>text</b>`, `<strong>text</strong>`.
- **Italics**: `*text*`, `_text_`, `<i>text</i>`, `<em>text</em>`.
- **Strikethrough**: `~~text~~`.
- **Blockquotes**: Lines starting with `>` are rendered with a styled orange left border and dark glass background.
- **Lists**: Bullet points (`- ` or `* `).
- **Links**: `[anchor](url)` opens safely in a new tab.
- **Density Profiles**: `dense`, `standard`, and `spacious` font scale and line-height modes.

### C. Live Real-Time Sync (SSE)
- When any review is created, edited, reordered, or deleted in the admin panel, `eventsService.broadcastReviewUpdate()` publishes a `reviews_updated` event through `/api/events`.
- `App.tsx` listens via `EventSource("/api/events")` and triggers a background refetch.
- Also revalidates automatically whenever the browser tab regains focus or visibility.

### D. Single Review Permalink Page (`ReviewPage.tsx`)
- Accessible via `/review/:slugOrId` or hash `#/review/:slugOrId`.
- Resolves reviews by URL slug (e.g. `/review/interstellar`) with fallback to numeric ID.
- Features dynamic scroll-responsive translucent top navigation, synopsis toggle, cast & crew tabs, TMDB backdrop framing preview, and direct button to launch Story Studio for that review.

### E. Backdrop & Poster Customization
- **Framing**: `BackdropFramingModal.tsx` provides an interactive framing preview to pan the horizontal (X) and vertical (Y) focal point of wide backdrops across mobile and desktop banners.
- **Gallery Selectors**: `PosterSelectorModal.tsx` and `BackdropSelectorModal.tsx` query TMDB images for alternate official posters and fanart.

---

## 6. Important Design Guidelines & Recent Decisions

> [!IMPORTANT]
> Keep these hard constraints in mind when modifying the codebase. Do not accidentally revert these decisions:

1. **No "Favorite" Tags**:
   - The user explicitly requested removing favorite tags/badges from review cards on the home page and review page. Do not add favorite tags to review cards.
2. **No "TV Show" Badges on Home Cards**:
   - Home review cards should look uniform and cinematic without pill badges labeling media types.
3. **Card Image Borders**:
   - Review card poster and backdrop image borders must match the site background color (`#07080a`) or be transparent. Never add harsh white or grey borders.
4. **Story Studio Presets**:
   - Only 3 presets exist: `cinematic` (Cinematic Glass), `poster_hero` (Poster Hero), and `editorial` (Editorial Journal).
   - Removed / deprecated presets: *Auteur Monolith*, *Cinemascope 2.39:1*, and *Cahiers Masthead*. Do not restore them.
5. **Story Studio Typography**:
   - Only `inter` and `poppins` fonts are permitted.
   - Title weight is capped at `600` (`semibold`). Bold (700) and Black (900) are removed.
   - Removed fonts: *Cinzel*, *Playfair*, *Bebas Neue*, *JetBrains Mono*.
6. **No Material Finish Option**:
   - The user-facing "Card Material Finish" selector has been removed. The Story Studio card uses a clean, permanent obsidian glass finish.
7. **No "Director Index" Rating Format**:
   - Only `stars_metric` (Stars + Index) and `stars_minimal` (Minimalist Stars) are available in Story Studio.
8. **Multiple Directors Support**:
   - Films directed by multiple individuals (e.g. Daniels for *EEAAO*, Wachowskis, Coen Brothers) display all directors joined by commas (e.g., "Dir. Daniel Kwan, Daniel Scheinert").

---

## 7. API Endpoints Reference

### Public Endpoints
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Health check returning status and database type (`turso_cloud` vs `local_sqlite`). |
| `GET` | `/api/reviews` | Get all reviews sorted by `display_order ASC, created_at DESC`. |
| `GET` | `/api/reviews/:idOrSlug` | Get a single review by slug or ID. |
| `GET` | `/api/movies/search?q=&type=` | Search TMDB for movies/TV shows. |
| `GET` | `/api/movies/upcoming` | Fetch upcoming theatrical releases from TMDB. |
| `GET` | `/api/movies/:id?mediaType=` | Get full TMDB movie/TV details, credits, and trailers. |
| `GET` | `/api/movies/:id/images?mediaType=` | Fetch all posters and backdrops from TMDB. |
| `GET` | `/api/events` | SSE connection stream for real-time synchronization. |
| `GET` | `/api/proxy-image?url=` | CORS-safe remote image proxy for canvas exports. |

### Admin Endpoints (Require `Authorization: Bearer <token>`)
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/admin/login` | Authenticate with admin password, returns session token. |
| `POST` | `/api/admin/logout` | Invalidate current session token. |
| `GET` | `/api/admin/status` | Verify if request token is a valid admin session. |
| `POST` | `/api/reviews` | Create a new review. |
| `PUT` | `/api/reviews/:id` | Update an existing review. |
| `DELETE` | `/api/reviews/:id` | Delete a review. |
| `POST` | `/api/reviews/reorder` | Update `display_order` for an array of review IDs. |
| `GET` | `/api/admin/backup` | Download complete database export as JSON. |
| `POST` | `/api/admin/import` | Import reviews JSON with `merge` or `replace` mode. |

---

## 8. Development & Environment Configuration

### Environment Variables

Configure these in `backend/.env` (or root `.env` for Docker):

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Port for the Express backend server. |
| `TMDB_ACCESS_TOKEN` | **Yes** | `""` | TMDB API Read Access Token (v4 Bearer). |
| `ADMIN_PASSWORD` | **Yes** | `null` | Password to access `/admin` dashboard. |
| `ADMIN_USERNAME` | No | `admin` | Admin username. |
| `TURSO_DATABASE_URL` | No | `null` | Turso DB connection URL (e.g. `libsql://your-db.turso.io`). If omitted, uses local SQLite. |
| `TURSO_AUTH_TOKEN` | No | `null` | Turso database auth token. |
| `DB_PATH` | No | `../../retro_talks.db` | Custom file path for local SQLite file. |
| `FRONTEND_DIST` | No | `../../../frontend/dist` | Path to built frontend directory for production static serving. |

### Running Locally

```bash
# 1. Start Backend (Port 5000)
cd backend
npm install
npm run dev

# 2. Start Frontend (Port 5173, proxies /api to port 5000)
cd frontend
npm install
npm run dev

# 3. Build & Typecheck Frontend
cd frontend
npm run build
```

### Running with Docker

```bash
# Using Docker Compose
docker compose up -d

# View logs
docker compose logs -f
```

---

## 9. Conventions for Future AI Contributions

When modifying this repository, adhere to these coding standards:

1. **Tailwind v4 Conventions**: Do not create or expect a `tailwind.config.js`. Theme tokens, fonts, and root colors are set in `frontend/src/index.css` under `@theme` and `@layer base`.
2. **Canvas Export Compatibility**: Any image element rendered inside `StoryCardBuilderModal.tsx` must use `crossOrigin="anonymous"` and have its source preloaded or proxied through `/api/proxy-image`.
3. **Database Migrations**: When adding new fields to reviews, add an idempotent `ALTER TABLE reviews ADD COLUMN ...` inside `initSchema()` in `backend/src/db/schema.js` with a `try/catch` wrapper so existing databases migrate seamlessly without data loss.
4. **Preserve Comments & Docstrings**: Retain existing explanatory comments across complex components (especially `StoryCardBuilderModal.tsx` and `FormattedReviewText.tsx`).
5. **Always Verify Builds**: Before declaring a task finished, run `npm --prefix frontend run build` to verify that there are zero TypeScript compiler or Vite bundling errors.
