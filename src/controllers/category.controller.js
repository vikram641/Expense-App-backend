const Category = require('../models/category.model');
const { sendSuccess, sendError } = require('../utils/response');

// Helper to format a category document
const formatCategory = (c) => ({
  id:        c.categoryId,
  name:      c.name,
  color:     c.color,
  icon:      c.icon,
  isDefault: c.isDefault
});

// ── Get all categories (defaults + user's custom) ─────────────────────────────
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({
      $or: [{ isDefault: true, user: null }, { user: req.user._id }]
    }).sort({ isDefault: -1, name: 1 });

    sendSuccess(res, categories.map(formatCategory));
  } catch (err) { next(err); }
};

// ── Create custom category ─────────────────────────────────────────────────────
exports.createCategory = async (req, res, next) => {
  try {
    const { name, color, icon } = req.body;

    const exists = await Category.findOne({ name, user: req.user._id });
    if (exists) return sendError(res, 'DUPLICATE_ERROR', 'Category with this name already exists', 409, 'name');

    const category = await Category.create({
      name,
      color:     color || '#607D8B',
      icon:      icon  || 'ic_other',
      isDefault: false,
      user:      req.user._id
    });

    sendSuccess(res, formatCategory(category), 201);
  } catch (err) { next(err); }
};

// ── Delete custom category ─────────────────────────────────────────────────────
exports.deleteCategory = async (req, res, next) => {
  try {
    // Support lookup by both categoryId (custom) and _id (ObjectId) for flexibility
    const category = await Category.findOne({
      $or: [{ categoryId: req.params.id }, { _id: req.params.id.match(/^[a-f\d]{24}$/i) ? req.params.id : null }],
      user: req.user._id,
      isDefault: false
    });
    if (!category) return sendError(res, 'NOT_FOUND', 'Custom category not found', 404);
    await category.deleteOne();
    sendSuccess(res, { message: 'Category deleted' });
  } catch (err) { next(err); }
};
