import { begin, blackjackBetSchema, dealerDraws, dealNext, handValue, isNatural, legalMoves, newGame, newShoe, payoutOf, play, replay, shoeOf, shoeSeed, type Card } from '@casino/shared';
import { Seating } from '../../src/common/application/seating.js';
import { BlackjackTableService } from '../../src/blackjack/application/blackjack-table.service.js';
import type { BlackjackRoundRepository } from '../../src/blackjack/domain/blackjack-round.repository.js';

// Sabot truqué pour le test : les cartes dans l'ordre où elles sortent, complétées par des 2.
const shoe = (...cards: Card[]) => [...cards, ...Array<Card>(40).fill('2C')];
const dealt = (cards: Card[], bets: { seat: number; bet: number }[]) => {
  const game = newGame(shoe(...cards), bets);
  while (dealNext(game));
  begin(game);
  return game;
};

describe('blackjack', () => {
  it('compte les as pour 1 ou 11', () => {
    expect(handValue(['AS', '6H'])).toEqual({ total: 17, soft: true });
    expect(handValue(['AS', '6H', 'TD'])).toEqual({ total: 17, soft: false });
    expect(handValue(['AS', 'AH', '9D'])).toEqual({ total: 21, soft: true });
    expect(isNatural(['AS', 'KH'])).toBe(true);
    expect(isNatural(['AS', 'KH'], 2)).toBe(false);
  });

  it('mélange six jeux complets, et la graine rend le même sabot', () => {
    const cards = newShoe((n) => Math.floor(Math.random() * n));
    expect(cards).toHaveLength(312);
    expect(cards.filter((c) => c === 'QH')).toHaveLength(6);
    expect(shoeOf(shoeSeed(cards, 'sel'))).toEqual(cards);
  });

  it('donne une carte à chacun, croupier compris, deux fois, de droite à gauche', () => {
    // Places 1 et 3, puis le croupier : 1re carte 9, 5, 7 ; 2e carte 8, 6, K.
    const game = dealt(['9S', '5H', '7D', '8S', '6H', 'KD'], [{ seat: 3, bet: 10 }, { seat: 1, bet: 10 }]);
    expect(game.boxes.map((b) => b.hands[0]!.cards)).toEqual([['9S', '8S'], ['5H', '6H']]);
    expect(game.dealer).toEqual(['7D', 'KD']);
    expect(game.turn).toEqual({ box: 0, hand: 0 });
    expect(legalMoves(game)).toEqual(['hit', 'stand', 'double']);
  });

  it('paie le blackjack 3 pour 2, la victoire 1 pour 1, rend la mise à égalité', () => {
    expect(payoutOf(['AS', 'KH'], 10, 1, ['9S', '8D'])).toBe(25);
    expect(payoutOf(['AS', 'KH'], 5, 1, ['9S', '8D'])).toBe(12);
    expect(payoutOf(['AS', 'KH'], 10, 1, ['AD', 'QD'])).toBe(10);
    expect(payoutOf(['TS', 'KH'], 10, 1, ['AD', 'QD'])).toBe(0);
    expect(payoutOf(['TS', '9H'], 10, 1, ['9S', '8D'])).toBe(20);
    expect(payoutOf(['TS', '7H'], 10, 1, ['9S', '8D'])).toBe(10);
    expect(payoutOf(['TS', '5H', '9C'], 10, 1, ['9S', '8D'])).toBe(0);
    expect(payoutOf(['TS', '5H'], 10, 1, ['9S', '6D', 'KC'])).toBe(20);
  });

  it('blackjack du croupier : personne ne joue', () => {
    const game = dealt(['9S', 'AD', '8S', 'KD'], [{ seat: 1, bet: 10 }]);
    expect(game.turn).toBeNull();
    expect(dealerDraws(game)).toBe(false);
  });

  it('séparer, doubler, puis le croupier tire jusqu’à 17', () => {
    // Paire de 8 contre un 6 ; le croupier a 16, tire et saute.
    const game = dealt(['8S', '6D', '8H', 'TD', '3C', '9C', 'TH', 'KS'], [{ seat: 1, bet: 10 }]);
    expect(legalMoves(game)).toContain('split');
    play(game, 'split'); // 8-3 et 8-9
    expect(game.boxes[0]!.hands.map((h) => h.cards)).toEqual([['8S', '3C'], ['8H', '9C']]);
    play(game, 'double'); // 8-3-10 = 21, mise doublée
    expect(game.boxes[0]!.hands[0]).toMatchObject({ bet: 20, doubled: true, done: true });
    expect(game.turn).toEqual({ box: 0, hand: 1 });
    play(game, 'stand');
    expect(game.turn).toBeNull();
    while (dealerDraws(game));
    expect(game.dealer).toEqual(['6D', 'TD', 'KS']);
    expect(game.boxes[0]!.hands.map((h) => payoutOf(h.cards, h.bet, 2, game.dealer))).toEqual([40, 20]);
    // Et le navigateur retrouve exactement la même donne depuis le sabot.
    expect(replay(game.shoe, [{ seat: 1, bet: 10 }], game.moves)).toEqual(game);
  });

  it('as séparés : une carte chacun', () => {
    const game = dealt(['AS', '6D', 'AH', 'TD', 'KC', '9C'], [{ seat: 1, bet: 10 }]);
    play(game, 'split');
    expect(game.turn).toBeNull();
    expect(isNatural(game.boxes[0]!.hands[0]!.cards, 2)).toBe(false);
  });

  it('refuse le coup qui n’est pas permis', () => {
    const game = dealt(['9S', '6D', '7H', 'TD'], [{ seat: 1, bet: 10 }]);
    expect(() => play(game, 'split')).toThrow();
    play(game, 'hit');
    expect(legalMoves(game)).toEqual(['hit', 'stand']);
    expect(blackjackBetSchema.safeParse({ round: 1, amount: 2.5 }).success).toBe(false);
  });
});

