import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { BETTING_MS, HISTORY_SIZE, MAX_SEATS, resultOf, SPINNING_MS, WHEEL, type BetsDto, type RoundDto, type SeatDto, type TableEvent, type TableRoundDto, type UserDto } from '@casino/shared';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { Subject } from 'rxjs';
import { InsufficientFundsError } from '../domain/insufficient-funds.error.js';
import { RoundClosedError } from '../domain/round-closed.error.js';
import { RoundRepository } from '../domain/round.repository.js';

// Délai minimal entre deux envois des places : une rafale de jetons part en un seul message.
const SEATS_MS = 150;

// Le croupier : la table tourne toute seule, comme au casino. Faites vos jeux (BETTING_MS), rien ne va plus, la bille
// tombe et les gagnants sont payés, puis tour suivant (SPINNING_MS). Le tirage se fait ici, jamais dans le navigateur.
// Le numéro est tiré à l'ouverture et seul son hash est publié (voir RoundDto) : on ne peut pas le choisir après les mises.
// Autour de la table, chaque joueur a sa place (la couleur de ses jetons) : tous voient arriver les autres et leurs mises
// en direct (`events`, poussés par TableGateway).
// ponytail: une table par processus API (tour et places en mémoire) ; un verrou (advisory lock Postgres) et un bus
// partagé (Postgres LISTEN/NOTIFY) si l'API tourne un jour en plusieurs exemplaires.
@Injectable()
export class TableService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TableService.name);
  private round: Omit<TableRoundDto, 'now'> | null = null;
  // Graine du tour en cours, gardée secrète jusqu'au tirage.
  private seed = '';
  private timer: NodeJS.Timeout | undefined;
  // Arrêt demandé : un appel encore en cours ne relance plus de tour.
  private stopped = false;
  // Les joueurs à la table, assis (`seat`) ou spectateurs, par ordre d'arrivée : `connections` compte leurs onglets ouverts.
  private readonly present = new Map<string, { player: number; seat: number | null; name: string; connections: number }>();
  private arrivals = 0;
  // Places relues et poussées une à la fois, dans l'ordre, et pas plus d'une fois par SEATS_MS.
  private seatsTimer: NodeJS.Timeout | undefined;
  private seatsQueue = Promise.resolve();
  readonly events = new Subject<TableEvent>();

  constructor(private readonly rounds: RoundRepository) {}

  async onApplicationBootstrap() {
    await this.rounds.refundOpen();
    void this.open();
  }

  onApplicationShutdown() {
    this.stopped = true;
    clearTimeout(this.timer);
    clearTimeout(this.seatsTimer);
    this.events.complete();
  }

  private async open() {
    try {
      const seed = `${randomInt(WHEEL.length)}:${randomBytes(16).toString('hex')}`;
      const hash = createHash('sha256').update(seed).digest('hex');
      const id = await this.rounds.open(hash);
      this.seed = seed;
      if (this.stopped) return;
      this.round = { id, phase: 'betting', endsAt: Date.now() + BETTING_MS, result: null, hash, seed: null };
      this.timer = setTimeout(() => void this.close(id), BETTING_MS);
      this.publish();
    } catch (e) {
      this.retry(e, () => this.open());
    }
  }

  private async close(id: number) {
    try {
      const seed = this.seed;
      const result = resultOf(seed);
      await this.rounds.settle(id, result, seed);
      if (this.stopped) return;
      this.round = { id, phase: 'spinning', endsAt: Date.now() + SPINNING_MS, result, hash: this.round!.hash, seed };
      this.timer = setTimeout(() => void this.open(), SPINNING_MS);
      this.publish();
    } catch (e) {
      this.retry(e, () => this.close(id));
    }
  }

  private retry(error: unknown, again: () => Promise<void>) {
    this.logger.error(error);
    if (this.stopped) return;
    this.timer = setTimeout(() => void again(), 5000);
  }

  // Nouvelle phase : le tour et les places (mises débarrassées, ou gains du tirage).
  private publish() {
    this.events.next({ type: 'round', round: { ...this.round!, now: Date.now() } });
    this.publishSeats();
  }

  publishSeats() {
    if (this.seatsTimer || this.stopped) return;
    this.seatsTimer = setTimeout(() => {
      this.seatsTimer = undefined;
      this.seatsQueue = this.seatsQueue.then(async () => {
        try {
          this.events.next({ type: 'seats', ...(await this.seats()) });
        } catch (e) {
          // Base indisponible : la prochaine mise ou la prochaine phase republie les places.
          this.logger.error(e);
        }
      });
    }, SEATS_MS);
  }

  // Un onglet de plus à la table : le joueur garde sa place, ou prend la première libre, ou attend en spectateur.
  // Rend ce qui le désigne dans les places (`player`).
  join({ id, firstName }: UserDto): number {
    const present = this.present.get(id) ?? this.arrive(id, firstName);
    present.connections++;
    this.fillSeats();
    this.publishSeats();
    return present.player;
  }

  // Un onglet de moins : sans onglet ni jeton sur le tapis, le joueur s'en va (voir `seats`).
  leave(playerId: string) {
    const present = this.present.get(playerId);
    if (present) present.connections--;
    this.publishSeats();
  }

  private arrive(id: string, name: string) {
    const present = { player: ++this.arrivals, seat: null, name, connections: 0 };
    this.present.set(id, present);
    return present;
  }

  // Places libres données par ordre d'arrivée : les spectateurs montent à table dès qu'une place se libère.
  private fillSeats() {
    const taken = new Set([...this.present.values()].map((p) => p.seat));
    const free = Array.from({ length: MAX_SEATS }, (_, i) => i + 1).filter((n) => !taken.has(n));
    for (const p of this.present.values()) if (p.seat === null && free.length) p.seat = free.shift()!;
  }

  // Les joueurs assis et leurs mises du tour en cours, et le nombre de spectateurs. Un joueur parti garde sa place tant
  // que ses jetons sont sur le tapis.
  async seats(): Promise<{ seats: SeatDto[]; spectators: number }> {
    const placed = this.round ? await this.rounds.betsAt(this.round.id) : [];
    const bets = new Map(placed.map((p) => [p.playerId, p]));
    for (const p of placed) if (!this.present.has(p.playerId)) this.arrive(p.playerId, p.name);
    for (const [id, p] of this.present) if (!p.connections && !bets.has(id)) this.present.delete(id);
    this.fillSeats();
    const seats = [...this.present]
      .filter(([, p]) => p.seat !== null)
      .map(([id, p]) => ({ player: p.player, seat: p.seat!, name: p.name, bets: bets.get(id)?.bets ?? [], won: bets.get(id)?.won ?? null }))
      .sort((a, b) => a.seat - b.seat);
    return { seats, spectators: this.present.size - seats.length };
  }

  async current(playerId: string): Promise<RoundDto | null> {
    const round = this.round;
    if (!round) return null;
    return { ...round, now: Date.now(), bets: await this.rounds.betsOf(round.id, playerId) };
  }

  async placeBets(playerId: string, { round, bets }: BetsDto): Promise<number> {
    if (this.round?.id !== round || this.round.phase !== 'betting') throw new RoundClosedError();
    const balance = await this.rounds.placeBets(round, playerId, bets);
    if (balance === 'closed') throw new RoundClosedError();
    if (balance === 'funds') throw new InsufficientFundsError();
    this.publishSeats();
    return balance;
  }

  lastResults(): Promise<number[]> {
    return this.rounds.lastResults(HISTORY_SIZE);
  }
}
