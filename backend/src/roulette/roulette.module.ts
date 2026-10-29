import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TableService } from './application/table.service.js';
import { RoundRepository } from './domain/round.repository.js';
import { DrizzleRoundRepository } from './infrastructure/drizzle-round.repository.js';
import { RouletteController } from './infrastructure/http/roulette.controller.js';
import { TableGateway } from './infrastructure/ws/table.gateway.js';

@Module({
  imports: [AuthModule],
  controllers: [RouletteController],
  providers: [TableService, TableGateway, { provide: RoundRepository, useClass: DrizzleRoundRepository }],
})
export class RouletteModule {}
