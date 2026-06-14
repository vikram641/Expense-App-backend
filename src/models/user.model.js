const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema(
  {
    userId:        { type: String, default: () => `usr_${uuidv4()}`, unique: true, index: true },
    name:          { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:      { type: String, required: true, minlength: 6 },
    currency:      { type: String, default: 'INR' },
    fcmToken:      { type: String, default: null },
    refreshTokens: { type: [String], default: [] },
  },
  { timestamps: true, versionKey: false }
);

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret.userId;
    delete ret._id;
    delete ret.userId;
    delete ret.password;
    delete ret.refreshTokens;
    return ret;
  }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
