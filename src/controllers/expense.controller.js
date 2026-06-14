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
