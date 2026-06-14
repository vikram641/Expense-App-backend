const Budget  = require('../models/budget.model');
const Expense = require('../models/expense.model');
const { sendSuccess, sendError } = require('../utils/response');

// Helper: resolve a category by custom categoryId or ObjectId
const Category = require('../models/category.model');
async function resolveCategory(id) {
  if (!id) return null;
  const isObjectId = /^[a-f\d]{24}$/i.test(id);
  if (isObjectId) return Category.findById(id);
  return Category.findOne({ categoryId: id });
}

// ── Get budgets for a month ───────────────────────────────────────────────────
exports.getBudgets = async (req, res, next) => {
  try {
    const { month } = req.query; // format: YYYY-MM
    if (!month) return sendError(res, 'VALIDATION_ERROR', 'month query param required (YYYY-MM)', 400);

    const budgets = await Budget.find({ user: req.user._id, month })
      .populate('category', 'categoryId name color icon');

    const budgetsWithSpent = await Promise.all(budgets.map(async (b) => {
      const from = `${month}-01`;
      const to   = `${month}-31`;
      const agg  = await Expense.aggregate([
        { $match: { user: req.user._id, category: b.category._id, date: { $gte: from, $lte: to } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const spent = agg[0]?.total || 0;
      return {
        id:            b.budgetId,
        categoryId:    b.category.categoryId,
        categoryName:  b.category.name,
        categoryColor: b.category.color,
        limitAmount:   b.limitAmount,
        spentAmount:   spent,
        month:         b.month,
        currency:      b.currency
    
      };
    }));

    sendSuccess(res, budgetsWithSpent);
  } catch (err) { next(err); }
};

// ── Set / upsert budget ───────────────────────────────────────────────────────
exports.setBudget = async (req, res, next) => {
  try {
    const { categoryId, limitAmount, month, currency } = req.body;

    const cat = await resolveCategory(categoryId);
    if (!cat) return sendError(res, 'NOT_FOUND', 'Category not found', 404);

    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, category: cat._id, month },
      { limitAmount, currency: currency || req.user.currency || 'INR' },
      { upsert: true, new: true }
    );

    sendSuccess(res, {
      id:          budget.budgetId,
      categoryId:  cat.categoryId,
      limitAmount: budget.limitAmount,
      month:       budget.month
    }, 201);
  } catch (err) { next(err); }
};

// ── Delete budget ─────────────────────────────────────────────────────────────
exports.deleteBudget = async (req, res, next) => {
  try {
    const isObjectId = /^[a-f\d]{24}$/i.test(req.params.id);
    const query = isObjectId
      ? { _id: req.params.id, user: req.user._id }
      : { budgetId: req.params.id, user: req.user._id };

    const budget = await Budget.findOneAndDelete(query);
    if (!budget) return sendError(res, 'NOT_FOUND', 'Budget not found', 404);
    sendSuccess(res, { message: 'Budget deleted' });
  } catch (err) { next(err); }
};
