import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DB, type Database } from '../../common/infrastructure/database/database.module.js';
import { WalletRepository } from '../domain/wallet.repository.js';
import { players } from './player.table.js';

@Injectable()
export class DrizzleWalletRepository implements WalletRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async balanceOf(playerId: string): Promise<number> {
    const [player] = await this.db.select({ balance: players.balance }).from(players).where(eq(players.id, playerId));
    return player!.balance;
  }

  async topUp(playerId: string, floor: number): Promise<number> {
    const [player] = await this.db
      .update(players)
      .set({ balance: sql`greatest(${players.balance}, ${floor})` })
      .where(eq(players.id, playerId))
      .returning({ balance: players.balance });
    return player!.balance;
  }
}
