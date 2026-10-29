import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import {
  begin,
  BLACKJACK_BETTING_MS,
  BLACKJACK_RESULT_MS,
  BLACKJACK_SEATS,
  BLACKJACK_SEATS_PER_PLAYER,
  costOf,
  DEAL_STEP_MS,
  dealerDraws,
  DEALER_STEP_MS,
  dealNext,
  legalMoves,
  newGame,
  newShoe,
  payoutOf,
  play,
  shoeSeed,
  TURN_MS,
  type BlackjackBetDto,
  type BlackjackEvent,
  type BlackjackMoveDto,
  type BlackjackPhase,
  type BlackjackTableDto,
  type Card,
  type BlackjackGame,
  type Move,
  type UserDto,
} from '@casino/shared';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { Subject } from 'rxjs';
import type { LiveTable } from '../../common/application/live-table.js';
import { Seating } from '../../common/application/seating.js';
import { InsufficientFundsError } from '../../common/domain/errors/insufficient-funds.error.js';
import { RoundClosedError } from '../../common/domain/errors/round-closed.error.js';
import { IllegalMoveError, NotYourSeatError, NotYourTurnError, SeatInPlayError, SeatTakenError } from '../domain/blackjack.errors.js';
import { BlackjackRoundRepository } from '../domain/blackjack-round.repository.js';

// Le croupier de blackjack : la table tourne toute seule. On y arrive en spectateur et on choisit ses cases (`sit`). Mises ouvertes (BLACKJACK_BETTING_MS, prolongées tant que personne
// n'a misé), puis la donne carte par carte, la parole à chaque main de droite à gauche (TURN_MS par décision, puis la main
// reste), le croupier retourne sa carte et tire, les gagnants sont payés, et tour suivant. Les règles sont dans
// `@casino/shared` (game.ts) ; ici, l'horloge, l'argent et la table poussée à tous (`events`, par BlackjackGateway).
// Toutes les étapes passent l'une après l'autre (`exclusive`) : un coup joué et la fin du temps ne se croisent jamais.
// ponytail: une table par processus API, en mémoire ; comme la roulette, un verrou et un bus partagés si l'API tourne un
// jour en plusieurs exemplaires.
@Injectable()
export class BlackjackTableService implements OnApplicationBootstrap, OnApplicationShutdown, LiveTable<BlackjackEvent> {
  private readonly logger = new Logger(BlackjackTableService.name);
  private readonly seating = new Seating(BLACKJACK_SEATS, false);
  readonly events = new Subject<BlackjackEvent>();

  private round = 0;
  private phase: BlackjackPhase = 'betting';
  private endsAt = 0;
  private hash = '';
  // Graine du tour (ordre du sabot et sel), gardée secrète jusqu'au règlement.
  private seed = '';
  private shoe: Card[] = [];
  // Mises posées pendant les mises, par case ; puis, cartes données, le joueur et la mise de départ de chaque case jouée.
  private readonly stakes = new Map<number, { playerId: string; amount: number }>();
  private readonly owners = new Map<number, { playerId: string; bet: number }>();
  private game: BlackjackGame | null = null;

  private timer: NodeJS.Timeout | undefined;
  // Numéro de la prochaine étape prévue : une étape remplacée entre-temps (coup joué avant la fin du temps) ne fait rien.
  private ticks = 0;
  private stopped = false;
  private queue = Promise.resolve();

  constructor(private readonly rounds: BlackjackRoundRepository) {}

  async onApplicationBootstrap() {
    await this.rounds.refundOpen();
    this.schedule(0, () => this.open());
  }

