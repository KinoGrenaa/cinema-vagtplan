FROM node:22-alpine AS base

WORKDIR /app
ENV CI=true

FROM base AS dependencies

COPY package.json package-lock.json ./
COPY vendor ./vendor
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

FROM dependencies AS build

COPY . .
RUN npm run build \
  && rm -rf /opt/backend-dist \
  && cp -R dist /opt/backend-dist

FROM base AS production-dependencies

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY vendor ./vendor
RUN npm ci --omit=dev --omit=peer --omit=optional \
  && npm cache clean --force

COPY --from=dependencies /app/node_modules/.prisma ./node_modules/.prisma

FROM base AS runtime

ENV NODE_ENV=production
ENV BACKEND_DIST_SEED=/opt/backend-dist

COPY --from=production-dependencies /app/package.json /app/package-lock.json ./
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=production-dependencies /app/vendor ./vendor
COPY --from=build /opt/backend-dist /opt/backend-dist
COPY --from=build /app/scripts/start-container.mjs ./scripts/start-container.mjs

RUN mkdir -p /app/runtime-dist

EXPOSE 3001

CMD ["npm", "run", "start:container"]
