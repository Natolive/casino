import type { HandDto } from '@casino/shared';
import { boolean, index, integer, jsonb, pgTable, primaryKey, serial, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { players } from '../../wallet/infrastructure/player.table.js';

// Chaque tour de blackjack. `dealt` : mises fermées, cartes données ; `seed` (ordre du sabot et sel) n'est révélée qu'au
// règlement, son sha256 (`hash`) l'est dès l'ouverture.
export const blackjackRounds = pgTable('blackjack_rounds', {
  id: serial().primaryKey(),
  hash: text().notNull(),
  seed: text(),
  dealt: boolean().notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Une case jouée sur un tour, par son joueur : `staked`, tout ce qu'il a mis (mise, doubles, séparations), débité au fil du jeu ;
// ses mains et ce que la table lui a rendu, au règlement.
export const blackjackBets = pgTable(
  'blackjack_bets',
  {
    roundId: integer('round_id')
      .notNull()
      .references(() => blackjackRounds.id, { onDelete: 'cascade' }),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    seat: smallint().notNull(),
    staked: integer().notNull(),
    hands: jsonb().$type<HandDto[]>(),
    won: integer(),
  },
  (t) => [primaryKey({ columns: [t.roundId, t.seat] }), index().on(t.playerId)],
);
