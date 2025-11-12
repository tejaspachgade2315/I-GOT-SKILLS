const express = require('express');
const router = express.Router();
const analyticsCtrl = require('../controllers/analyticsController');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const { eventIngestLimiter } = require('../middleware/rateLimiter');

router.post('/collect', apiKeyAuth, eventIngestLimiter, analyticsCtrl.collectEvent);
router.get('/event-summary', analyticsCtrl.eventSummary);
router.get('/user-stats', analyticsCtrl.userStats);

module.exports = router;
