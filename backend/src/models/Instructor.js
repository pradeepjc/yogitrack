const mongoose = require('mongoose');
const { isValidEmail, isValidPhone } = require('../utils/validators');

const instructorSchema = new mongoose.Schema(
  {
    instructorId: { type: String, required: true, unique: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    phone: {
      type: String,
      required: true,
      trim: true,
      validate: { validator: isValidPhone, message: 'The phone number is invalid. Please enter a valid phone number to proceed.' },
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      validate: { validator: isValidEmail, message: 'The email is invalid. Please enter a valid email to proceed.' },
    },
    preferredContact: { type: String, enum: ['phone', 'email'], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

instructorSchema.index({ firstName: 1, lastName: 1 });

module.exports = mongoose.model('Instructor', instructorSchema);
