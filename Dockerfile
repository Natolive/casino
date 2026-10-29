# Versions fixées (mise à jour volontaire : changer ici et dans docker-compose.yml).
# Une seule image pour l'espace de travail npm (shared + backend + frontend).
FROM node:26.10.0-alpine3.24 AS dev
WORKDIR /repo
COPY . .
RUN npm ci
