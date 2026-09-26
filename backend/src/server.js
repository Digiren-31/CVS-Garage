/**
 * CVS Garage — Central Backend Server
 * Monolithic backend orchestrating domain service modules and integrations.
 */

import express from 'express';
import cors from 'cors';
import forumRouter from './modules/forum/forum.routes.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for services and local development
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'cvs-garage-central-backend',
    modules: ['forum', 'member-centre-adapter', 'project-adapter', 'event-adapter', 'idea-centre-adapter', 'leaderboard-adapter'],
    timestamp: new Date().toISOString()
  });
});

// Mount Forum Domain Module
app.use('/api/v1/forum', forumRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `The requested path ${req.originalUrl} was not found on this server.`
    }
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred.'
    }
  });
});

// Only listen if not imported by test runner
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 CVS Garage Central Backend running on http://localhost:${PORT}`);
    console.log(`📡 Forum API available at http://localhost:${PORT}/api/v1/forum`);
  });
}

export default app;
