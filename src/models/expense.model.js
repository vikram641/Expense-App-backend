const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const expenseSchema = new mongoose.Schema(
  {
    expenseId:  { type: String, default: () => `exp_${uuidv4()}`, unique: true, index: true },
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
    category:   { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    amount:     { type: Number, required: true, min: 0 },
    currency:   { type: String, default: 'INR' },
    note:       { type: String, trim: true, default: '' },
    date:       { type: String, required: true },
    receiptUrl: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

expenseSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret.expenseId;
    delete ret._id;
    delete ret.expenseId;
    return ret;
  }
});

expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, category: 1 });
module.exports = mongoose.model('Expense', expenseSchema);
