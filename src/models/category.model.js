const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const categorySchema = new mongoose.Schema(
  {
    categoryId: { type: String, default: () => `cat_${uuidv4()}`, unique: true, index: true },
    name:       { type: String, required: true, trim: true },
    color:      { type: String, required: true, default: '#607D8B' },
    icon:       { type: String, default: 'ic_other' },
    isDefault:  { type: Boolean, default: false },
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false }
);

categorySchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret.categoryId;
    delete ret._id;
    delete ret.categoryId;
    return ret;
  }
});

categorySchema.index({ name: 1, user: 1 }, { unique: true });
module.exports = mongoose.model('Category', categorySchema);
