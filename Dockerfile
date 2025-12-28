# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install OS-level dependencies needed for building
RUN apk update && \
    apk add --no-cache libc6-compat openssl && \
    rm -rf /var/cache/apk/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy the rest of the application code
COPY . .

# output: 'standalone' is configured in next.config.mjs

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js application
RUN npm run build


# Stage 2: Production image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install production-only OS-level dependencies (added curl for healthcheck)
RUN apk update && \
    apk add --no-cache postgresql-client dumb-init curl && \
    rm -rf /var/cache/apk/*

# Copy production node_modules from the builder stage
COPY --from=builder /app/node_modules ./

# Copy Prisma files from the builder stage
COPY --from=builder /app/prisma ./prisma

# Copy the standalone Next.js server output
COPY --from=builder /app/.next/standalone ./

# Copy the public folder
COPY --from=builder /app/public ./public

# Copy the static assets from the build
COPY --from=builder /app/.next/static ./.next/static

# Copy the entrypoint script
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

# Make the entrypoint script executable
RUN chmod +x ./entrypoint.sh

# Expose the port the app will run on
EXPOSE 3009

# Use dumb-init to properly handle signals
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Set the command to run the entrypoint script
CMD ["./entrypoint.sh"]