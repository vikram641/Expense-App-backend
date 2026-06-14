const Expense = require('../models/expense.model');
const Budget  = require('../models/budget.model');
const { sendSuccess, sendError } = require('../utils/response');

// ── Monthly summary ───────────────────────────────────────────────────────────
exports.getSummary = async (req, res, next) => {
  try {
    const { month } = req.query;
    if (!month) return sendError(res, 'VALIDATION_ERROR', 'month query param required (YYYY-MM)', 400);

    const from = `${month}-01`;
    const to   = `${month}-31`;

    // Total spent this month
    const totalAgg = await Expense.aggregate([
      { $match: { user: req.user._id, date: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalSpent = totalAgg[0]?.total || 0;

    // Total budget this month
    const budgets = await Budget.find({ user: req.user._id, month });
    const totalBudget = budgets.reduce((s, b) => s + b.limitAmount, 0);

    // By category
    const byCategory = await Expense.aggregate([
      { $match: { user: req.user._id, date: { $gte: from, $lte: to } } },
      { $group: { _id: '$category', amount: { $sum: '$amount' } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
      { $unwind: '$cat' },
      { $project: { categoryId: '$_id', categoryName: '$cat.name', categoryColor: '$cat.color', amount: 1, _id: 0 } },
      { $sort: { amount: -1 } }
    ]);

    // Add percentage
    const byCategoryWithPct = byCategory.map(c => ({
      ...c,
      percentage: totalSpent > 0 ? Math.round((c.amount / totalSpent) * 100) : 0
    }));

    // By month (last 6 months)
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      months.push(`${d.getFullYear()}-${mm}`);
    }

    const byMonth = await Promise.all(months.map(async (m) => {
      const agg = await Expense.aggregate([
        { $match: { user: req.user._id, date: { $gte: `${m}-01`, $lte: `${m}-31` } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      return { month: m, amount: agg[0]?.total || 0 };
    }));

    sendSuccess(res, {
      totalSpent,
      totalBudget,
      currency:   req.user.currency || 'INR',
      byCategory: byCategoryWithPct,
      byMonth
    });
  } catch (err) { next(err); }
};

// ── Weekly summary ─────────────────────────────────────────────────────────────
// exports.getWeeklySummary = async (req, res, next) => {
//   try {
//     const today = new Date();
//     const dayOfWeek = today.getDay();
//     const startOfWeek = new Date(today);
//     startOfWeek.setDate(today.getDate() - dayOfWeek);

//     const from = startOfWeek.toISOString().split('T')[0];
//     const to   = today.toISOString().split('T')[0];

//     const agg = await Expense.aggregate([
//       { $match: { user: req.user._id, date: { $gte: from, $lte: to } } },
//       { $group: { _id: null, total: { $sum: '$amount' } } }
//     ]);

//     sendSuccess(res, { from, to, totalSpent: agg[0]?.total || 0 });
//   } catch (err) { next(err); }
// };

exports.getWeeklySummary = async (
  req,
  res,
  next
) => {

  try {

    const today = new Date()

    // Start of week (Monday)
    const startOfWeek = new Date(today)

    const day =
      today.getDay() || 7

    startOfWeek.setDate(
      today.getDate() - day + 1
    )

    startOfWeek.setHours(
      0, 0, 0, 0
    )

    const endOfToday =
      new Date(today)

    endOfToday.setHours(
      23, 59, 59, 999
    )

    const agg =
      await Expense.aggregate([

        {
          $match: {

            user: req.user._id,

            date: {
              $gte: startOfWeek,
              $lte: endOfToday
            }
          }
        },

        {
          $group: {

            _id: null,

            totalSpent: {
              $sum: "$amount"
            }
          }
        }
      ])

    sendSuccess(res, {

      from: startOfWeek,
      to: endOfToday,

      totalSpent:
        agg[0]?.totalSpent || 0
    })

  } catch (err) {

    next(err)
  }
}
