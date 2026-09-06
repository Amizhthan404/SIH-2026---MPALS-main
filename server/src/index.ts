import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { env } from './config/env.js';
import { getDb } from './config/db.js';
import apiRouter from './routes/index.js';

const app = express();

// CORS setup
const corsOptions = env.CORS_ORIGIN === '*'
  ? { origin: '*' }
  : { origin: env.CORS_ORIGIN.split(',').map(o => o.trim()) };

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (env.NODE_ENV === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Mount REST API
app.use('/api', apiRouter);

// Dynamic frontend static files resolver
function resolveFrontendPath(): string {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '../'),
    path.resolve(__dirname, '../../'),
    path.resolve(__dirname, '../../../')
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'index.html'))) {
      return c;
    }
  }
  return path.resolve(process.cwd());
}

const frontendPath = resolveFrontendPath();
if (fs.existsSync(path.join(frontendPath, 'index.html'))) {
  console.log(` Serving frontend from: ${frontendPath}`);
  app.use(express.static(frontendPath));

  // SPA Fallback for client routes
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  console.warn(`⚠️ index.html not found in frontend candidates. API-only mode.`);
}

// Global error handling middleware (sanitized for production)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const isDev = env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    success: false,
    error: isDev ? (err.message || 'Internal Server Error') : 'An unexpected error occurred while processing your request.',
    ...(isDev ? { stack: err.stack } : {})
  });
});

// Start server
async function start() {
  try {
    const db = await getDb();
    console.log(` Database initialized (${db.type.toUpperCase()})`);

    const server = app.listen(env.PORT, () => {
      console.log('====================================================');
      console.log(` MPALS — MPLADS Anomaly & Lifecycle Surveillance`);
      console.log(` Prototype for SIH 2026 (Problem Statement 26102)`);
      console.log(` Server URL : http://localhost:${env.PORT}`);
      console.log(` API URL    : http://localhost:${env.PORT}/api`);
      console.log(` Database   : ${db.type.toUpperCase()}`);
      console.log('====================================================');
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n🛑 Gracefully shutting down server...');
      server.close(async () => {
        await db.close();
        console.log(' Server and database connections closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err: any) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
