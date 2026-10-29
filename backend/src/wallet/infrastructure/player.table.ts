import type { Role } from '@casino/shared';
import { sql } from 'drizzle-orm';
import { check, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Un compte joueur et ses jetons fictifs ; jamais en négatif, même avec deux mises simultanées.
export const players = pgTable(
  'players',
  {
    id: uuid().primaryKey().defaultRandom(),
    // En minuscules (voir loginSchema).
    email: text().notNull().unique(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    // scrypt, « sel:hash » en hexadécimal.
    passwordHash: text('password_hash').notNull(),
    role: text().$type<Role>().notNull().default('player'),
    balance: integer().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('balance_not_negative', sql`${t.balance} >= 0`), check('role_known', sql`${t.role} in ('player', 'admin')`)],
);
