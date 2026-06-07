# --- Stage 1: build the React/PWA frontend ---
FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build          # outputs to ../backend/public

# --- Stage 2: backend runtime ---
FROM node:20-slim AS backend
WORKDIR /app/backend

# better-sqlite3 needs a compiler for its native build on install.
RUN apt-get update && apt-get install -y python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./

# Bring in the built frontend produced in stage 1.
COPY --from=frontend /app/backend/public ./public

ENV NODE_ENV=production
ENV PORT=3000
# SQLite database lives on the mounted volume.
ENV DATA_DIR=/data

EXPOSE 3000
CMD ["node", "server.js"]
