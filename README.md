# Le Grand Casino

Jeux de casino en jetons fictifs. Pour l'instant : la roulette européenne (un seul zéro), en 3D.

## Lancer

```sh
cp .env.example .env
docker compose up -d
```

- Le jeu : http://roulette.localhost:8090
- Le tableau de bord Traefik : http://traefik.roulette.localhost:8090

Le port se règle dans `.env` (`HTTP_PORT`, 8090 par défaut parce que le 80 est souvent déjà pris). Front et API se
rechargent tout seuls à chaque modification.

Tests (règles de mise et paiements) : `docker compose exec backend npm test`.

## Architecture

Un espace de travail npm, une image Docker, comme Forrest Dump :

| Dossier    | Rôle |
|------------|------|
| `shared`   | Les règles, communes au front et à l'API : ordre du cylindre, couleurs, toutes les mises possibles (`BETS`) et leurs paiements, schéma Zod d'un tour. |
| `backend`  | API Nest + Postgres (Drizzle). Un module par domaine (`auth`, `wallet`, `roulette`), découpé en `domain` / `application` / `infrastructure`. |
| `frontend` | Nuxt 4 + Nuxt UI, sans rendu serveur. Cylindre en Three.js, tapis en SVG. |

- **Table automatique** (`backend/src/roulette/application/table.service.ts`) : le serveur mène les tours pour tous les
  joueurs, 25 s de mises puis 25 s de tirage (`BETTING_MS`, `SPINNING_MS` dans `shared`). Les jetons posés partent à l'API au
  fil de l'eau (`PUT /api/roulette/bets`) et sont débités tout de suite, par un `UPDATE` conditionnel : le solde ne passe
  jamais sous zéro. Au tirage, les gagnants sont payés d'un bloc ; le navigateur relit le tour (`GET /api/roulette/round`)
  à chaque fin de phase. Si l'API s'arrête pendant les mises, elle rend les mises du tour au redémarrage.
- **Tirage vérifiable** : le numéro (`crypto.randomInt`) est tiré à l'ouverture du tour et seul `sha256("numéro:sel")` est
  publié. La graine est révélée au tirage ; le navigateur recalcule le hash et l'affiche, discrètement, sous le tapis.
- **Comptes** (`backend/src/auth`) : email, prénom, nom et mot de passe (scrypt) ; connexion par email, session dans un cookie httpOnly (seul son sha256 est en
  base). Sans compte, le front renvoie vers `/login`. Le premier compte créé est **admin** : page `/admin` pour voir les
  joueurs, changer leur rôle et leurs jetons.
- **La bille** (`frontend/app/utils/ball-physics.ts`) : une vraie simulation à chaque lancer (piste, frottements, chocs sur
  les losanges, rebonds de frette en frette), aléatoire à chaque fois. Pour que la bille tombe sur le numéro du serveur, le
  rotor reçoit un décalage d'un nombre entier de cases pendant que la bille est encore sur la piste. Les frettes se répètent
  à chaque case, donc ce décalage ne change pas la trajectoire, seulement le numéro d'arrivée.
- **Ajouter un jeu** : son entrée dans `shared/src/games.ts`, son module Nest à côté de `roulette`, sa page Nuxt.

Nouvelle table en base : modifier un `*.table.ts`, puis `docker compose exec backend npm run db:generate` ; la migration
s'applique au prochain démarrage de l'API.

## Production

En ligne sur https://roulette.natolive.fr, sur le même serveur Docker que Patrimo.

- **CI** (`.github/workflows/ci.yml`) : à chaque push et PR, migrations sur une vraie base Postgres, tests, typecheck du
  front et construction de l'image de prod. Une modification qui ne touche que la doc (`*.md`) ne la lance pas.
- **Image** : sur `main`, publiée sur GHCR (`ghcr.io/natolive/roulette:<sha du commit>`), les 10 dernières gardées. Elle
  ne contient que le front et le back compilés et les dépendances d'exécution du back.
- **Déploiement** : push sur `main` avec tests et image au vert → GitHub se connecte au serveur avec une clé qui ne peut
  lancer que `/srv/roulette/deploy.sh <sha>` (met le dépôt sur ce commit, tire l'image puis
  `docker compose -f compose.prod.yml up -d`). Les migrations s'appliquent au démarrage de l'API, puis la CI vérifie
  `https://roulette.natolive.fr/api/health` depuis l'extérieur. Revenir à une version : relancer le job « deploy » de son
  exécution dans l'onglet Actions, ou `/srv/roulette/deploy.sh <sha>` sur le serveur.
- **Sur le serveur** : stack `compose.prod.yml` dans `/srv/roulette/repo`, mot de passe Postgres et tag d'image dans son
  `.env` (non versionné). HTTPS par Caddy (`/srv/caddy`, commun à tous les projets), qui joint le front (`roulette`) sur
  le réseau Docker `proxy` ; l'API passe par le front (`/api`), la base n'est pas exposée.
