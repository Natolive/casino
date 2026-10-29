import { GetLeaderboardService } from '../../src/wallet/application/get-leaderboard.service.js';
import type { WalletRepository } from '../../src/wallet/domain/wallet.repository.js';

describe('classement', () => {
  it('place le joueur après les plus riches, ex aequo au même rang', async () => {
    const balances: Record<string, number> = { a: 500, b: 900, c: 500, d: 2000 };
    const wallets = {
      balanceOf: async (id: string) => balances[id]!,
      richest: async () => [],
      countRicherThan: async (min: number) => Object.values(balances).filter((b) => b > min).length,
    } as unknown as WalletRepository;
    const leaderboard = new GetLeaderboardService(wallets);
    expect((await leaderboard.execute('d')).me).toEqual({ rank: 1, balance: 2000 });
    expect((await leaderboard.execute('a')).me).toEqual({ rank: 3, balance: 500 });
    expect((await leaderboard.execute('c')).me.rank).toBe(3);
  });
});
