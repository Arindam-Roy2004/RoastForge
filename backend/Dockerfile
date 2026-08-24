# ─── Build stage ───
FROM node:20-alpine AS builder
WORKDIR /app

# Deps first for layer caching — only re-runs if package files change
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Production stage ───
FROM node:20-alpine
WORKDIR /app

# Pinned here, not left to the runtime .env. NODE_ENV gates the refresh cookie's
# Secure/SameSite flags (auth.controller.ts) and stack-trace suppression
# (error.middleware.ts), so a missing value silently downgrades auth.
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000

# Liveness only. Readiness (/health/ready) would make Docker restart-loop the
# container on a transient DB blip, which fixes nothing. The deploy gates on
# readiness instead.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
