import { Injectable } from '@nestjs/common';
import { STARTING_BALANCE, type WalletDto } from '@casino/shared';
import { WalletRepository } from '../domain/wallet.repository.js';

// Recharge quand il ne reste presque plus rien : le solde remonte aux jetons de départ, jamais au-delà.
@Injectable()
export class RefillWalletService {
  constructor(private readonly wallets: WalletRepository) {}

  async execute(playerId: string): Promise<WalletDto> {
    return { balance: await this.wallets.topUp(playerId, STARTING_BALANCE) };
  }
}
