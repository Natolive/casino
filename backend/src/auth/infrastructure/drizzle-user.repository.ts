import { Inject, Injectable } from '@nestjs/common';
import type { AdminUserDto, UpdateUserDto, UserDto } from '@casino/shared';
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import { DB, type Database } from '../../common/infrastructure/database/database.module.js';
import { players } from '../../wallet/infrastructure/player.table.js';
import { UserRepository, type NewUser } from '../domain/user.repository.js';
import { sessions } from './session.table.js';

const USER = { id: players.id, email: players.email, firstName: players.firstName, lastName: players.lastName, role: players.role };
const ADMIN_USER = { ...USER, balance: players.balance, createdAt: players.createdAt };
const toDto = ({ createdAt, ...user }: { createdAt: Date } & Omit<AdminUserDto, 'createdAt'>): AdminUserDto => ({
  ...user,
  createdAt: createdAt.toISOString(),
});

@Injectable()
export class DrizzleUserRepository implements UserRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async create(user: NewUser): Promise<UserDto | 'taken'> {
    // ponytail: deux toutes premières inscriptions simultanées pourraient être admins toutes les deux ; sans conséquence.
    const [created] = await this.db
      .insert(players)
      .values({
        ...user,
        role: sql`case when exists (select 1 from ${players}) then 'player' else 'admin' end`,
      })
      .onConflictDoNothing({ target: players.email })
      .returning(USER);
    return created ?? 'taken';
  }

  async credentialsOf(email: string) {
    const [user] = await this.db.select({ ...USER, passwordHash: players.passwordHash }).from(players).where(eq(players.email, email));
    return user ?? null;
  }

  async openSession(sessionId: string, playerId: string): Promise<void> {
    await this.db.insert(sessions).values({ id: sessionId, playerId });
  }

  async userOfSession(sessionId: string, maxAgeMs: number): Promise<UserDto | null> {
    const [user] = await this.db
      .select(USER)
      .from(sessions)
      .innerJoin(players, eq(players.id, sessions.playerId))
      .where(and(eq(sessions.id, sessionId), gt(sessions.createdAt, new Date(Date.now() - maxAgeMs))));
    return user ?? null;
  }

  async closeSession(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  async list(): Promise<AdminUserDto[]> {
    return (await this.db.select(ADMIN_USER).from(players).orderBy(asc(players.createdAt))).map(toDto);
  }

  async update(id: string, changes: UpdateUserDto): Promise<AdminUserDto | null> {
    const [user] = await this.db.update(players).set(changes).where(eq(players.id, id)).returning(ADMIN_USER);
    return user ? toDto(user) : null;
  }
}
