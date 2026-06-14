const Category = require('../models/category.model');

const DEFAULT_CATEGORIES = [
  { name: 'Food',          color: '#FF6B6B', icon: 'ic_food',          isDefault: true },
  { name: 'Transport',     color: '#4ECDC4', icon: 'ic_transport',     isDefault: true },
  { name: 'Shopping',      color: '#45B7D1', icon: 'ic_shopping',      isDefault: true },
  { name: 'Health',        color: '#96CEB4', icon: 'ic_health',        isDefault: true },
  { name: 'Bills',         color: '#FFEAA7', icon: 'ic_bills',         isDefault: true },
  { name: 'Entertainment', color: '#DDA0DD', icon: 'ic_entertainment', isDefault: true },
  { name: 'Other',         color: '#B0BEC5', icon: 'ic_other',         isDefault: true },
];

module.exports = async function seeder() {
  try {
    const count = await Category.countDocuments({ isDefault: true, user: null });
    if (count === 0) {
      await Category.insertMany(DEFAULT_CATEGORIES);
      console.log('🌱 Default categories seeded');
    }
  } catch (err) {
    // Ignore duplicate key errors on re-seed
    if (err.code !== 11000) console.error('Seeder error:', err.message);
  }
};
