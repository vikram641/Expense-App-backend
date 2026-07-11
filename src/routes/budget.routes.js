const router  = require('express').Router();
const ctrl    = require('../controllers/budget.controller');
const protect = require('../middleware/auth.middleware');

router.use(protect);

router.get('/',                ctrl.getBudgets);
router.post('/',               ctrl.setBudget);
router.post('/sync',           ctrl.syncBudgets);
router.get('/last-two-months', ctrl.getLastTwoMonthsBudgets);
router.delete('/:id',          ctrl.deleteBudget);

module.exports = router;
