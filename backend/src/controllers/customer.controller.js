const Customer = require('../models/Customer');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateCustomerId } = require('../services/idGenerator.service');
const { sendNotification } = require('../services/notification.service');
const { isValidEmail, isValidPhone } = require('../utils/validators');
const { exactMatchRegex } = require('../utils/regexUtils');

const REQUIRED_FIELDS = ['firstName', 'lastName', 'address', 'phone', 'email', 'preferredContact'];

function validateRequiredFields(body) {
  const missing = REQUIRED_FIELDS.filter((field) => !body[field] || String(body[field]).trim() === '');
  if (missing.length > 0) {
    throw new ApiError(400, 'Missing required fields', { missing });
  }
}

function validateContactFields(body) {
  if (!isValidPhone(body.phone)) {
    throw new ApiError(400, 'The phone number is invalid. Please enter a valid phone number to proceed.', {
      field: 'phone',
    });
  }
  if (!isValidEmail(body.email)) {
    throw new ApiError(400, 'The email is invalid. Please enter a valid email to proceed.', { field: 'email' });
  }
}

const checkDuplicate = asyncHandler(async (req, res) => {
  const { firstName, lastName } = req.query;
  if (!firstName || !lastName) {
    throw new ApiError(400, 'firstName and lastName are required');
  }

  const matches = await Customer.find({
    firstName: exactMatchRegex(firstName),
    lastName: exactMatchRegex(lastName),
    isActive: true,
  }).select('customerId firstName lastName email phone');

  res.json({ duplicateExists: matches.length > 0, matches });
});

const createCustomer = asyncHandler(async (req, res) => {
  validateRequiredFields(req.body);
  validateContactFields(req.body);

  const { firstName, lastName, address, phone, email, preferredContact } = req.body;

  const customerId = await generateCustomerId();

  const customer = await Customer.create({
    customerId,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    address,
    phone: String(phone).trim(),
    email: email.toLowerCase().trim(),
    preferredContact,
  });

  const welcomeMessage = `Welcome to Yoga'Hom! We're excited to have you on board. Your customer id is ${customerId}.`;
  await sendNotification({
    recipientModel: 'Customer',
    recipientRef: customer._id,
    channel: preferredContact,
    messageBody: welcomeMessage,
    relatedEntityType: 'Customer',
    relatedEntityId: customer._id,
  });

  res.status(201).json(customer);
});

const listCustomers = asyncHandler(async (req, res) => {
  const customers = await Customer.find({ isActive: true }).sort({ createdAt: -1 });
  res.json(customers);
});

module.exports = { checkDuplicate, createCustomer, listCustomers };
