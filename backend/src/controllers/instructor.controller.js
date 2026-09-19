const Instructor = require('../models/Instructor');
const ClassSchedule = require('../models/ClassSchedule');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateInstructorId } = require('../services/idGenerator.service');
const { sendNotification } = require('../services/notification.service');

const REQUIRED_FIELDS = ['firstName', 'lastName', 'address', 'phone', 'email', 'preferredContact'];

function validateRequiredFields(body) {
  const missing = REQUIRED_FIELDS.filter((field) => !body[field] || String(body[field]).trim() === '');
  if (missing.length > 0) {
    throw new ApiError(400, 'Missing required fields', { missing });
  }
}

const checkDuplicate = asyncHandler(async (req, res) => {
  const { firstName, lastName } = req.query;
  if (!firstName || !lastName) {
    throw new ApiError(400, 'firstName and lastName are required');
  }

  const matches = await Instructor.find({
    firstName: new RegExp(`^${firstName.trim()}$`, 'i'),
    lastName: new RegExp(`^${lastName.trim()}$`, 'i'),
    isActive: true,
  }).select('instructorId firstName lastName email phone');

  res.json({ duplicateExists: matches.length > 0, matches });
});

const createInstructor = asyncHandler(async (req, res) => {
  validateRequiredFields(req.body);

  const { firstName, lastName, address, phone, email, preferredContact } = req.body;

  const instructorId = await generateInstructorId();

  const instructor = await Instructor.create({
    instructorId,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    address,
    phone,
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
    filter.$or = [
      { firstName: new RegExp(q, 'i') },
      { lastName: new RegExp(q, 'i') },
      { instructorId: new RegExp(q, 'i') },
    ];
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

  const { firstName, lastName, address, phone, email, preferredContact } = req.body;

  const instructor = await Instructor.findByIdAndUpdate(
    req.params.id,
    {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      address,
      phone,
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
    throw new ApiError(409, 'Cannot deactivate an instructor with active classes');
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
