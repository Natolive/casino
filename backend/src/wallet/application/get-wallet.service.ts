import { Injectable } from '@nestjs/common';
import type { WalletDto } from '@casino/shared';
import { WalletRepository } from '../domain/wallet.repository.js';

@Injectable()
export class GetWalletService {
  constructor(private readonly wallets: WalletRepository) {}

  async execute(playerId: string): Promise<WalletDto> {
    return { balance: await this.wallets.balanceOf(playerId) };
  }
}
