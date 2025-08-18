FROM node:18-alpine AS builder

WORKDIR /app

# Install PostgreSQL client and other dependencies
RUN apk update && \
    apk add --no-cache postgresql-client curl

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js application
RUN npm run build

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Install PostgreSQL client for production image
RUN apk update && \
    apk add --no-cache postgresql-client curl

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs --ingroup nodejs


# Copy necessary files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma schema for migrations
COPY --from=builder /app/prisma ./prisma

# Create uploads directory with proper permissions
RUN mkdir -p /app/public/uploads
RUN chown -R nextjs:nodejs /app/public/uploads
RUN chmod -R 755 /app/public/uploads

# Set proper ownership for the entire app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3009

# Run Prisma migrations and start the application
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]