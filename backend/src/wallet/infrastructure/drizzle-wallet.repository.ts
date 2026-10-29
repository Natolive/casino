import { Inject, Injectable } from '@nestjs/common';
import type { LeaderboardEntryDto } from '@casino/shared';
import { count, desc, eq, gt, sql } from 'drizzle-orm';
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

  async richest(limit: number, playerId: string): Promise<LeaderboardEntryDto[]> {
    // Prénom et initiale du nom : le classement est vu par tous les joueurs.
    return this.db
      .select({
        rank: sql<number>`rank() over (order by ${players.balance} desc)::int`,
        name: sql<string>`${players.firstName} || ' ' || left(${players.lastName}, 1) || '.'`,
        you: sql<boolean>`${players.id} = ${playerId}`,
        balance: players.balance,
      })
      .from(players)
      .orderBy(desc(players.balance), players.createdAt)
      .limit(limit);
  }

  async countRicherThan(balance: number): Promise<number> {
    const [row] = await this.db.select({ n: count() }).from(players).where(gt(players.balance, balance));
    return row!.n;
  }
}
