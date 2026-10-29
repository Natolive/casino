import { Inject, Injectable } from '@nestjs/common';
import { payout, type PlacedBet } from '@casino/shared';
import { and, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { DB, type Database } from '../../common/infrastructure/database/database.module.js';
import { players } from '../../wallet/infrastructure/player.table.js';
import { RoundRepository, type PlayerBets } from '../domain/round.repository.js';
import { roundBets, rounds } from './spin.table.js';

@Injectable()
export class DrizzleRoundRepository implements RoundRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async open(hash: string): Promise<number> {
    const [round] = await this.db.insert(rounds).values({ hash }).returning({ id: rounds.id });
    return round!.id;
  }

  placeBets(roundId: number, playerId: string, bets: PlacedBet[]): Promise<number | 'closed' | 'funds'> {
    return this.db.transaction(async (tx) => {
      // Verrou partagé sur le tour : le tirage (UPDATE du tour) attend la fin de cette mise, ou la mise voit le tour fermé.
      const [open] = await tx
        .select({ id: rounds.id })
        .from(rounds)
        .where(and(eq(rounds.id, roundId), isNull(rounds.result)))
        .for('share');
      if (!open) return 'closed';
      // Verrou sur le joueur avant de lire ses mises : deux envois simultanés (deux onglets) passent l'un après l'autre,
      // même quand il n'a encore rien misé sur ce tour (pas de ligne de mise à verrouiller).
      const [locked] = await tx.select({ id: players.id }).from(players).where(eq(players.id, playerId)).for('update');
      if (!locked) return 'funds';
      const [previous] = await tx
        .select({ staked: roundBets.staked })
        .from(roundBets)
        .where(and(eq(roundBets.roundId, roundId), eq(roundBets.playerId, playerId)));
      const refund = previous?.staked ?? 0;
      const staked = bets.reduce((sum, b) => sum + b.amount, 0);
      // UPDATE conditionnel : le solde ne passe jamais sous zéro.
      const [player] = await tx
        .update(players)
        .set({ balance: sql`${players.balance} + ${refund} - ${staked}` })
        .where(and(eq(players.id, playerId), sql`${players.balance} + ${refund} >= ${staked}`))
        .returning({ balance: players.balance });
      if (!player) return 'funds';
      if (bets.length)
        await tx
          .insert(roundBets)
          .values({ roundId, playerId, bets, staked })
          .onConflictDoUpdate({ target: [roundBets.roundId, roundBets.playerId], set: { bets, staked } });
      else await tx.delete(roundBets).where(and(eq(roundBets.roundId, roundId), eq(roundBets.playerId, playerId)));
      return player.balance;
    });
  }

  settle(roundId: number, result: number, seed: string): Promise<void> {
    return this.db.transaction(async (tx) => {
      // Déjà tiré (tirage rejoué après une erreur réseau alors qu'il avait abouti) : rien à repayer.
      const [open] = await tx
        .update(rounds)
        .set({ result, seed })
        .where(and(eq(rounds.id, roundId), isNull(rounds.result)))
        .returning({ id: rounds.id });
      if (!open) return;
      const placed = await tx.select().from(roundBets).where(eq(roundBets.roundId, roundId));
      // ponytail: deux requêtes par joueur ; une seule requête groupée si la table reçoit des centaines de joueurs.
      for (const { playerId, bets } of placed) {
        const won = payout(bets, result);
        await tx.update(roundBets).set({ won }).where(and(eq(roundBets.roundId, roundId), eq(roundBets.playerId, playerId)));
        if (won) await tx.update(players).set({ balance: sql`${players.balance} + ${won}` }).where(eq(players.id, playerId));
      }
    });
  }

  refundOpen(): Promise<void> {
    return this.db.transaction(async (tx) => {
      const open = tx.select({ id: rounds.id }).from(rounds).where(isNull(rounds.result));
      const placed = await tx.select().from(roundBets).where(inArray(roundBets.roundId, open));
      for (const { playerId, staked } of placed)
        await tx.update(players).set({ balance: sql`${players.balance} + ${staked}` }).where(eq(players.id, playerId));
      await tx.delete(rounds).where(isNull(rounds.result));
    });
  }

  async betsOf(roundId: number, playerId: string): Promise<PlacedBet[]> {
    const [row] = await this.db
      .select({ bets: roundBets.bets })
      .from(roundBets)
      .where(and(eq(roundBets.roundId, roundId), eq(roundBets.playerId, playerId)));
    return row?.bets ?? [];
  }

  betsAt(roundId: number): Promise<PlayerBets[]> {
    return this.db
      .select({ playerId: roundBets.playerId, name: players.firstName, bets: roundBets.bets, won: roundBets.won })
      .from(roundBets)
      .innerJoin(players, eq(players.id, roundBets.playerId))
      .where(eq(roundBets.roundId, roundId));
  }

  async lastResults(limit: number): Promise<number[]> {
    const rows = await this.db.select({ result: rounds.result }).from(rounds).where(isNotNull(rounds.result)).orderBy(desc(rounds.id)).limit(limit);
    return rows.map((r) => r.result!);
  }
}
