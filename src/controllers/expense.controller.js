const Expense  = require('../models/expense.model');
const Category = require('../models/category.model');
const Budget   = require('../models/budget.model');
const { sendSuccess, sendError } = require('../utils/response');

// // Helper: resolve a category by custom categoryId or ObjectId
// async function resolveCategory(id) {
//   if (!id) return null;
//   const isObjectId = /^[a-f\d]{24}$/i.test(id);
//   if (isObjectId) return Category.findById(id);
//   return Category.findOne({ categoryId: id });
// }

// Resolve category by ObjectId OR categoryId OR name
async function resolveCategory(value) {
  if (!value) return null;

  const isObjectId = /^[a-f\d]{24}$/i.test(value);

  if (isObjectId) {
    return await Category.findById(value);
  }

  return await Category.findOne({
    $or: [
      { categoryId: value },
      { name: { $regex: `^${value}$`, $options: "i" } }
    ]
  });
}

// Helper to format expense response
const formatExpense = (e) => ({
  id:         e.expenseId,
  amount:     e.amount,
  currency:   e.currency,
  category: e.category ? {
    id:    e.category.categoryId || e.category,
    name:  e.category.name,
    color: e.category.color,
    icon:  e.category.icon,
  } : e.category,
  note:       e.note,
  date:       e.date,
  receiptUrl: e.receiptUrl,
  createdAt:  e.createdAt,
  updatedAt:  e.updatedAt
});

// GET EXPENSES (search + filters + pagination)
exports.getExpenses = async (req, res, next) => {
  try {

    const {
      page = 1,
      limit = 20,
      category,
      from,
      to,
      search
    } = req.query;

    const skip =
      (Number(page) - 1) * Number(limit);

    let filter = {
      user: req.user._id
    };


    // CATEGORY FILTER
    if (category) {

      const cat = await resolveCategory(category);

      if (!cat) {
        return sendError(
          res,
          "NOT_FOUND",
          "Category not found",
          404
        );
      }

      filter.category = cat._id;
    }


    // DATE FILTER
    if (from || to) {
      filter.date = {};

      if (from) {
        filter.date.$gte = new Date(from);
      }

      if (to) {
        filter.date.$lte = new Date(to);
      }
    }


    // SEARCH (by note)
    if (search) {
      filter.note = {
        $regex: search,
        $options: "i"
      };
    }


    console.log("Applied Filter:", filter);


    const [expenses, total] = await Promise.all([

      Expense.find(filter)
        .populate(
          "category",
          "categoryId name color icon"
        )
        .sort({
          date: -1,
          createdAt: -1
        })
        .skip(skip)
        .limit(Number(limit)),

      Expense.countDocuments(filter)

    ]);


    return sendSuccess(res,{
      expenses: expenses.map(formatExpense),

      pagination:{
        page:Number(page),
        limit:Number(limit),
        total,
        totalPages:
          Math.ceil(total / Number(limit))
      }
    });

  }
  catch(err){
    next(err);
  }
};

// // ── Get expenses (paginated + filtered) ───────────────────────────────────────
// exports.getExpenses = async (req, res, next) => {
//   try {
//     const { page = 1, limit = 20, category, from, to, search } = req.query;
//     const skip = (Number(page) - 1) * Number(limit);

//     const filter = { user: req.user._id };

//     // category param can be categoryId (custom) or ObjectId
//     if (category) {
//       const cat = await resolveCategory(category);
//       if (cat) filter.category = cat._id;
//     }

//     if (from || to) {
//       filter.date = {};
//       if (from) filter.date.$gte = from;
//       if (to)   filter.date.$lte = to;
//     }

//     const [expenses, total] = await Promise.all([
//       Expense.find(filter)
//         .populate('category', 'categoryId name color icon')
//         .sort({ date: -1, createdAt: -1 })
//         .skip(skip)
//         .limit(Number(limit)),
//       Expense.countDocuments(filter)
//     ]);

//     sendSuccess(res, {
//       expenses: expenses.map(formatExpense),
//       pagination: {
//         page:       Number(page),
//         limit:      Number(limit),
//         total,
//         totalPages: Math.ceil(total / Number(limit))
//       }
//     });
//   } catch (err) { next(err); }
// };

