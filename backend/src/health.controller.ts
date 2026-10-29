import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB, type Database } from './common/infrastructure/database/database.module.js';

// Vérifiée par la CI après chaque déploiement : erreur 500 si la base ne répond pas.
@Controller()
export class HealthController {
  constructor(@Inject(DB) private readonly db: Database) {}

  @Get('health')
  async health(): Promise<{ database: true }> {
    await this.db.execute(sql`select 1`);
    return { database: true };
  }
}
