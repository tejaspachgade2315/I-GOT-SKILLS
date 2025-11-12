const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  appId: { type: mongoose.Types.ObjectId, ref: 'App', index: true },
  apiKey: { type: String, index: true },
  event: { type: String, index: true },
  url: String,
  referrer: String,
  device: String,
  ipAddress: String,
  timestamp: { type: Date, default: Date.now, index: true },
  userId: { type: String, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

EventSchema.index({ event: 1, timestamp: -1 });
EventSchema.index({ appId: 1, event: 1, timestamp: -1 });

module.exports = mongoose.model('Event', EventSchema);
