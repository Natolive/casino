import { Controller, Get, Post } from '@nestjs/common';
import type { WalletDto } from '@casino/shared';
import { PlayerId } from '../../../common/infrastructure/http/player.js';
import { GetWalletService } from '../../application/get-wallet.service.js';
import { RefillWalletService } from '../../application/refill-wallet.service.js';

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly getWalletService: GetWalletService,
    private readonly refillWalletService: RefillWalletService,
  ) {}

  @Get()
  find(@PlayerId() playerId: string): Promise<WalletDto> {
    return this.getWalletService.execute(playerId);
  }

  @Post('refill')
  refill(@PlayerId() playerId: string): Promise<WalletDto> {
    return this.refillWalletService.execute(playerId);
  }
}
