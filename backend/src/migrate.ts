import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// Migrations au démarrage (`npm run db:migrate`), par drizzle-orm : mêmes fichiers (drizzle/) que drizzle-kit.
// Lancé par Node tel quel (types effacés).
const db = drizzle(process.env.DATABASE_URL!);
try {
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log('Migrations appliquées');
} finally {
  await db.$client.end();
}
