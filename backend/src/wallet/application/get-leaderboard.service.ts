import { Injectable } from '@nestjs/common';
import type { LeaderboardDto } from '@casino/shared';
import { WalletRepository } from '../domain/wallet.repository.js';

const TOP = 50;

@Injectable()
export class GetLeaderboardService {
  constructor(private readonly wallets: WalletRepository) {}

  async execute(playerId: string): Promise<LeaderboardDto> {
    const [top, balance] = await Promise.all([this.wallets.richest(TOP, playerId), this.wallets.balanceOf(playerId)]);
    return { top, me: { rank: (await this.wallets.countRicherThan(balance)) + 1, balance } };
  }
}
