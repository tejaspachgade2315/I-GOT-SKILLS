const App = require('../models/App');

async function apiKeyAuth(req, res, next) {
  try {
    const apiKey = req.header('x-api-key') || req.query.api_key;
    if (!apiKey) return res.status(401).json({ error: 'API key missing' });

    const app = await App.findOne({ apiKey });
    if (!app || app.revoked) return res.status(403).json({ error: 'Invalid or revoked API key' });

    if (app.expiresAt && app.expiresAt < new Date()) {
      return res.status(403).json({ error: 'API key expired' });
    }

    req.appRecord = app;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = apiKeyAuth;
