import { Body, Controller, Delete, HttpCode, Param, Post, Put } from '@nestjs/common';
import { blackjackBetSchema, blackjackMoveSchema, blackjackSeatSchema, type BlackjackBetDto, type BlackjackMoveDto, type UserDto, type WalletDto } from '@casino/shared';
import { CurrentUser, PlayerId } from '../../../common/infrastructure/http/player.js';
import { ZodValidationPipe } from '../../../common/infrastructure/http/zod-validation.pipe.js';
import { BlackjackTableService } from '../../application/blackjack-table.service.js';

// La table elle-même arrive par WebSocket (/ws/blackjack) ; ici, ce que le joueur y fait.
@Controller('blackjack')
export class BlackjackController {
  constructor(private readonly table: BlackjackTableService) {}

  // S'asseoir à une case libre.
  @Put('seats/:seat')
  @HttpCode(204)
  sit(@CurrentUser() user: UserDto, @Param('seat', new ZodValidationPipe(blackjackSeatSchema)) seat: number): Promise<void> {
    return this.table.sit(user, seat);
  }

  // Se lever (sa mise du tour rendue) : le solde, s'il a changé.
  @Delete('seats/:seat')
  async stand(@PlayerId() playerId: string, @Param('seat', new ZodValidationPipe(blackjackSeatSchema)) seat: number): Promise<{ balance: number | null }> {
    return { balance: await this.table.stand(playerId, seat) };
  }

  // La mise du joueur sur l'une de ses cases, tant que les cartes ne sont pas données.
  @Put('bet')
  async bet(@PlayerId() playerId: string, @Body(new ZodValidationPipe(blackjackBetSchema)) dto: BlackjackBetDto): Promise<WalletDto> {
    return { balance: await this.table.placeBet(playerId, dto) };
  }

  // Tirer, rester, doubler, séparer, quand sa main a la parole.
  @Post('move')
  @HttpCode(204)
  move(@PlayerId() playerId: string, @Body(new ZodValidationPipe(blackjackMoveSchema)) dto: BlackjackMoveDto): Promise<void> {
    return this.table.move(playerId, dto);
  }
}
