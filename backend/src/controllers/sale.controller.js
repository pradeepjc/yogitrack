const Sale = require('../models/Sale');
const Customer = require('../models/Customer');
const Package = require('../models/Package');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateSaleId } = require('../services/idGenerator.service');

const { PAYMENT_MODES } = Sale;
const REQUIRED_FIELDS = [
  'customerId',
  'packageId',
  'amountPaid',
  'paymentMode',
  'paidAt',
  'validityStart',
  'validityEnd',
];

const DAY_MS = 24 * 60 * 60 * 1000;
// "Current" payment time: within the last day, allowing a little clock skew ahead.
const PAID_AT_MAX_AGE_MS = DAY_MS;
const PAID_AT_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

function validateRequiredFields(body) {
  const missing = REQUIRED_FIELDS.filter(
    (field) => body[field] === undefined || body[field] === null || String(body[field]).trim() === ''
  );
  if (missing.length > 0) {
    throw new ApiError(400, 'Missing required fields', { missing });
  }
}

function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

// Validity dates arrive as the manager's local calendar date but are stored as
// UTC midnight, so "today" is given a one-day allowance for time zones behind UTC.
function earliestCurrentDate(now) {
  const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(utcMidnight - DAY_MS);
}

const createSale = asyncHandler(async (req, res) => {
  validateRequiredFields(req.body);

  const { customerId, packageId, paymentMode } = req.body;
  if (!PAYMENT_MODES.includes(paymentMode)) {
    throw new ApiError(400, `Mode of payment must be one of: ${PAYMENT_MODES.join(', ')}`);
  }

  const amountPaid = Number(req.body.amountPaid);
  if (Number.isNaN(amountPaid) || amountPaid < 0) {
    throw new ApiError(400, 'Amount paid must be a non-negative number');
  }

  const paidAt = new Date(req.body.paidAt);
  const validityStart = new Date(req.body.validityStart);
  const validityEnd = new Date(req.body.validityEnd);
  if ([paidAt, validityStart, validityEnd].some((date) => Number.isNaN(date.getTime()))) {
    throw new ApiError(400, 'Payment date and validity dates must be valid dates');
  }

  const customer = await Customer.findOne({ customerId, isActive: true });
  if (!customer) {
    throw new ApiError(404, 'Customer not found');
  }
  const pkg = await Package.findOne({ packageId, isActive: true });
  if (!pkg) {
    throw new ApiError(404, 'Package not found');
  }

  if (toCents(amountPaid) !== toCents(pkg.price)) {
    throw new ApiError(400, `Amount paid must equal the package price ($${pkg.price.toFixed(2)})`);
  }

  const now = new Date();
  if (paidAt.getTime() > now.getTime() + PAID_AT_FUTURE_TOLERANCE_MS || paidAt.getTime() < now.getTime() - PAID_AT_MAX_AGE_MS) {
    throw new ApiError(400, 'Payment date and time must be current');
  }

  if (pkg.endDate < earliestCurrentDate(now)) {
    throw new ApiError(400, 'This package has expired and can no longer be sold');
  }
  if (validityEnd < validityStart) {
    throw new ApiError(400, 'Validity end date cannot be before the start date');
  }
  if (validityStart < pkg.startDate || validityEnd > pkg.endDate) {
    throw new ApiError(400, "Validity dates must fall within the package's start and end dates");
  }
  if (validityStart < earliestCurrentDate(now)) {
    throw new ApiError(400, 'Validity start date cannot be in the past');
  }

  const saleId = await generateSaleId();

  const sale = await Sale.create({
    saleId,
    customer: customer._id,
    package: pkg._id,
    classType: pkg.classType,
    isUnlimited: pkg.isUnlimited,
    remainingClasses: pkg.isUnlimited ? null : pkg.numberOfClasses,
    amountPaid,
    paymentMode,
    paidAt,
    validityStart,
    validityEnd,
  });

  // Unlimited packages add no countable classes; the balance only tracks finite ones.
  let classBalance = customer.classBalance;
  if (!pkg.isUnlimited) {
    const updated = await Customer.findByIdAndUpdate(
      customer._id,
      { $inc: { classBalance: pkg.numberOfClasses } },
      { new: true }
    );
    classBalance = updated.classBalance;
  }

  const populated = await sale.populate([
    { path: 'customer', select: 'customerId firstName lastName' },
    { path: 'package', select: 'packageId name' },
  ]);

  res.status(201).json({ sale: populated, classBalance });
});

const listSales = asyncHandler(async (req, res) => {
  const sales = await Sale.find()
    .populate('customer', 'customerId firstName lastName')
    .populate('package', 'packageId name')
    .sort({ paidAt: -1 });
  res.json(sales);
});

module.exports = { createSale, listSales };
