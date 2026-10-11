const Instructor = require('../models/Instructor');
const ClassSchedule = require('../models/ClassSchedule');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateInstructorId } = require('../services/idGenerator.service');
const { sendNotification } = require('../services/notification.service');
const { isValidEmail, isValidPhone } = require('../utils/validators');
const { exactMatchRegex, containsRegex } = require('../utils/regexUtils');

const REQUIRED_FIELDS = ['firstName', 'lastName', 'address', 'phone', 'email', 'preferredContact'];

function validateRequiredFields(body) {
  const missing = REQUIRED_FIELDS.filter((field) => !body[field] || String(body[field]).trim() === '');
  if (missing.length > 0) {
    throw new ApiError(400, 'Missing required fields', { missing });
  }
}

function validateContactFields(body) {
  if (!isValidPhone(body.phone)) {
    throw new ApiError(400, 'The phone number is invalid. Please enter a valid phone number to proceed.', { field: 'phone' });
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

  const matches = await Instructor.find({
    firstName: exactMatchRegex(firstName),
    lastName: exactMatchRegex(lastName),
    isActive: true,
  }).select('instructorId firstName lastName email phone');

  res.json({ duplicateExists: matches.length > 0, matches });
});

const createInstructor = asyncHandler(async (req, res) => {
  validateRequiredFields(req.body);
  validateContactFields(req.body);

  const { firstName, lastName, address, phone, email, preferredContact } = req.body;

  const instructorId = await generateInstructorId();

  const instructor = await Instructor.create({
    instructorId,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    address,
    phone: String(phone).trim(),
    email: email.toLowerCase().trim(),
    preferredContact,
  });

  const welcomeMessage = `Welcome to Yoga'Hom! We're excited to have you on board. Your instructor id is ${instructorId}.`;
  await sendNotification({
    recipientModel: 'Instructor',
    recipientRef: instructor._id,
    channel: preferredContact,
    messageBody: welcomeMessage,
    relatedEntityType: 'Instructor',
    relatedEntityId: instructor._id,
  });

  res.status(201).json(instructor);
});

const listInstructors = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const filter = { isActive: true };
  if (q) {
    const pattern = containsRegex(q);
    filter.$or = [{ firstName: pattern }, { lastName: pattern }, { instructorId: pattern }];
  }
  const instructors = await Instructor.find(filter).sort({ createdAt: -1 });
  res.json(instructors);
});

const getInstructor = asyncHandler(async (req, res) => {
  const instructor = await Instructor.findById(req.params.id);
  if (!instructor) {
    throw new ApiError(404, 'Instructor not found');
  }
  res.json(instructor);
});

const updateInstructor = asyncHandler(async (req, res) => {
  validateRequiredFields(req.body);
  validateContactFields(req.body);

  const { firstName, lastName, address, phone, email, preferredContact } = req.body;

  const instructor = await Instructor.findByIdAndUpdate(
    req.params.id,
    {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      address,
      phone: String(phone).trim(),
      email: email.toLowerCase().trim(),
      preferredContact,
    },
    { new: true, runValidators: true }
  );

  if (!instructor) {
    throw new ApiError(404, 'Instructor not found');
  }

  res.json(instructor);
});

const deactivateInstructor = asyncHandler(async (req, res) => {
  const activeClassCount = await ClassSchedule.countDocuments({
    instructor: req.params.id,
    isActive: true,
  });
  if (activeClassCount > 0) {
    throw new ApiError(409, 'This instructor still has active classes. Delete or reassign those classes first.');
  }

  const instructor = await Instructor.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!instructor) {
    throw new ApiError(404, 'Instructor not found');
  }

  res.json(instructor);
});

module.exports = {
  checkDuplicate,
  createInstructor,
  listInstructors,
  getInstructor,
  updateInstructor,
  deactivateInstructor,
};
