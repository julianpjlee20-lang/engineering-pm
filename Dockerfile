# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY src ./src
COPY next.config.mjs tailwind.config.ts tsconfig.json postcss.config.js ./

# Build
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/src ./src
COPY --from=builder /app/next.config.mjs .

# Expose port
EXPOSE 3000

# Start
CMD ["pnpm", "start"]
