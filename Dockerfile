# ==========================================
# STAGE 1: Build Frontend Assets
# ==========================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: Production Server
# ==========================================
FROM node:22-alpine

WORKDIR /app

# Install production dependencies for backend
COPY backend/package*.json ./backend/
RUN npm --prefix backend ci --omit=dev

# Copy backend source code
COPY backend/ ./backend/

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Default environment configuration
ENV NODE_ENV=production \
    PORT=5000 \
    DB_PATH=/app/data/retro_talks.db \
    FRONTEND_DIST=/app/frontend/dist

# Create persistent data directory for SQLite database
RUN mkdir -p /app/data

VOLUME ["/app/data"]

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the unified backend server
CMD ["node", "backend/server.js"]
