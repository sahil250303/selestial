import { securityConfig } from './config.js';

let counter = 0;
function nextErrorId() {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  return `err_${Date.now().toString(36)}_${counter.toString(36)}`;
}

export function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function respondError(res, status, publicMessage, err, { logger = console } = {}) {
  const errorId = nextErrorId();
  logger.error(`[${errorId}] ${publicMessage}`, err);
  const body = { error: publicMessage, errorId };
  if (securityConfig.errors.exposeDetails && err) {
    body.detail = err.message;
  }
  return res.status(status).json(body);
}

export function notFoundHandler(req, res) {
  return res.status(404).json({ error: 'Not found' });
}

export function centralErrorHandler(logger = console) {
  return (err, req, res, _next) => {
    if (res.headersSent) {
      return _next(err);
    }
    const errorId = nextErrorId();
    logger.error(`[${errorId}] Unhandled error on ${req.method} ${req.originalUrl}`, err);
    const body = { error: 'Internal server error', errorId };
    if (securityConfig.errors.exposeDetails) {
      body.detail = err?.message || String(err);
    }
    return res.status(500).json(body);
  };
}
