const Event = require('../models/Event');
const { safeGet, safeSet } = require('../utils/redisClient');
const mongoose = require('mongoose');

async function collectEvent(req, res, next) {
  try {
    const payload = req.body;
    const app = req.appRecord;

    if (!payload.event) return res.status(400).json({ error: 'event required' });

    const doc = {
      appId: app._id,
      apiKey: app.apiKey,
      event: payload.event,
      url: payload.url,
      referrer: payload.referrer,
      device: payload.device,
      ipAddress: payload.ipAddress || req.ip,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      userId: payload.userId,
      metadata: payload.metadata || {}
    };

    await Event.create(doc);
    return res.status(201).json({ message: 'event recorded' });
  } catch (err) { next(err); }
}

async function eventSummary(req, res, next) {
  try {
    const { event, startDate, endDate, app_id } = req.query;
    const cacheKey = `evsum:${event || 'all'}:${startDate || '0'}:${endDate || 'now'}:${app_id || 'all'}`;

    const cached = await safeGet(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const match = {};
    if (event) match.event = event;
    if (app_id && mongoose.Types.ObjectId.isValid(app_id)) match.appId = mongoose.Types.ObjectId(app_id);
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = new Date(startDate);
      if (endDate) match.timestamp.$lte = new Date(endDate);
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          byDevice: { $push: '$device' }
        }
      },
      {
        $project: {
          event: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          deviceCounts: {
            $arrayToObject: {
              $map: {
                input: { $setUnion: ['$byDevice', []] },
                as: 'd',
                in: { k: '$$d', v: { $size: { $filter: { input: '$byDevice', as: 'x', cond: { $eq: ['$$x', '$$d'] } } } } }
              }
            }
          }
        }
      }
    ];

    const results = await Event.aggregate(pipeline).allowDiskUse(true);
    const response = results.length === 0 ? { event, count: 0, uniqueUsers: 0, deviceData: {} }
      : results[0];

    await safeSet(cacheKey, JSON.stringify(response), { EX: 30 });
    res.json(response);
  } catch (err) { next(err); }
}

async function userStats(req, res, next) {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const cacheKey = `uStats:${userId}`;
    const cached = await safeGet(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const recentEvents = await Event.find({ userId }).sort({ timestamp: -1 }).limit(20).lean();
    const totalEvents = await Event.countDocuments({ userId });

    const deviceDetails = {};
    const ipSet = new Set();
    for (const e of recentEvents) {
      if (e.metadata && e.metadata.browser) deviceDetails.browser = e.metadata.browser;
      if (e.metadata && e.metadata.os) deviceDetails.os = e.metadata.os;
      if (e.ipAddress) ipSet.add(e.ipAddress);
    }

    const resObj = {
      userId,
      totalEvents,
      recentEvents,
      deviceDetails,
      ipAddress: ipSet.size ? Array.from(ipSet)[0] : null
    };

    await safeSet(cacheKey, JSON.stringify(resObj), { EX: 30 });
    res.json(resObj);
  } catch (err) { next(err); }
}

module.exports = { collectEvent, eventSummary, userStats };
