
# ------------------------------------
# Stage 1: Build Frontend
# ------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# ------------------------------------
# Stage 2: Build Backend
# ------------------------------------
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
# Install ALL dependencies (including dev) to build verify
RUN npm ci
COPY backend ./
RUN npm run build

# ------------------------------------
# Stage 3: Production Runtime
# ------------------------------------
# Use slim image for smaller size, but need curl/libnss3-tools for mkcert
FROM node:20-slim

# Install system dependencies (mkcert needs certutil)
RUN apt-get update && apt-get install -y \
    libnss3-tools \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install mkcert binary directly (architecture-aware)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then MKCERT_ARCH="amd64"; \
    elif [ "$ARCH" = "aarch64" ]; then MKCERT_ARCH="arm64"; \
    elif [ "$ARCH" = "armv7l" ]; then MKCERT_ARCH="arm"; \
    else MKCERT_ARCH="amd64"; fi && \
    curl -L "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-$MKCERT_ARCH" -o /usr/local/bin/mkcert && \
    chmod +x /usr/local/bin/mkcert

WORKDIR /app

# Copy built frontend assets to backend public folder (for serving static files)
# We need to make sure backend/src/server.ts serves static files in prod!
# I will modify server.ts later to serve static files if needed, or assume Nginx.
# For simple setup, Express serving static files is easiest.
COPY --from=frontend-builder /app/frontend/dist /app/public

# Copy built backend files
COPY --from=backend-builder /app/backend/dist /app/dist
COPY --from=backend-builder /app/backend/package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production
# Update backend to look for public folder in correct place if serving locally

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/status || exit 1

CMD ["node", "dist/server.js"]
