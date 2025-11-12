const App = require('../models/App');
const { generateApiKey } = require('../utils/apiKey');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function register(req, res, next) {
  try {
    const { name, ownerEmail, googleIdToken, expiresInDays } = req.body;

    let googleSub;
    if (googleIdToken) {
      const ticket = await client.verifyIdToken({
        idToken: googleIdToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      const payload = ticket.getPayload();
      googleSub = payload.sub;
    }

    const apiKey = generateApiKey();
    const expiresAt = expiresInDays ? new Date(Date.now() + (expiresInDays * 24 * 3600 * 1000)) : null;

    const app = await App.create({ name, ownerEmail, apiKey, expiresAt, googleId: googleSub });
    res.status(201).json({ id: app._id, apiKey: app.apiKey, name: app.name, expiresAt: app.expiresAt });
  } catch (err) {
    next(err);
  }
}

async function getApiKey(req, res, next) {
  try {
    const { appId, ownerEmail } = req.query;
    if (!appId && !ownerEmail) return res.status(400).json({ error: 'appId or ownerEmail required' });

    const query = appId ? { _id: appId } : { ownerEmail };
    const app = await App.findOne(query);
    if (!app) return res.status(404).json({ error: 'App not found' });

    res.json({ apiKey: app.apiKey, revoked: app.revoked, expiresAt: app.expiresAt });
  } catch (err) { next(err); }
}

async function revokeApiKey(req, res, next) {
  try {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'apiKey required' });

    const app = await App.findOneAndUpdate({ apiKey }, { revoked: true }, { new: true });
    if (!app) return res.status(404).json({ error: 'API key not found' });

    res.json({ message: 'API key revoked' });
  } catch (err) { next(err); }
}

async function regenerateApiKey(req, res, next) {
  try {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'apiKey required' });

    const newKey = generateApiKey();
    const app = await App.findOneAndUpdate({ apiKey }, { apiKey: newKey, revoked: false }, { new: true });
    if (!app) return res.status(404).json({ error: 'API key not found' });

    res.json({ apiKey: app.apiKey });
  } catch (err) { next(err); }
}

module.exports = { register, getApiKey, revokeApiKey, regenerateApiKey };
