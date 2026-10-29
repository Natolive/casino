import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { BETTING_MS, HISTORY_SIZE, resultOf, SPINNING_MS, WHEEL, type BetsDto, type RoundDto } from '@casino/shared';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { InsufficientFundsError } from '../domain/insufficient-funds.error.js';
import { RoundClosedError } from '../domain/round-closed.error.js';
import { RoundRepository } from '../domain/round.repository.js';

// Le croupier : la table tourne toute seule, comme au casino. Faites vos jeux (BETTING_MS), rien ne va plus, la bille
// tombe et les gagnants sont payés, puis tour suivant (SPINNING_MS). Le tirage se fait ici, jamais dans le navigateur.
// Le numéro est tiré à l'ouverture et seul son hash est publié (voir RoundDto) : on ne peut pas le choisir après les mises.
// ponytail: une table par processus API ; un verrou (advisory lock Postgres) si l'API tourne un jour en plusieurs exemplaires.
@Injectable()
export class TableService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TableService.name);
  private round: Omit<RoundDto, 'now' | 'bets'> | null = null;
  // Graine du tour en cours, gardée secrète jusqu'au tirage.
  private seed = '';
  private timer: NodeJS.Timeout | undefined;
  // Arrêt demandé : un appel encore en cours ne relance plus de tour.
  private stopped = false;

  constructor(private readonly rounds: RoundRepository) {}

  async onApplicationBootstrap() {
    await this.rounds.refundOpen();
    void this.open();
  }

  onApplicationShutdown() {
    this.stopped = true;
    clearTimeout(this.timer);
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
    } catch (e) {
      this.retry(e, () => this.close(id));
    }
  }

  private retry(error: unknown, again: () => Promise<void>) {
    this.logger.error(error);
    if (this.stopped) return;
    this.timer = setTimeout(() => void again(), 5000);
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
    return balance;
  }

  lastResults(): Promise<number[]> {
    return this.rounds.lastResults(HISTORY_SIZE);
  }
}
