import { getDb } from '../../src/config/db.js';
import fs from 'fs';
import path from 'path';

async function migrate() {
  console.log('🔄 Running database migrations...');
  const db = await getDb();

  const migrationsDir = path.resolve(__dirname, './');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    console.log(` Executing migration: ${file}`);
    const sql = fs.readFileSync(filePath, 'utf-8');

    // If SQLite, execute statement by statement or using exec
    if (db.type === 'sqlite') {
      await db.exec(sql);
    } else {
      await db.exec(sql);
    }
  }

  console.log('✅ All migrations executed successfully.');
  await db.close();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
