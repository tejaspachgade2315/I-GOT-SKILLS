const mongoose = require('mongoose');

const AppSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ownerEmail: { type: String },
  apiKey: { type: String, required: true, unique: true, index: true },
  revoked: { type: Boolean, default: false },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  googleId: { type: String }
});

module.exports = mongoose.model('App', AppSchema);
