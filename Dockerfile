FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build frontend
COPY . .
RUN npm run build

# Build server
RUN npx tsx --version || npm install -g tsx
COPY server/ server/

FROM node:20-alpine AS runner

WORKDIR /app
RUN apk add --no-cache curl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./

RUN npm ci --omit=dev && npm install express cors tsx ws

EXPOSE 3090

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3090/api/health || exit 1

CMD ["npx", "tsx", "server/index.ts"]
