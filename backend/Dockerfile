# ============================================
# REUSA Backend - Production Dockerfile
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

# Install build dependencies for native modules (bcrypt, etc) and OpenSSL for Prisma
RUN apk add --no-cache openssl python3 make g++

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client FIRST (needed for TypeScript types)
RUN npx prisma generate

# Build the application
RUN npm run build

# Prune dev dependencies to keep only production ones
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine AS production

# Install OpenSSL for Prisma (no need for build tools as we copy pre-built modules)
RUN apk add --no-cache openssl

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY package*.json ./

# Copy ALL node_modules from builder (includes pre-built native modules like bcrypt)
COPY --from=builder /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Set ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Set production environment
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/live || exit 1

# Start command (migrations + start)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
