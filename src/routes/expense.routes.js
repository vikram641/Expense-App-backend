const router  = require('express').Router();
const ctrl    = require('../controllers/expense.controller');
const protect = require('../middleware/auth.middleware');

router.use(protect);

router.get('/',     ctrl.getExpenses);
router.post('/',    ctrl.createExpense);
router.get('/:id',  ctrl.getExpense);
router.put('/:id',  ctrl.updateExpense);
router.delete('/:id', ctrl.deleteExpense);

module.exports = router;
