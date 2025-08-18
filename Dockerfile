FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app
ENV NODE_ENV='production'

RUN apk update && \
    apk add --no-cache postgresql-client curl

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Add this line to copy static files
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3009

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3007/api/health || exit 1

CMD ["npm", "start"]