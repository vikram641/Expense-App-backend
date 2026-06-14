const router  = require('express').Router();
const ctrl    = require('../controllers/currency.controller');
const protect = require('../middleware/auth.middleware');

router.use(protect);

router.get('/rates',       ctrl.getRates);
router.get('/currencies',  ctrl.getSupportedCurrencies);

module.exports = router;
