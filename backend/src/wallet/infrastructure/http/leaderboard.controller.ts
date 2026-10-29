import { Controller, Get } from '@nestjs/common';
import type { LeaderboardDto } from '@casino/shared';
import { PlayerId } from '../../../common/infrastructure/http/player.js';
import { GetLeaderboardService } from '../../application/get-leaderboard.service.js';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly getLeaderboardService: GetLeaderboardService) {}

  @Get()
  find(@PlayerId() playerId: string): Promise<LeaderboardDto> {
    return this.getLeaderboardService.execute(playerId);
  }
}
