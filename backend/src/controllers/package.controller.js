const Package = require('../models/Package');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generatePackageId } = require('../services/idGenerator.service');

const REQUIRED_FIELDS = ['name', 'category', 'numberOfClasses', 'classType', 'startDate', 'endDate', 'price'];
const ALLOWED_CLASS_COUNTS = [1, 4, 10];
const CATEGORIES = ['General', 'Senior'];
const CLASS_TYPES = ['General', 'Special'];

function validateRequiredFields(body) {
  const missing = REQUIRED_FIELDS.filter(
    (field) => body[field] === undefined || body[field] === null || String(body[field]).trim() === ''
  );
  if (missing.length > 0) {
    throw new ApiError(400, 'Missing required fields', { missing });
  }
}

function parseNumberOfClasses(value) {
  if (String(value).toLowerCase() === 'unlimited') {
    return { isUnlimited: true, numberOfClasses: null };
  }
  const count = Number(value);
  if (!ALLOWED_CLASS_COUNTS.includes(count)) {
    throw new ApiError(400, 'Number of classes must be 1, 4, 10, or unlimited');
  }
  return { isUnlimited: false, numberOfClasses: count };
}

// Validates a create/update payload and returns the fields to store.
function parsePackageInput(body) {
  validateRequiredFields(body);

  const { name, category, classType } = body;
  if (!CATEGORIES.includes(category)) {
    throw new ApiError(400, 'Category must be General or Senior');
  }
  if (!CLASS_TYPES.includes(classType)) {
    throw new ApiError(400, 'Class type must be General or Special');
  }
  const { isUnlimited, numberOfClasses } = parseNumberOfClasses(body.numberOfClasses);

  const price = Number(body.price);
  if (Number.isNaN(price) || price < 0) {
    throw new ApiError(400, 'Price must be a non-negative number');
  }

  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new ApiError(400, 'Start and end dates must be valid dates');
  }
  if (endDate < startDate) {
    throw new ApiError(400, 'End date cannot be before start date');
  }

  return { name: name.trim(), category, isUnlimited, numberOfClasses, classType, startDate, endDate, price };
}

const createPackage = asyncHandler(async (req, res) => {
  const fields = parsePackageInput(req.body);

  const packageId = await generatePackageId();

  const pkg = await Package.create({ packageId, ...fields });

  res.status(201).json(pkg);
});

const listPackages = asyncHandler(async (req, res) => {
  const packages = await Package.find({ isActive: true }).sort({ createdAt: -1 });
  res.json(packages);
});

// Past sales keep their own price, class type and dates, so edits here never rewrite them.
const updatePackage = asyncHandler(async (req, res) => {
  const fields = parsePackageInput(req.body);

  const pkg = await Package.findOneAndUpdate({ _id: req.params.id, isActive: true }, fields, {
    new: true,
    runValidators: true,
  });
  if (!pkg) {
    throw new ApiError(404, 'Package not found');
  }

  res.json(pkg);
});

const deactivatePackage = asyncHandler(async (req, res) => {
  const pkg = await Package.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!pkg) {
    throw new ApiError(404, 'Package not found');
  }
  res.json(pkg);
});

module.exports = { createPackage, listPackages, updatePackage, deactivatePackage };