// ── Get expenses for the last two months ──────────────────────────────────────
exports.getLastTwoMonthsExpenses = async (req, res, next) => {
  try {
    const now = new Date();
    const months = [];
    for (let i = 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      months.push(`${d.getFullYear()}-${mm}`);
    }

    const from = `${months[0]}-01`;
    const to   = `${months[1]}-31`;

    const expenses = await Expense.find({ user: req.user._id, date: { $gte: from, $lte: to } })
      .populate('category', 'categoryId name color icon')
      .sort({ date: -1, createdAt: -1 });

    const summary = await Promise.all(months.map(async (m) => {
      const agg = await Expense.aggregate([
        { $match: { user: req.user._id, date: { $gte: `${m}-01`, $lte: `${m}-31` } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      return { month: m, total: agg[0]?.total || 0 };
    }));

    sendSuccess(res, {
      months,
      summary,
      expenses: expenses.map(formatExpense)
    });
  } catch (err) { next(err); }
};

// ── Get single expense ─────────────────────────────────────────────────────────
exports.getExpense = async (req, res, next) => {
  try {
    const isObjectId = /^[a-f\d]{24}$/i.test(req.params.id);
    const query = isObjectId
      ? { _id: req.params.id, user: req.user._id }
      : { expenseId: req.params.id, user: req.user._id };

    const expense = await Expense.findOne(query)
      .populate('category', 'categoryId name color icon');
    if (!expense) return sendError(res, 'NOT_FOUND', 'Expense not found', 404);
    sendSuccess(res, formatExpense(expense));
  } catch (err) { next(err); }
};

// ── Create expense ────────────────────────────────────────────────────────────
exports.createExpense = async (req, res, next) => {
  try {
    const { amount, currency, categoryId, note, date, receiptUrl } = req.body;

    const category = await resolveCategory(categoryId);
    if (!category) return sendError(res, 'NOT_FOUND', 'Category not found', 404);

    const expense = await Expense.create({
      user:       req.user._id,
      category:   category._id,
      amount,
      currency:   currency || req.user.currency || 'INR',
      note:       note || '',
      date,
      receiptUrl: receiptUrl || null
    });

    sendSuccess(res, {
      id:         expense.expenseId,
      amount:     expense.amount,
      currency:   expense.currency,
      categoryId: category.categoryId,
      note:       expense.note,
      date:       expense.date,
      createdAt:  expense.createdAt
    }, 201);
  } catch (err) { next(err); }
};

// ── Update expense ────────────────────────────────────────────────────────────
exports.updateExpense = async (req, res, next) => {
  try {
    const isObjectId = /^[a-f\d]{24}$/i.test(req.params.id);
    const query = isObjectId
      ? { _id: req.params.id, user: req.user._id }
      : { expenseId: req.params.id, user: req.user._id };

    const expense = await Expense.findOne(query);
    if (!expense) return sendError(res, 'NOT_FOUND', 'Expense not found', 404);

    const fields = ['amount', 'currency', 'note', 'date', 'receiptUrl'];
    fields.forEach(f => { if (req.body[f] !== undefined) expense[f] = req.body[f]; });

    if (req.body.categoryId) {
      const cat = await resolveCategory(req.body.categoryId);
      if (!cat) return sendError(res, 'NOT_FOUND', 'Category not found', 404);
      expense.category = cat._id;
    }

    await expense.save();
    sendSuccess(res, {
      id:        expense.expenseId,
      amount:    expense.amount,
      note:      expense.note,
      updatedAt: expense.updatedAt
    });
  } catch (err) { next(err); }
};

// ── Sync local (Room) expenses ─────────────────────────────────────────────────
// Accepts the client's offline ExpenseEntity rows and upserts them by (user, clientId),
// so re-syncing the same local row never creates a duplicate. Each row is processed
// independently: one bad row reports an error without failing the whole batch.
exports.syncExpenses = async (req, res, next) => {
  try {
    const { expenses } = req.body;

    if (!Array.isArray(expenses) || expenses.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'expenses must be a non-empty array', 400, 'expenses');
    }

    const results = [];

    for (const item of expenses) {
      const clientId = item?.id;

      try {
        if (!clientId) {
          results.push({ clientId: null, status: 'error', message: 'Missing local id' });
          continue;
        }

        const amount = Number(item.amount);
        if (!Number.isFinite(amount) || amount < 0) {
          results.push({ clientId, status: 'error', message: 'Invalid amount' });
          continue;
        }

        if (!item.date) {
          results.push({ clientId, status: 'error', message: 'Missing date' });
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

        const expense = await Expense.findOneAndUpdate(
          { user: req.user._id, clientId },
          {
            user:       req.user._id,
            clientId,
            category:   category._id,
            amount,
            currency:   item.currency || req.user.currency || 'INR',
            note:       item.note || '',
            date:       item.date,
            receiptUrl: item.receiptUrl || null
          },
          { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
        );

        results.push({
          clientId,
          status:    'synced',
          serverId:  expense.expenseId,
          updatedAt: expense.updatedAt
        });
      } catch (itemErr) {
        results.push({ clientId: clientId || null, status: 'error', message: itemErr.message });
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

// ── Delete expense ────────────────────────────────────────────────────────────
exports.deleteExpense = async (req, res, next) => {
  try {
    const isObjectId = /^[a-f\d]{24}$/i.test(req.params.id);
    const query = isObjectId
      ? { _id: req.params.id, user: req.user._id }
      : { expenseId: req.params.id, user: req.user._id };

    const expense = await Expense.findOneAndDelete(query);
    if (!expense) return sendError(res, 'NOT_FOUND', 'Expense not found', 404);
    sendSuccess(res, { message: 'Expense deleted' });
  } catch (err) { next(err); }
};
