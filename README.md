# Le Grand Casino

Jeux de casino en jetons fictifs : la roulette européenne (un seul zéro), en 3D, et le blackjack, sept places autour d'un croupier.

## Lancer

```sh
cp .env.example .env
docker compose up -d
```

- Le jeu : http://casino.localhost:8090
- Le tableau de bord Traefik : http://traefik.casino.localhost:8090

Le port se règle dans `.env` (`HTTP_PORT`, 8090 par défaut parce que le 80 est souvent déjà pris). Front et API se
rechargent tout seuls à chaque modification.

Tests (règles de mise, paiements, donne du blackjack) : `docker compose exec backend npm test`.

## Architecture

Un espace de travail npm, une image Docker, comme Forrest Dump :

| Dossier    | Rôle |
|------------|------|
| `shared`   | Les règles, communes au front et à l'API : ordre du cylindre, couleurs, toutes les mises possibles (`BETS`) et leurs paiements, schéma Zod d'un tour ; le moteur du blackjack (`blackjack/game.ts`). |
| `backend`  | API Nest + Postgres (Drizzle). Un module par domaine (`auth`, `wallet`, `roulette`, `blackjack`), ce qui sert à toutes les tables dans `common` (places, WebSocket), découpé en `domain` / `application` / `infrastructure`. |
| `frontend` | Nuxt 4 + Nuxt UI, sans rendu serveur. Cylindre en Three.js, tapis en SVG. |

- **Table automatique** (`backend/src/roulette/application/table.service.ts`) : le serveur mène les tours pour tous les
  joueurs, 25 s de mises puis 25 s de tirage (`BETTING_MS`, `SPINNING_MS` dans `shared`). Les jetons posés partent à l'API au
  fil de l'eau (`PUT /api/roulette/bets`) et sont débités tout de suite, par un `UPDATE` conditionnel : le solde ne passe
  jamais sous zéro. Au tirage, les gagnants sont payés d'un bloc. Si l'API s'arrête pendant les mises, elle rend les mises
  du tour au redémarrage.
- **Table multijoueur en direct** (WebSocket `/ws/roulette`, `TableGateway`) : le serveur pousse les phases du tour, les
  joueurs assis (prénom, place, couleur de jetons ; 8 places, les suivants en spectateurs) et leurs mises, à mesure. Rien n'est lu des joueurs par ce canal (les
  mises restent sur l'API). Le proxy (Traefik en dev, Caddy en prod) envoie `/ws/` droit à l'API. Elle refuse les autres
  origines dès la poignée de main, exige la session (et ferme le socket à la déconnexion), limite les messages à 1 Ko et
  les onglets à 5 par joueur, pinge les connexions mortes et coupe les clients trop lents. Le navigateur se reconnecte
  tout seul (attente croissante, sauf refus 44xx) et reçoit le tour à jour.
- **Tirage vérifiable** : le numéro (`crypto.randomInt`) est tiré à l'ouverture du tour et seul `sha256("numéro:sel")` est
  publié. La graine est révélée au tirage ; le navigateur recalcule le hash et l'affiche, discrètement, sous le tapis.
- **Comptes** (`backend/src/auth`) : email, prénom, nom et mot de passe (scrypt) ; connexion par email, session dans un cookie httpOnly (seul son sha256 est en
  base). Sans compte, le front renvoie vers `/login`. Le premier compte créé est **admin** : page `/admin` pour voir les
  joueurs, changer leur rôle et leurs jetons.
- **La bille** (`frontend/app/utils/ball-physics.ts`) : une vraie simulation à chaque lancer (piste, frottements, chocs sur
  les losanges, rebonds de frette en frette), aléatoire à chaque fois. Pour que la bille tombe sur le numéro du serveur, le
  rotor reçoit un décalage d'un nombre entier de cases pendant que la bille est encore sur la piste. Les frettes se répètent
  à chaque case, donc ce décalage ne change pas la trajectoire, seulement le numéro d'arrivée.
- **Blackjack** (`backend/src/blackjack`, règles dans `shared/src/blackjack/game.ts`) : même table automatique, 7 cases.
  On arrive en spectateur et on choisit ses places (`PUT`/`DELETE /api/blackjack/seats/:n`), jusqu'à 3 cases par joueur,
  chacune avec sa mise ; on se lève quand aucune main n'y est en jeu (la mise du tour est rendue).
  15 s de mises (prolongées tant que personne n'a misé), la donne carte par carte, 15 s par décision (tirer, rester,
  doubler, séparer jusqu'à 4 mains ; au-delà, la main reste), puis le croupier (carte cachée regardée sur un as ou une
  figure, tire jusqu'à 16, reste sur tout 17). Blackjack payé 3 pour 2 ; ni assurance ni abandon. Mise par
  `PUT /api/blackjack/bet`, coups par `POST /api/blackjack/move` (doubler et séparer débitent tout de suite), la table
  entière poussée à chaque changement sur `/ws/blackjack`. Le sabot (6 jeux) est mélangé à chaque tour et seul
  `sha256("ordre du sabot:sel")` est publié avant les mises ; au règlement, le navigateur rejoue le tour sur le sabot
  révélé (mêmes règles partagées) et compare.
- **Ajouter un jeu** : son entrée dans `shared/src/games.ts`, son module Nest à côté des autres (une table en direct
  hérite de `LiveTableGateway` et s'assoit avec `Seating`), sa page Nuxt (`useLiveTable` pour le WebSocket, composants
  communs dans `components/table`).

Nouvelle table en base : modifier un `*.table.ts`, puis `docker compose exec backend npm run db:generate` ; la migration
s'applique au prochain démarrage de l'API.

## Production

En ligne sur https://casino.natolive.fr, sur le même serveur Docker que Patrimo.

- **CI** (`.github/workflows/ci.yml`) : à chaque push et PR, migrations sur une vraie base Postgres, tests, typecheck du
  front et construction de l'image de prod. Une modification qui ne touche que la doc (`*.md`) ne la lance pas.
- **Image** : sur `main`, publiée sur GHCR (`ghcr.io/natolive/casino:<sha du commit>`), les 10 dernières gardées. Elle
  ne contient que le front et le back compilés et les dépendances d'exécution du back.
- **Déploiement** : push sur `main` avec tests et image au vert → GitHub se connecte au serveur avec une clé qui ne peut
  lancer que `/srv/casino/deploy.sh <sha>` (met le dépôt sur ce commit, tire l'image puis
  `docker compose -f compose.prod.yml up -d`). Les migrations s'appliquent au démarrage de l'API, puis la CI vérifie
  `https://casino.natolive.fr/api/health` depuis l'extérieur. Revenir à une version : relancer le job « deploy » de son
  exécution dans l'onglet Actions, ou `/srv/casino/deploy.sh <sha>` sur le serveur.
- **Sur le serveur** : stack `compose.prod.yml` dans `/srv/casino/repo`, mot de passe Postgres et tag d'image dans son
  `.env` (non versionné). HTTPS par Caddy (`/srv/caddy`, commun à tous les projets), qui joint le front (`casino`) sur
  le réseau Docker `proxy` ; l'API passe par le front (`/api`), sauf la table en direct (`/ws/`) que Caddy envoie droit à
  l'API par le réseau `casino_ws` (voir `compose.prod.yml`). La base n'est pas exposée.
