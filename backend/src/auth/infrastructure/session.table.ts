import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { players } from '../../wallet/infrastructure/player.table.js';

// Une connexion (cookie `session`). On ne garde que le sha256 du jeton : une fuite de la base n'ouvre aucune session.
export const sessions = pgTable('sessions', {
  id: text().primaryKey(),
  playerId: uuid('player_id')
    .notNull()
    .references(() => players.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
