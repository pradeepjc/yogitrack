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

const createPackage = asyncHandler(async (req, res) => {
  validateRequiredFields(req.body);

  const { name, category, classType } = req.body;
  if (!CATEGORIES.includes(category)) {
    throw new ApiError(400, 'Category must be General or Senior');
  }
  if (!CLASS_TYPES.includes(classType)) {
    throw new ApiError(400, 'Class type must be General or Special');
  }
  const { isUnlimited, numberOfClasses } = parseNumberOfClasses(req.body.numberOfClasses);

  const price = Number(req.body.price);
  if (Number.isNaN(price) || price < 0) {
    throw new ApiError(400, 'Price must be a non-negative number');
  }

  const startDate = new Date(req.body.startDate);
  const endDate = new Date(req.body.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new ApiError(400, 'Start and end dates must be valid dates');
  }
  if (endDate < startDate) {
    throw new ApiError(400, 'End date cannot be before start date');
  }

  const packageId = await generatePackageId();

  const pkg = await Package.create({
    packageId,
    name: name.trim(),
    category,
    isUnlimited,
    numberOfClasses,
    classType,
    startDate,
    endDate,
    price,
  });

  res.status(201).json(pkg);
});

const listPackages = asyncHandler(async (req, res) => {
  const packages = await Package.find({ isActive: true }).sort({ createdAt: -1 });
  res.json(packages);
});

module.exports = { createPackage, listPackages };
