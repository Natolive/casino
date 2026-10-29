import { Module } from '@nestjs/common';
import { GetLeaderboardService } from './application/get-leaderboard.service.js';
import { GetWalletService } from './application/get-wallet.service.js';
import { RefillWalletService } from './application/refill-wallet.service.js';
import { WalletRepository } from './domain/wallet.repository.js';
import { DrizzleWalletRepository } from './infrastructure/drizzle-wallet.repository.js';
import { LeaderboardController } from './infrastructure/http/leaderboard.controller.js';
import { WalletController } from './infrastructure/http/wallet.controller.js';

@Module({
  controllers: [WalletController, LeaderboardController],
  providers: [GetWalletService, RefillWalletService, GetLeaderboardService, { provide: WalletRepository, useClass: DrizzleWalletRepository }],
})
export class WalletModule {}
