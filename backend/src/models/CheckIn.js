const mongoose = require('mongoose');

// One document per customer per class session.
const checkInSchema = new mongoose.Schema(
  {
    classSchedule: { type: mongoose.Schema.Types.ObjectId, ref: 'ClassSchedule', required: true },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    // The package sale the class was taken from; null when checked in on an overridden balance.
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
    classType: { type: String, enum: ['General', 'Special'], required: true },
    attendedAt: { type: Date, required: true },
    // Studio-local calendar date of attendedAt, stored as UTC midnight.
    attendedDate: { type: Date, required: true },
    payRate: { type: Number, required: true },
    overdrawn: { type: Boolean, default: false },
    balanceAfter: { type: Number, required: true },
  },
  { timestamps: true }
);

checkInSchema.index({ classSchedule: 1, customer: 1, attendedDate: 1 }, { unique: true });
checkInSchema.index({ instructor: 1, attendedDate: 1 });

module.exports = mongoose.model('CheckIn', checkInSchema);
