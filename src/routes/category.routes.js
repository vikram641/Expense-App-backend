const router  = require('express').Router();
const ctrl    = require('../controllers/category.controller');
const protect = require('../middleware/auth.middleware');

router.use(protect);

router.get('/',       ctrl.getCategories);
router.post('/',      ctrl.createCategory);
router.delete('/:id', ctrl.deleteCategory);

module.exports = router;
