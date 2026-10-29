import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { DB, type Database } from '../../common/infrastructure/database/database.module.js';
import { players } from '../../wallet/infrastructure/player.table.js';
import { BlackjackRoundRepository, type Settlement } from '../domain/blackjack-round.repository.js';
import { blackjackBets, blackjackRounds } from './blackjack.table.js';

@Injectable()
export class DrizzleBlackjackRoundRepository implements BlackjackRoundRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async open(hash: string): Promise<number> {
    const [round] = await this.db.insert(blackjackRounds).values({ hash }).returning({ id: blackjackRounds.id });
    return round!.id;
  }

  placeBet(roundId: number, playerId: string, seat: number, amount: number): Promise<number | 'closed' | 'funds'> {
    return this.db.transaction(async (tx) => {
      // Verrou partagé sur le tour : la fermeture des mises (UPDATE du tour) attend la fin de cette mise, ou la mise voit le
      // tour fermé.
      const [open] = await tx
        .select({ id: blackjackRounds.id })
        .from(blackjackRounds)
        .where(and(eq(blackjackRounds.id, roundId), eq(blackjackRounds.dealt, false)))
        .for('share');
      if (!open) return 'closed';
      // Verrou sur le joueur avant de lire sa mise : deux envois simultanés (deux onglets, deux cases) passent l'un après
      // l'autre.
      const [locked] = await tx.select({ id: players.id }).from(players).where(eq(players.id, playerId)).for('update');
      if (!locked) return 'funds';
      const [previous] = await tx
        .select({ staked: blackjackBets.staked, playerId: blackjackBets.playerId })
        .from(blackjackBets)
        .where(this.betOf(roundId, seat));
      // Case misée par un autre joueur ce tour-ci : on n'y touche pas.
      if (previous && previous.playerId !== playerId) return 'closed';
      const refund = previous?.staked ?? 0;
      // UPDATE conditionnel : le solde ne passe jamais sous zéro.
      const [player] = await tx
        .update(players)
        .set({ balance: sql`${players.balance} + ${refund} - ${amount}` })
        .where(and(eq(players.id, playerId), sql`${players.balance} + ${refund} >= ${amount}`))
        .returning({ balance: players.balance });
      if (!player) return 'funds';
      if (amount)
        await tx
          .insert(blackjackBets)
          .values({ roundId, playerId, seat, staked: amount })
          .onConflictDoUpdate({ target: [blackjackBets.roundId, blackjackBets.seat], set: { playerId, staked: amount } });
      else await tx.delete(blackjackBets).where(this.betOf(roundId, seat));
      return player.balance;
    });
  }

  close(roundId: number) {
    return this.db.transaction(async (tx) => {
      // Rejoué après une erreur réseau alors qu'il avait abouti : rend les mêmes mises.
      await tx.update(blackjackRounds).set({ dealt: true }).where(eq(blackjackRounds.id, roundId));
      return tx
        .select({ playerId: blackjackBets.playerId, seat: blackjackBets.seat, staked: blackjackBets.staked })
        .from(blackjackBets)
        .where(eq(blackjackBets.roundId, roundId));
    });
  }

  raise(roundId: number, seat: number, playerId: string, amount: number): Promise<number | 'funds'> {
    return this.db.transaction(async (tx) => {
      const [player] = await tx
        .update(players)
        .set({ balance: sql`${players.balance} - ${amount}` })
        .where(and(eq(players.id, playerId), sql`${players.balance} >= ${amount}`))
        .returning({ balance: players.balance });
      if (!player) return 'funds';
      await tx
        .update(blackjackBets)
        .set({ staked: sql`${blackjackBets.staked} + ${amount}` })
        .where(this.betOf(roundId, seat));
      return player.balance;
    });
  }

  settle(roundId: number, seed: string, settlements: Settlement[]): Promise<void> {
    return this.db.transaction(async (tx) => {
      // Déjà réglé (règlement rejoué après une erreur réseau alors qu'il avait abouti) : rien à repayer.
      const [open] = await tx
        .update(blackjackRounds)
        .set({ seed })
        .where(and(eq(blackjackRounds.id, roundId), isNull(blackjackRounds.seed)))
        .returning({ id: blackjackRounds.id });
      if (!open) return;
      // ponytail: deux requêtes par case, sept au plus autour de la table.
      for (const { playerId, seat, won, hands } of settlements) {
        await tx.update(blackjackBets).set({ won, hands }).where(this.betOf(roundId, seat));
        if (won) await tx.update(players).set({ balance: sql`${players.balance} + ${won}` }).where(eq(players.id, playerId));
      }
    });
  }

  refundOpen(): Promise<void> {
    return this.db.transaction(async (tx) => {
      const open = tx.select({ id: blackjackRounds.id }).from(blackjackRounds).where(isNull(blackjackRounds.seed));
      const placed = await tx.select().from(blackjackBets).where(inArray(blackjackBets.roundId, open));
      for (const { playerId, staked } of placed)
        await tx.update(players).set({ balance: sql`${players.balance} + ${staked}` }).where(eq(players.id, playerId));
      await tx.delete(blackjackRounds).where(isNull(blackjackRounds.seed));
    });
  }

  private betOf(roundId: number, seat: number) {
    return and(eq(blackjackBets.roundId, roundId), eq(blackjackBets.seat, seat));
  }
}
