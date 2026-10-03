/**
 * CVS Garage — Central Backend Server
 * Monolithic backend orchestrating domain service modules and integrations.
 */

import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sendSuccess } from './lib/http.js';
import { getSupabaseConfig, getTrustProxy, isSupabaseEnabled } from './lib/config.js';
import { initializePersistentStores } from './lib/persistent-store.js';
import { requireActiveMember } from './lib/auth-middleware.js';
import { apiRateLimit, mutationRateLimit, serializeMutations } from './lib/rate-limits.js';
import authRouter from './modules/auth/auth.routes.js';
import dashboardRouter from './modules/dashboard/dashboard.routes.js';
import eventsRouter from './modules/events/events.routes.js';
import forumRouter from './modules/forum/forum.routes.js';
import { forumService } from './modules/forum/forum.service.js';
import ideaCentreRouter from './modules/idea-centre/idea.routes.js';
import leaderboardsRouter from './modules/leaderboards/leaderboard.routes.js';
import memberCentreRouter from './modules/member-centre/member.routes.js';
import mediaRouter from './modules/media/media.routes.js';
import { mediaService } from './modules/media/media.service.js';
import projectsRouter from './modules/projects/projects.routes.js';

const app = express();
const PORT = process.env.PORT || 4000;
const portalDist = fileURLToPath(new URL('../../apps/portal/dist', import.meta.url));

app.disable('x-powered-by');
app.set('trust proxy', getTrustProxy());

getSupabaseConfig();
await initializePersistentStores();
await forumService.reconcileContributions();
if (isSupabaseEnabled()) {
  await mediaService.cleanupExpiredUploads();
}

if (process.env.NODE_ENV !== 'production') {
  app.use(cors());
}
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'cvs-garage-central-backend',
    persistence: isSupabaseEnabled() ? 'supabase' : 'local-json',
    modules: ['dashboard', 'projects', 'events', 'member-centre', 'leaderboards', 'idea-centre', 'forum', 'media'],
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1', (req, res) => {
  return sendSuccess(res, {
    service: 'cvs-garage-central-backend',
    resources: {
      dashboard: '/api/v1/dashboard',
      projects: '/api/v1/projects',
      events: '/api/v1/events',
      members: '/api/v1/member-centre/members',
      leaderboards: '/api/v1/leaderboards',
      ideas: '/api/v1/idea-centre/ideas',
      forum: '/api/v1/forum/posts'
    }
  });
});

app.use('/api/v1', apiRateLimit, mutationRateLimit, serializeMutations);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/projects', requireActiveMember, projectsRouter);
app.use('/api/v1/events', requireActiveMember, eventsRouter);
app.use('/api/v1/member-centre', requireActiveMember, memberCentreRouter);
app.use('/api/v1/media', requireActiveMember, mediaRouter);
app.use('/api/v1/leaderboards', requireActiveMember, leaderboardsRouter);
app.use('/api/v1/idea-centre', requireActiveMember, ideaCentreRouter);
app.use('/api/v1/forum', requireActiveMember, forumRouter);

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested path ${req.originalUrl} was not found on this server.`
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

if (existsSync(portalDist)) {
  app.use(express.static(portalDist));
  app.get('*', (req, res) => {
    res.sendFile('index.html', { root: portalDist });
  });
}

// Central Error Handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      data: null,
      error: {
        code: 'INVALID_JSON',
        message: 'The request body must contain valid JSON.'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      data: null,
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'The request body exceeds the 1 MB limit.'
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  }
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred.'
          : err.message || 'An unexpected error occurred.'
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  });
});

// Only listen if not imported by test runner
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`CVS Garage is running on http://localhost:${PORT}`);
    console.log(`API base: http://localhost:${PORT}/api/v1`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; closing HTTP server.`);
    server.close((error) => {
      if (error) {
        console.error('HTTP server shutdown failed:', error);
        process.exitCode = 1;
      }
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

export default app;
