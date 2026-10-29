import { Module } from '@nestjs/common';
import { TableService } from './application/table.service.js';
import { RoundRepository } from './domain/round.repository.js';
import { DrizzleRoundRepository } from './infrastructure/drizzle-round.repository.js';
import { RouletteController } from './infrastructure/http/roulette.controller.js';

@Module({
  controllers: [RouletteController],
  providers: [TableService, { provide: RoundRepository, useClass: DrizzleRoundRepository }],
})
export class RouletteModule {}
