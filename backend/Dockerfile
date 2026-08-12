# ─── Build stage ───
# Compiles TypeScript to JavaScript using the project's own build script
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps first (better layer caching — only re-runs if package files change)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ─── Production stage ───
# Clean image with only what's needed to run the compiled app
FROM node:20-alpine
WORKDIR /app

# Install production dependencies only (smaller image, no dev tools)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled output from the build stage
COPY --from=builder /app/dist ./dist

# Run as a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 5000
CMD ["node", "dist/server.js"]
