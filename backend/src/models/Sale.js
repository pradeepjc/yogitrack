const mongoose = require('mongoose');

const PAYMENT_MODES = ['Cash', 'Credit Card', 'Debit Card', 'Check'];

const saleSchema = new mongoose.Schema(
  {
    saleId: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
    classType: { type: String, enum: ['General', 'Special'], required: true },
    isUnlimited: { type: Boolean, default: false },
    // null when isUnlimited — never store Infinity
    remainingClasses: { type: Number, default: null },
    // informational only; never blocks or decrements
    usageCount: { type: Number, default: 0 },
    amountPaid: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: PAYMENT_MODES, required: true },
    paidAt: { type: Date, required: true },
    validityStart: { type: Date, required: true },
    validityEnd: { type: Date, required: true },
  },
  { timestamps: true }
);

saleSchema.index({ customer: 1, validityEnd: 1 });

module.exports = mongoose.model('Sale', saleSchema);
module.exports.PAYMENT_MODES = PAYMENT_MODES;
