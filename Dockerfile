# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Install build-time dependencies
RUN apk update && \
    apk add --no-cache libc6-compat openssl

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js application (with standalone output)
RUN npm run build


# Stage 2: Production image
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install production-only OS dependencies
RUN apk update && \
    apk add --no-cache postgresql-client dumb-init && \
    rm -rf /var/cache/apk/*

# Copy necessary files from the builder stage based on standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Prisma needs its schema to run migrations in the entrypoint
COPY --from=builder /app/prisma ./prisma

# Copy and make the entrypoint script executable
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Expose the port the app will run on
EXPOSE 3009

# Use dumb-init to handle signals properly and run the entrypoint
ENTRYPOINT ["/usr/bin/dumb-init", "--", "./entrypoint.sh"]

# The command to start the app, which will be executed by the entrypoint
CMD ["node", "server.js"]