describe('places au blackjack', () => {
  it('on arrive en spectateur, on choisit ses cases, une case n’a qu’un joueur', () => {
    const seating = new Seating(7, false);
    seating.join('ana', 'Ana');
    seating.join('bob', 'Bob');
    expect(seating.seated()).toEqual([]);
    expect(seating.spectators).toBe(2);
    expect(seating.sit('ana', 'Ana', 3)).toBe(true);
    expect(seating.sit('ana', 'Ana', 5)).toBe(true);
    expect(seating.sit('bob', 'Bob', 3)).toBe(false);
    expect(seating.seated().map((s) => `${s.seat}:${s.name}`)).toEqual(['3:Ana', '5:Ana']);
    expect(seating.spectators).toBe(1);
    seating.stand('ana', 3);
    expect(seating.ownerOf(3)).toBeNull();
    // Partie sans jeton sur la table : ses cases se libèrent.
    seating.leave('ana');
    seating.update(new Map());
    expect(seating.ownerOf(5)).toBeNull();
  });
});

describe('table de blackjack', () => {
  it('on se lève d’une case jouée une fois le tour réglé', async () => {
    const repo = { close: async () => [{ playerId: 'ana', seat: 3, staked: 10 }], placeBet: async () => 'closed' } as unknown as BlackjackRoundRepository;
    const table = new BlackjackTableService(repo);
    const t = table as unknown as { round: number; phase: string; stakes: Map<number, object>; seating: Seating; deal(): Promise<void> };
    t.round = 1;
    t.seating.sit('ana', 'Ana', 3);
    t.stakes.set(3, { playerId: 'ana', amount: 10 });
    await t.deal();
    t.phase = 'playing';
    await expect(table.stand('ana', 3)).rejects.toThrow();
    t.phase = 'result';
    await expect(table.stand('ana', 3)).resolves.toBeNull();
    table.onApplicationShutdown();
  });
});
