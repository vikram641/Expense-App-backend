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

// ── Get budgets for the last two months ───────────────────────────────────────
exports.getLastTwoMonthsBudgets = async (req, res, next) => {
  try {
    const now = new Date();
    const months = [];
    for (let i = 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      months.push(`${d.getFullYear()}-${mm}`);
    }

    const budgetsByMonth = await Promise.all(months.map(async (month) => {
      const monthBudgets = await Budget.find({ user: req.user._id, month })
        .populate('category', 'categoryId name color icon');

      return Promise.all(monthBudgets.map(async (b) => {
        const from = `${month}-01`;
        const to   = `${month}-31`;
        const agg  = await Expense.aggregate([
          { $match: { user: req.user._id, category: b.category._id, date: { $gte: from, $lte: to } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        return {
          id:            b.budgetId,
          categoryId:    b.category.categoryId,
          categoryName:  b.category.name,
          categoryColor: b.category.color,
          limitAmount:   b.limitAmount,
          spentAmount:   agg[0]?.total || 0,
          month:         b.month,
          currency:      b.currency
        };
      }));
    }));

    sendSuccess(res, {
      months,
      budgets: budgetsByMonth.flat()
    });
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

// ── Sync local (Room) budgets ─────────────────────────────────────────────────
// Room's primary key is (categoryId, month), which already matches the server's
// unique (user, category, month) index — so we upsert directly on that composite
// key, no extra clientId field needed. spentAmount is ignored: it's always derived
// live from the Expense collection (see getBudgets), never stored.
exports.syncBudgets = async (req, res, next) => {
  try {
    const { budgets } = req.body;

    if (!Array.isArray(budgets) || budgets.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'budgets must be a non-empty array', 400, 'budgets');
    }

    const results = [];

    for (const item of budgets) {
      const clientId = item?.id || null;

      try {
        if (!item.month) {
          results.push({ clientId, categoryId: item?.categoryId || null, status: 'error', message: 'Missing month' });
          continue;
        }

        const limitAmount = Number(item.limitAmount);
        if (!Number.isFinite(limitAmount) || limitAmount < 0) {
          results.push({ clientId, categoryId: item?.categoryId || null, status: 'error', message: 'Invalid limitAmount' });
          continue;
        }

        // Resolve the flattened local category, falling back to auto-creating
        // a custom category for this user if it doesn't exist on the server yet.
        let category = await resolveCategory(item.categoryId) || await resolveCategory(item.categoryName);
        if (!category) {
          category = await Category.create({
            name:      item.categoryName || 'Other',
            color:     item.categoryColor || '#607D8B',
            icon:      item.categoryIcon || 'ic_other',
            isDefault: false,
            user:      req.user._id
          });
        }

        const budget = await Budget.findOneAndUpdate(
          { user: req.user._id, category: category._id, month: item.month },
          { limitAmount, currency: item.currency || req.user.currency || 'INR' },
          { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
        );

        results.push({
          clientId,
          categoryId: category.categoryId,
          status:     'synced',
          serverId:   budget.budgetId,
          month:      budget.month,
          updatedAt:  budget.updatedAt
        });
      } catch (itemErr) {
        results.push({ clientId, categoryId: item?.categoryId || null, status: 'error', message: itemErr.message });
      }
    }

    const synced = results.filter(r => r.status === 'synced').length;

    sendSuccess(res, {
      total:  results.length,
      synced,
      failed: results.length - synced,
      results
    });
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
