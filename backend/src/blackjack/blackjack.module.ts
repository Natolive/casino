import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BlackjackTableService } from './application/blackjack-table.service.js';
import { BlackjackRoundRepository } from './domain/blackjack-round.repository.js';
import { DrizzleBlackjackRoundRepository } from './infrastructure/drizzle-blackjack-round.repository.js';
import { BlackjackController } from './infrastructure/http/blackjack.controller.js';
import { BlackjackGateway } from './infrastructure/ws/blackjack.gateway.js';

@Module({
  imports: [AuthModule],
  controllers: [BlackjackController],
  providers: [BlackjackTableService, BlackjackGateway, { provide: BlackjackRoundRepository, useClass: DrizzleBlackjackRoundRepository }],
})
export class BlackjackModule {}
