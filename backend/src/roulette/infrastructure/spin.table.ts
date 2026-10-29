import type { PlacedBet } from '@casino/shared';
import { index, integer, jsonb, pgTable, primaryKey, serial, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { players } from '../../wallet/infrastructure/player.table.js';

// Chaque tour de la table, commun à tous les joueurs. `result` et `seed` restent vides tant que les jeux ne sont pas faits.
export const rounds = pgTable('roulette_rounds', {
  id: serial().primaryKey(),
  result: smallint(),
  // Engagement publié dès l'ouverture : sha256 de `seed` (« numéro:sel »), révélée au tirage.
  hash: text().notNull(),
  seed: text(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Les mises d'un joueur sur un tour, débitées dès qu'elles sont posées ; `won` est rempli au tirage.
export const roundBets = pgTable(
  'roulette_bets',
  {
    roundId: integer('round_id')
      .notNull()
      .references(() => rounds.id, { onDelete: 'cascade' }),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    bets: jsonb().$type<PlacedBet[]>().notNull(),
    staked: integer().notNull(),
    won: integer(),
  },
  (t) => [primaryKey({ columns: [t.roundId, t.playerId] }), index().on(t.playerId)],
);
