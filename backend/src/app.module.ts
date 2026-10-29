import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './common/infrastructure/database/database.module.js';
import { DomainErrorFilter } from './common/infrastructure/http/domain-error.filter.js';
import { SameOriginGuard } from './common/infrastructure/http/same-origin.guard.js';
import { RouletteModule } from './roulette/roulette.module.js';
import { WalletModule } from './wallet/wallet.module.js';

// Nouveau jeu = son module ici ; il débite et crédite par WalletModule.
@Module({
  imports: [DatabaseModule, AuthModule, WalletModule, RouletteModule],
  providers: [
    { provide: APP_FILTER, useClass: DomainErrorFilter },
    { provide: APP_GUARD, useClass: SameOriginGuard },
  ],
})
export class AppModule {}
