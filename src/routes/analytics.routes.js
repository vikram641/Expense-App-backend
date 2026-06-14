const router  = require('express').Router();
const ctrl    = require('../controllers/analytics.controller');
const protect = require('../middleware/auth.middleware');

router.use(protect);

router.get('/summary', ctrl.getSummary);
router.get('/weekly',  ctrl.getWeeklySummary);

module.exports = router;
