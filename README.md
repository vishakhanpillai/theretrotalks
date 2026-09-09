# The Retro Talks 🎬

A personal cinema diary, reflections archive, and film review platform built with React, TypeScript, Tailwind CSS, Node.js, and SQLite.

---

## 🚀 Quick Start with Docker

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/) installed.
- A free [TMDB API Read Access Token](https://www.themoviedb.org/settings/api).

### 1. Configure Environment
Copy `.env.example` to `.env` (or configure `backend/.env`):
```bash
cp .env.example .env
```
Fill in your `TMDB_ACCESS_TOKEN` and set your desired `ADMIN_PASSWORD`.

### 2. Run with Docker Compose
```bash
docker compose up -d
```
The application will build and launch at:
- **Web App & API**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/api/health`

To stop:
```bash
docker compose down
```

### 3. Run with Docker Directly
```bash
# Build the image
docker build -t theretrotalks .

# Run with persistent SQLite storage
docker run -d \
  -p 5000:5000 \
  -v retro_data:/app/data \
  --env-file .env \
  --name theretrotalks \
  theretrotalks
```

---

## 🛠 Local Development (Without Docker)

### Backend
```bash
cd backend
npm install
npm run dev
# Running on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173
```

---

## 🏗 Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js (Node 22+ with native `node:sqlite`), Express.
- **Database**: SQLite with WAL (Write-Ahead Logging) mode and persistent volume mounting.
- **APIs**: The Movie Database (TMDB) API for artwork, metadata, credits, and YouTube trailers.
