# Versions fixées (mise à jour volontaire : changer ici, dans docker-compose.yml, compose.prod.yml et ci.yml).
# Une seule image pour l'espace de travail npm (shared + backend + frontend).
FROM node:26.10.0-alpine3.24 AS dev
WORKDIR /repo
# Manifestes d'abord : `npm ci` reste en cache tant que les dépendances ne changent pas.
COPY package.json package-lock.json .npmrc ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --ignore-scripts
COPY . .
# Scripts d'installation lancés une fois les sources là (`nuxt prepare` du front en a besoin).
RUN npm rebuild

FROM dev AS build
RUN npm run build -w backend && npm run build -w frontend

# Image de prod : front compilé (autonome) + back compilé et ses seules dépendances d'exécution.
FROM node:26.10.0-alpine3.24 AS prod
WORKDIR /repo
ENV NODE_ENV=production
COPY package.json package-lock.json .npmrc ./
COPY shared/package.json shared/
COPY backend/package.json backend/
# Espace de travail réduit à shared + backend : `npm ci -w backend` installerait aussi les dépendances du front.
RUN npm pkg delete workspaces && npm pkg set "workspaces[]=shared" "workspaces[]=backend" \
  && npm install --omit=dev --ignore-scripts --no-audit --no-fund \
  && npm cache clean --force
COPY shared/src shared/src
COPY backend/drizzle backend/drizzle
COPY --from=build /repo/backend/dist backend/dist
COPY --from=build /repo/frontend/.output frontend/.output
USER node
