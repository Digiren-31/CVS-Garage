import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createCampusRouter } from './modules/campus/campus.routes.js';
import { newId } from './modules/campus/core.js';

export function createApp(db, { demo = false } = {}) {
  if (demo && process.env.NODE_ENV === 'production') throw new Error('Demo mode is not permitted in production.');
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { 'style-src': ["'self'", "'unsafe-inline'"], 'img-src': ["'self'", 'data:', 'https:'] } } }));
  app.use(express.json({ limit: '64kb' }));
  app.use((req, res, next) => {
    req.requestId = newId(); res.set('X-Request-ID', req.requestId);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      const configured = process.env.PUBLIC_ORIGIN;
      const expected = configured || `${req.protocol}://${req.get('host')}`;
      const localOrigin = demo && ['http://127.0.0.1:5173', 'http://localhost:5173', 'http://127.0.0.1:4000'].includes(origin);
      if (req.get('x-cvs-request') !== '1' || !req.is('application/json') || (origin && origin !== expected && !localOrigin) || req.get('sec-fetch-site') === 'cross-site') {
        return res.status(403).json({ success: false, error: { code: 'INVALID_ORIGIN', message: 'This request must come from the campus application.' } });
      }
    }
    next();
  });
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests. Please try again in a moment.' } }) }));
  app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'cvs-garage', demo }));
  app.use('/api/v1/campus', createCampusRouter(db, { demo }));
  app.use('/api', (_req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'This API endpoint does not exist.' } }));
  app.use((error, req, res, _next) => {
    const status = error.status ?? (error.type === 'entity.too.large' ? 413 : 500);
    if (status >= 500) console.error(`[${req.requestId}] ${error.name}: ${error.message}`);
    res.status(status).json({ success: false, error: { code: error.code ?? 'SERVER_ERROR', message: status >= 500 ? 'The server could not complete this request. Please try again.' : error.message }, requestId: req.requestId });
  });
  return app;
}
