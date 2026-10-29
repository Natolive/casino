import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import type { IncomingMessage } from 'node:http';
import { Subscription } from 'rxjs';
import type { WebSocket } from 'ws';
import { AuthService } from '../../../auth/application/auth.service.js';
import { sessionToken } from '../../../auth/infrastructure/http/session-cookie.js';
import type { LiveTable } from '../../application/live-table.js';

// Ping régulier : une connexion qui ne répond plus (réseau coupé sans fermeture) est coupée et libère sa place.
const HEARTBEAT_MS = 25_000;
// Un joueur qui ne lit plus ce qu'on lui envoie (onglet gelé, réseau saturé) est déconnecté au-delà de ce retard.
const MAX_BUFFERED = 1 << 20;
// Onglets ouverts à une table par joueur : au-delà, la connexion est refusée.
const MAX_CONNECTIONS = 5;

// Contre le détournement de session par un autre site (le navigateur envoie le cookie à tout WebSocket) : on n'accepte
// que les pages du casino. Le proxy (Traefik, Caddy) garde l'hôte demandé par le navigateur.
const sameOrigin = ({ origin, req }: { origin?: string; req: IncomingMessage }) => {
  try {
    return !!origin && new URL(origin).host === req.headers.host;
  } catch {
    return false; // `Origin: null` (iframe isolée) ou illisible.
  }
};

// Options de @WebSocketGateway pour une table servie sous `path` (/ws/<jeu>, que le proxy envoie droit à l'API).
export const liveTableOptions = (path: string) => ({ path, maxPayload: 1024, verifyClient: sameOrigin });

// Une table en direct (voir LiveTable) : le croupier parle, les joueurs écoutent. Réservé aux joueurs connectés, depuis le
// casino ; rien n'est lu de leur part (1 Ko au plus par message), les mises passent par l'API. Codes de fermeture 44xx :
// refus définitif, le navigateur ne se reconnecte pas. Chaque jeu en hérite avec son @WebSocketGateway.
export abstract class LiveTableGateway<E> implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  // Joueur et session de chaque connexion, et celles qui ont répondu au dernier ping.
  private readonly players = new Map<WebSocket, { playerId: string; token: string }>();
  private readonly alive = new WeakSet<WebSocket>();
  private readonly subscriptions = new Subscription();
  private heartbeat: NodeJS.Timeout | undefined;

  constructor(
    private readonly auth: AuthService,
    private readonly table: LiveTable<E>,
  ) {}

  onModuleInit() {
    this.subscriptions.add(this.table.events.subscribe((event) => this.broadcast(event)));
    this.subscriptions.add(
      this.auth.loggedOut.subscribe((token) => {
        for (const [socket, p] of this.players) if (p.token === token) socket.close(4401, 'Déconnecté.');
      }),
    );
    this.heartbeat = setInterval(() => {
      for (const socket of this.players.keys()) {
        if (!this.alive.has(socket)) socket.terminate();
        else {
          this.alive.delete(socket);
          socket.ping();
        }
      }
    }, HEARTBEAT_MS);
  }

  onModuleDestroy() {
    this.subscriptions.unsubscribe();
    clearInterval(this.heartbeat);
  }

  async handleConnection(socket: WebSocket, req: IncomingMessage) {
    const token = sessionToken(req);
    let user;
    try {
      user = token ? await this.auth.userOf(token) : null;
    } catch {
      // Base indisponible : passager, le navigateur réessaiera (pas un refus 44xx).
      return socket.close(1011, 'Table indisponible.');
    }
    if (!user) return socket.close(4401, 'Connexion requise.');
    // Fermée pendant qu'on retrouvait la session : handleDisconnect est déjà passé.
    if (socket.readyState !== socket.OPEN) return;
    if ([...this.players.values()].filter((p) => p.playerId === user.id).length >= MAX_CONNECTIONS)
      return socket.close(4429, 'Trop d’onglets ouverts à la table.');
    // Qui il est, d'abord ; puis il rejoint la diffusion (join republie les places aux autres), et reçoit la table à jour.
    this.send(socket, JSON.stringify({ type: 'you', player: this.table.join(user) }));
    this.players.set(socket, { playerId: user.id, token: token! });
    this.alive.add(socket);
    socket.on('pong', () => this.alive.add(socket));
    const snapshot = await this.table.snapshot(user.id).catch(() => null);
    if (snapshot && this.players.has(socket)) this.send(socket, JSON.stringify(snapshot));
  }

  handleDisconnect(socket: WebSocket) {
    const player = this.players.get(socket);
    if (!player) return;
    this.players.delete(socket);
    this.table.leave(player.playerId);
  }

  private broadcast(event: E) {
    const data = JSON.stringify(event);
    for (const socket of this.players.keys()) this.send(socket, data);
  }

  private send(socket: WebSocket, data: string) {
    if (socket.readyState !== socket.OPEN) return;
    if (socket.bufferedAmount > MAX_BUFFERED) return socket.terminate();
    socket.send(data);
  }
}
