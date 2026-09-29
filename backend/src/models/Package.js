const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    packageId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ['General', 'Senior'], required: true },
    isUnlimited: { type: Boolean, default: false },
    // null when isUnlimited — never store Infinity
    numberOfClasses: { type: Number, enum: [1, 4, 10, null], default: null },
    classType: { type: String, enum: ['General', 'Special'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Package', packageSchema);
