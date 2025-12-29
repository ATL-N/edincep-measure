# Stage 1: Build the application
FROM node:20-alpine AS builder

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


FROM node:20-alpine AS runner





WORKDIR /app





ENV NODE_ENV=production





# Install production-only OS dependencies


RUN apk update && \


    apk add --no-cache postgresql-client dumb-init curl && \


    rm -rf /var/cache/apk/*





# Copy the standalone Next.js server output


COPY --from=builder /app/.next/standalone ./





# Copy the full node_modules from the builder stage, which includes Prisma engines


COPY --from=builder /app/node_modules ./node_modules





# Copy static assets


COPY --from=builder /app/.next/static ./.next/static


COPY --from=builder /app/public ./public





# Copy Prisma schema


COPY --from=builder /app/prisma ./prisma





# Copy and make the entrypoint script executable


COPY --from=builder /app/entrypoint.sh ./entrypoint.sh


RUN chmod +x ./entrypoint.sh





# Expose the port the app will run on


EXPOSE 3000





# Use dumb-init to properly handle signals and run the entrypoint


ENTRYPOINT ["/usr/bin/dumb-init", "--"]


CMD ["./entrypoint.sh"]

