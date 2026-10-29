import { Body, Controller, Get, Put } from '@nestjs/common';
import { betsSchema, type BetsDto, type RoundDto, type WalletDto } from '@casino/shared';
import { PlayerId } from '../../../common/infrastructure/http/player.js';
import { ZodValidationPipe } from '../../../common/infrastructure/http/zod-validation.pipe.js';
import { TableService } from '../../application/table.service.js';

@Controller('roulette')
export class RouletteController {
  constructor(private readonly table: TableService) {}

  // Derniers numéros sortis à la table (le tableau d'affichage au-dessus du tapis).
  @Get('history')
  history(): Promise<number[]> {
    return this.table.lastResults();
  }

  // Le tour en cours (null le temps que le croupier ouvre la table) ; le navigateur le relit à chaque fin de phase.
  @Get('round')
  round(@PlayerId() playerId: string): Promise<RoundDto | null> {
    return this.table.current(playerId);
  }

  // Les mises du joueur sur le tour en cours, tant que les jeux ne sont pas faits.
  @Put('bets')
  async bets(@PlayerId() playerId: string, @Body(new ZodValidationPipe(betsSchema)) dto: BetsDto): Promise<WalletDto> {
    return { balance: await this.table.placeBets(playerId, dto) };
  }
}
