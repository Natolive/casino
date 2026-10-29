import { Module } from '@nestjs/common';
import { GetWalletService } from './application/get-wallet.service.js';
import { RefillWalletService } from './application/refill-wallet.service.js';
import { WalletRepository } from './domain/wallet.repository.js';
import { DrizzleWalletRepository } from './infrastructure/drizzle-wallet.repository.js';
import { WalletController } from './infrastructure/http/wallet.controller.js';

@Module({
  controllers: [WalletController],
  providers: [GetWalletService, RefillWalletService, { provide: WalletRepository, useClass: DrizzleWalletRepository }],
})
export class WalletModule {}
