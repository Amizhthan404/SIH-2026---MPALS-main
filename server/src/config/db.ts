import { env } from './env.js';
import pg from 'pg';
import path from 'path';
import fs from 'fs';

export interface DatabaseAdapter {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
  type: 'postgres' | 'sqlite';
}

let dbInstance: DatabaseAdapter | null = null;

export async function getDb(): Promise<DatabaseAdapter> {
  if (dbInstance) return dbInstance;

  if (env.DB_TYPE === 'postgres') {
    const { Pool } = pg;
    const poolConfig: pg.PoolConfig = env.DATABASE_URL
      ? { connectionString: env.DATABASE_URL }
      : {
          host: env.PGHOST,
          port: env.PGPORT,
          database: env.PGDATABASE,
          user: env.PGUSER,
          password: env.PGPASSWORD,
          ssl: env.PGSSL ? { rejectUnauthorized: false } : undefined,
        };

    const pool = new Pool(poolConfig);

    // Test connection
    try {
      const client = await pool.connect();
      client.release();
      console.log(' Connected to PostgreSQL database');
    } catch (err: any) {
      console.warn('⚠️ Failed to connect to PostgreSQL, falling back to SQLite:', err.message);
      return initSqlite();
    }

    dbInstance = {
      type: 'postgres',
      async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
        const res = await pool.query(sql, params);
        return res.rows as T[];
      },
      async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
        const res = await pool.query(sql, params);
        return (res.rows[0] as T) || null;
      },
      async exec(sql: string): Promise<void> {
        await pool.query(sql);
      },
      async close(): Promise<void> {
        await pool.end();
      }
    };
    return dbInstance;
  }

  return initSqlite();
}

function initSqlite(): DatabaseAdapter {
  // Dynamically require node:sqlite
  const { DatabaseSync } = require('node:sqlite');
  
  const sqliteFile = path.resolve(process.cwd(), env.SQLITE_PATH);
  const dir = path.dirname(sqliteFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(sqliteFile);
  // Enable foreign keys and WAL mode for better concurrency
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  console.log(` Connected to SQLite database: ${sqliteFile}`);

  dbInstance = {
    type: 'sqlite',
    async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      // Normalize Postgres-style $1, $2, $3 to ? for SQLite
      const sqliteSql = sql.replace(/\$\d+/g, '?');
      const stmt = db.prepare(sqliteSql);
      const rows = stmt.all(...params);
      return rows as T[];
    },
    async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
      const sqliteSql = sql.replace(/\$\d+/g, '?');
      const stmt = db.prepare(sqliteSql);
      const row = stmt.get(...params);
      return (row as T) || null;
    },
    async exec(sql: string): Promise<void> {
      // Strip out PostgreSQL specific constructs if needed for SQLite execution
      let cleanedSql = sql
        .replace(/TIMESTAMP WITH TIME ZONE/gi, 'TIMESTAMP')
        .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
      db.exec(cleanedSql);
    },
    async close(): Promise<void> {
      db.close();
    }
  };

  return dbInstance;
}
