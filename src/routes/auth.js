const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');

router.post('/register', authCtrl.register);
router.get('/api-key', authCtrl.getApiKey);
router.post('/revoke', authCtrl.revokeApiKey);
router.post('/regenerate', authCtrl.regenerateApiKey);

module.exports = router;
