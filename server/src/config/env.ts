import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Helper to find .env file
function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      return;
    }
  }
  dotenv.config();
}
loadEnv();

// Helper to reliably find SQLite database file in both dev and production
function resolveSqlitePath(): string {
  if (process.env.SQLITE_PATH) {
    const customPath = path.isAbsolute(process.env.SQLITE_PATH)
      ? process.env.SQLITE_PATH
      : path.resolve(process.cwd(), process.env.SQLITE_PATH);
    if (fs.existsSync(customPath)) {
      return customPath;
    }
  }

  const candidates = [
    path.resolve(__dirname, '../../db/mplads.sqlite'),
    path.resolve(__dirname, '../../../db/mplads.sqlite'),
    path.resolve(process.cwd(), 'server/db/mplads.sqlite'),
    path.resolve(process.cwd(), 'db/mplads.sqlite')
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  // Fallback default (in server/db)
  return path.resolve(process.cwd(), 'server/db/mplads.sqlite');
}

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_TYPE: (process.env.DB_TYPE || (process.env.DATABASE_URL ? 'postgres' : 'sqlite')).toLowerCase() as 'sqlite' | 'postgres',
  
  // SQLite
  SQLITE_PATH: resolveSqlitePath(),

  // PostgreSQL
  DATABASE_URL: process.env.DATABASE_URL,
  PGHOST: process.env.PGHOST || 'localhost',
  PGPORT: parseInt(process.env.PGPORT || '5432', 10),
  PGDATABASE: process.env.PGDATABASE || 'mplads_db',
  PGUSER: process.env.PGUSER || 'postgres',
  PGPASSWORD: process.env.PGPASSWORD || '',
  PGSSL: process.env.PGSSL === 'true',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};
