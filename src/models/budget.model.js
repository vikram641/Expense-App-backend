const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const budgetSchema = new mongoose.Schema(
  {
    budgetId:    { type: String, default: () => `bgt_${uuidv4()}`, unique: true, index: true },
    user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
    category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    limitAmount: { type: Number, required: true, min: 0 },
    currency:    { type: String, default: 'INR' },
    month:       { type: String, required: true },
    
  },
  { timestamps: true, versionKey: false }
);

budgetSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret.budgetId;
    delete ret._id;
    delete ret.budgetId;
    return ret;
  }
});

budgetSchema.index({ user: 1, category: 1, month: 1 }, { unique: true });
module.exports = mongoose.model('Budget', budgetSchema);
