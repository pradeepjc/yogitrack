const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['manager', 'instructor'], required: true },
    // Set only for instructor accounts.
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Instructor',
      required() {
        return this.role === 'instructor';
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
