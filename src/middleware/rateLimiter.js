const rateLimit = require('express-rate-limit');

const eventIngestLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '600'),
  message: { error: 'Too many requests, slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { eventIngestLimiter };
