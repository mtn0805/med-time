import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import mongoose from 'mongoose';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config/env.js';
import { createRouter } from './routes/index.js';
import { AppError } from './services/errors.js';
import { errorHandler } from './middleware/errors.js';
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:'],
        },
      },
    }),
  );
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      limit: config.NODE_ENV === 'test' ? 5000 : 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'יותר מדי בקשות. נסו שוב בעוד דקה.' } },
    }),
  );
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use('/api', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      if (origin && origin !== config.CLIENT_ORIGIN) {
        next(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'מקור הבקשה אינו מורשה'));
        return;
      }
      if (
        (Number(req.headers['content-length'] ?? 0) > 0 ||
          req.headers['transfer-encoding'] !== undefined) &&
        !req.is('application/json')
      ) {
        next(new AppError(415, 'JSON_REQUIRED', 'יש לשלוח נתוני JSON'));
        return;
      }
      if (req.get('sec-fetch-site') === 'cross-site') {
        next(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'מקור הבקשה אינו מורשה'));
        return;
      }
    }
    next();
  });
  app.get('/api/health', (_req, res) => {
    const ok = mongoose.connection.readyState === 1;
    res
      .status(ok ? 200 : 503)
      .json(
        ok
          ? { data: { status: 'ok' } }
          : { error: { code: 'DATABASE_UNAVAILABLE', message: 'מסד הנתונים אינו זמין' } },
      );
  });
  app.use('/api', createRouter());
  app.use('/api', (_req, _res, next) => next(new AppError(404, 'NOT_FOUND', 'הכתובת לא נמצאה')));
  const clientPath = fileURLToPath(new URL('../../client/dist', import.meta.url));
  if (existsSync(clientPath)) {
    app.use(express.static(clientPath));
    app.get('/{*path}', (_req, res) => res.sendFile(`${clientPath}/index.html`));
  }
  app.use(errorHandler);
  return app;
}
