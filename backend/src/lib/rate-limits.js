import { rateLimit } from 'express-rate-limit';

function handler(code, message) {
  return (_req, res) => {
    res.status(429).json({
      success: false,
      data: null,
      error: { code, message },
      meta: { timestamp: new Date().toISOString() }
    });
  };
}

export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: handler('RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again shortly.')
});

export const mutationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method),
  handler: handler(
    'MUTATION_RATE_LIMIT_EXCEEDED',
    'Too many changes were submitted. Please wait before trying again.'
  )
});

let mutationTail = Promise.resolve();

export function serializeMutations(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const previous = mutationTail;
  let release;
  mutationTail = new Promise((resolve) => {
    release = resolve;
  });

  previous.then(() => {
    let released = false;
    const finish = () => {
      if (released) {
        return;
      }
      released = true;
      res.off('finish', finish);
      res.off('close', finish);
      release();
    };

    res.once('finish', finish);
    res.once('close', finish);
    next();
  }, next);
}
