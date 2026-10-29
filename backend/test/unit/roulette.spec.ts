import { ANNOUNCES, BETS, betsSchema, colorOf, neighborsOf, payout, WHEEL } from '@casino/shared';

describe('roulette européenne', () => {
  it('a 37 cases, 18 rouges, 18 noires', () => {
    expect(new Set(WHEEL).size).toBe(37);
    expect(WHEEL.filter((n) => colorOf(n) === 'red')).toHaveLength(18);
    expect(WHEEL.filter((n) => colorOf(n) === 'black')).toHaveLength(18);
  });

  it('connaît toutes les mises du tapis', () => {
    const count = (kind: string) => Object.keys(BETS).filter((k) => k.startsWith(`${kind}:`)).length;
    expect([count('straight'), count('split'), count('street'), count('corner'), count('line')]).toEqual([37, 60, 12, 22, 11]);
    // Chaque mise rend un nombre entier de jetons.
    for (const numbers of Object.values(BETS)) expect(36 % numbers.length).toBe(0);
  });

  it('paie au bon taux, mise comprise', () => {
    expect(payout([{ bet: 'straight:17', amount: 10 }], 17)).toBe(360);
    expect(payout([{ bet: 'split:17-20', amount: 10 }], 20)).toBe(180);
    expect(payout([{ bet: 'corner:16-17-19-20', amount: 10 }], 19)).toBe(90);
    expect(payout([{ bet: 'column:1', amount: 10 }], 34)).toBe(30);
    expect(payout([{ bet: 'red', amount: 10 }, { bet: 'odd', amount: 5 }], 0)).toBe(0);
    expect(payout([{ bet: 'black', amount: 10 }, { bet: 'dozen:3', amount: 5 }], 35)).toBe(20 + 15);
  });

  it('annonces : des mises du tapis couvrant leur secteur du cylindre', () => {
    const covered = (bets: string[]) => [...new Set(bets.flatMap((b) => BETS[b]!))].sort((a, b) => a - b);
    const arc = (from: number, length: number) => Array.from({ length }, (_, i) => WHEEL[(WHEEL.indexOf(from as never) + i) % 37]!).sort((a, b) => a - b);
    expect(covered(ANNOUNCES.voisins.bets)).toEqual(arc(22, 17));
    expect(covered(ANNOUNCES.tiers.bets)).toEqual(arc(27, 12));
    expect(covered(ANNOUNCES.orphelins.bets)).toEqual([...arc(17, 3), ...arc(1, 5)].sort((a, b) => a - b));
    expect(covered(ANNOUNCES.zero.bets)).toEqual(arc(12, 7));
    expect(neighborsOf(0)).toEqual(['straight:3', 'straight:26', 'straight:0', 'straight:32', 'straight:15']);
  });

  it('refuse une mise inconnue ou en double', () => {
    expect(betsSchema.safeParse({ round: 1, bets: [{ bet: 'split:1-5', amount: 1 }] }).success).toBe(false);
    expect(betsSchema.safeParse({ round: 1, bets: [{ bet: 'red', amount: 1 }, { bet: 'red', amount: 2 }] }).success).toBe(false);
    expect(betsSchema.safeParse({ round: 1, bets: [{ bet: 'red', amount: 1.5 }] }).success).toBe(false);
  });
});