  onApplicationShutdown() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.events.complete();
  }

  // Une étape à la fois, dans l'ordre d'arrivée.
  private exclusive<T>(step: () => Promise<T> | T): Promise<T> {
    const result = this.queue.then(step);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  // Prochaine étape du croupier dans `ms`, à la place de celle qui était prévue. Base indisponible : nouvel essai 5 s après.
  private schedule(ms: number, step: () => Promise<void> | void) {
    clearTimeout(this.timer);
    if (this.stopped) return;
    const tick = ++this.ticks;
    this.timer = setTimeout(() => {
      this.exclusive(() => (tick === this.ticks && !this.stopped ? step() : undefined)).catch((e: unknown) => {
        this.logger.error(e);
        this.schedule(5000, step);
      });
    }, ms);
  }

  // Nouveau tour : sabot mélangé, son hash publié ; les joueurs partis libèrent leur case.
  private async open() {
    const shoe = newShoe(randomInt);
    const seed = shoeSeed(shoe, randomBytes(16).toString('hex'));
    const hash = createHash('sha256').update(seed).digest('hex');
    const id = await this.rounds.open(hash);
    Object.assign(this, { round: id, shoe, seed, hash, game: null });
    this.stakes.clear();
    this.owners.clear();
    this.seating.update(new Map());
    this.betting();
  }

  private betting() {
    this.phase = 'betting';
    this.endsAt = Date.now() + BLACKJACK_BETTING_MS;
    this.schedule(BLACKJACK_BETTING_MS, () => this.deal());
    this.publish();
  }

  // Rien ne va plus : les mises du tour, lues en base, prennent leur case, et la donne commence.
  private async deal() {
    this.seating.round();
    // Personne n'a misé : la table attend, mises toujours ouvertes.
    if (!this.stakes.size) return this.betting();
    const bets = await this.rounds.close(this.round);
    if (!bets.length) return this.open();
    // Les mises deviennent des cases jouées : `owners` les garde jusqu'au tour suivant.
    this.stakes.clear();
    for (const { seat, playerId, staked } of bets) this.owners.set(seat, { playerId, bet: staked });
    this.game = newGame(
      this.shoe,
      bets.map((b) => ({ seat: b.seat, bet: b.staked })),
    );
    this.phase = 'dealing';
    this.dealCard();
  }

  private dealCard() {
    if (!dealNext(this.game!)) {
      begin(this.game!);
      return this.nextTurn();
    }
    this.publish();
    this.schedule(DEAL_STEP_MS, () => this.dealCard());
  }

  // La parole à la main suivante (le temps repart à chaque coup) ; plus personne : au croupier, qui retourne sa carte.
  private nextTurn() {
    if (this.game!.turn) {
      this.phase = 'playing';
      this.endsAt = Date.now() + TURN_MS;
      this.schedule(TURN_MS, () => this.play('stand'));
    } else {
      this.phase = 'dealer';
      this.schedule(DEALER_STEP_MS, () => this.dealerCard());
    }
    this.publish();
  }

  private play(move: Move) {
    play(this.game!, move);
    this.nextTurn();
  }

  private dealerCard() {
    if (!dealerDraws(this.game!)) return this.settle();
    this.publish();
    this.schedule(DEALER_STEP_MS, () => this.dealerCard());
  }

  private async settle() {
    const { boxes, dealer } = this.game!;
    const settlements = boxes.map(({ seat, hands }) => {
      const settled = hands.map((h) => ({ cards: h.cards, bet: h.bet, doubled: h.doubled, won: payoutOf(h.cards, h.bet, hands.length, dealer) }));
      return { playerId: this.owners.get(seat)!.playerId, seat, hands: settled, won: settled.reduce((sum, h) => sum + h.won, 0) };
    });
    await this.rounds.settle(this.round, this.seed, settlements);
    this.phase = 'result';
    this.endsAt = Date.now() + BLACKJACK_RESULT_MS;
    this.schedule(BLACKJACK_RESULT_MS, () => this.open());
    this.publish();
  }

  placeBet(playerId: string, { round, seat, amount }: BlackjackBetDto): Promise<number> {
    return this.exclusive(async () => {
      if (round !== this.round || this.phase !== 'betting') throw new RoundClosedError();
      if (this.seating.ownerOf(seat) !== playerId) throw new NotYourSeatError();
      const balance = await this.rounds.placeBet(round, playerId, seat, amount);
      if (balance === 'closed') throw new RoundClosedError();
      if (balance === 'funds') throw new InsufficientFundsError();
      this.seating.played(playerId);
      if (amount) this.stakes.set(seat, { playerId, amount });
      else this.stakes.delete(seat);
      this.publish();
      return balance;
    });
  }

  // S'asseoir à une case libre, BLACKJACK_SEATS_PER_PLAYER au plus ; on y jouera dès la prochaine donne.
  sit({ id, firstName }: UserDto, seat: number): Promise<void> {
    return this.exclusive(() => {
      if (this.seating.seatsOf(id).length >= BLACKJACK_SEATS_PER_PLAYER) throw new SeatTakenError(`${BLACKJACK_SEATS_PER_PLAYER} cases au plus par joueur.`);
      if (!this.seating.sit(id, firstName, seat)) throw new SeatTakenError();
      this.publish();
    });
  }

  // Se lever : sa mise du tour lui est rendue ; pas tant que la case joue une main.
  stand(playerId: string, seat: number): Promise<number | null> {
    return this.exclusive(async () => {
      if (this.seating.ownerOf(seat) !== playerId) throw new NotYourSeatError();
      if (this.owners.has(seat) && this.phase !== 'result') throw new SeatInPlayError();
      let balance: number | null = null;
      if (this.stakes.has(seat)) {
        const refunded = await this.rounds.placeBet(this.round, playerId, seat, 0);
        if (refunded === 'closed') throw new SeatInPlayError();
        if (refunded !== 'funds') balance = refunded;
        this.stakes.delete(seat);
      }
      this.seating.stand(playerId, seat);
      this.publish();
      return balance;
    });
  }

  // Un coup sur la main qui a la parole, par son joueur. Doubler ou séparer débite d'abord la mise de la main.
  move(playerId: string, { round, move }: BlackjackMoveDto): Promise<void> {
    return this.exclusive(async () => {
      const game = this.game;
      if (round !== this.round || this.phase !== 'playing' || !game?.turn) throw new NotYourTurnError();
      if (this.owners.get(game.boxes[game.turn.box]!.seat)?.playerId !== playerId) throw new NotYourTurnError();
      if (!legalMoves(game).includes(move)) throw new IllegalMoveError();
      this.seating.played(playerId);
      const cost = costOf(game, move);
      if (cost && (await this.rounds.raise(round, game.boxes[game.turn.box]!.seat, playerId, cost)) === 'funds') throw new InsufficientFundsError();
      this.play(move);
    });
  }

  join({ id, firstName }: UserDto): number {
    const player = this.seating.join(id, firstName);
    this.publish();
    return player;
  }

  // Un onglet de moins : sans onglet ni jeton sur la table, le joueur libère ses cases. Après les étapes en cours : une
  // mise en train d'être enregistrée garde sa case.
  leave(playerId: string) {
    this.seating.leave(playerId);
    void this.exclusive(() => {
      this.seating.update(this.holders());
      this.publish();
    });
  }

  // Les joueurs qui ont des jetons sur la table ce tour-ci : ils gardent leurs cases même partis.
  private holders() {
    return new Map([...this.stakes.values(), ...this.owners.values()].map((o) => [o.playerId, '']));
  }

  async snapshot(): Promise<BlackjackEvent | null> {
    return this.round ? { type: 'table', table: this.view() } : null;
  }

  private publish() {
    if (this.round && !this.stopped) this.events.next({ type: 'table', table: this.view() });
  }

  // La table vue de tous : la carte cachée du croupier le reste jusqu'à ce qu'il joue, la graine jusqu'au règlement.
  view(): BlackjackTableDto {
    const game = this.game;
    const result = this.phase === 'result';
    const hidden = this.phase === 'dealing' || this.phase === 'playing';
    const boxes = this.seating.seated().map(({ player, seat, name }) => {
      const box = game?.boxes.find((b) => b.seat === seat);
      const hands = (box?.hands ?? []).map((h) => ({
        cards: h.cards,
        bet: h.bet,
        doubled: h.doubled,
        won: result ? payoutOf(h.cards, h.bet, box!.hands.length, game!.dealer) : null,
      }));
      return { seat, player, name, bet: box ? this.owners.get(seat)!.bet : (this.stakes.get(seat)?.amount ?? 0), hands };
    });
    const turn = game?.turn;
    return {
      round: this.round,
      phase: this.phase,
      endsAt: this.endsAt,
      now: Date.now(),
      hash: this.hash,
      seed: result ? this.seed : null,
      dealer: (game?.dealer ?? []).map((c, i) => (i === 1 && hidden ? null : c)),
      boxes,
      turn: turn ? { seat: game.boxes[turn.box]!.seat, hand: turn.hand } : null,
      moves: game?.moves ?? [],
      spectators: this.seating.spectators,
    };
  }
}
