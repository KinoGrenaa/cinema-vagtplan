FROM node:22-alpine AS base

WORKDIR /app/frontend
ENV CI=true
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM dependencies AS build

ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

WORKDIR /app
COPY frontend ./frontend
COPY shared ./shared

WORKDIR /app/frontend
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/frontend/public ./frontend/public
COPY --from=build --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=nextjs:nodejs /app/frontend/scripts/start-container.mjs ./frontend/scripts/start-container.mjs

RUN mkdir -p /app/frontend/.next/cache \
  && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then((response)=>{if(response.status>=500)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "frontend/scripts/start-container.mjs"]
