FROM node:22-alpine AS deps

WORKDIR /app
RUN npm install -g npm@11.6.2
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder

WORKDIR /app
ARG NEXT_PUBLIC_AUTOMATION_RECIPIENT_EMAIL
ARG NEXT_PUBLIC_AUTOMATION_RECIPIENT_NAME
ENV NEXT_PUBLIC_AUTOMATION_RECIPIENT_EMAIL=$NEXT_PUBLIC_AUTOMATION_RECIPIENT_EMAIL
ENV NEXT_PUBLIC_AUTOMATION_RECIPIENT_NAME=$NEXT_PUBLIC_AUTOMATION_RECIPIENT_NAME
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN npm install -g npm@11.6.2

COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start"]
