const ClassSchedule = require('../models/ClassSchedule');
const Instructor = require('../models/Instructor');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { isValidTimeString, minutesToTime, timeToMinutes } = require('../utils/dateUtils');
const {
  findConflict,
  suggestAlternatives,
  DEFAULT_DURATION_MINUTES,
} = require('../services/scheduleConflict.service');
const { sendNotification } = require('../services/notification.service');

function validateClassInput(body) {
  const { instructorId, dayOfWeek, time, classType, payRate } = body;
  if (!instructorId || !dayOfWeek || !time || !classType || payRate === undefined || payRate === null) {
    throw new ApiError(400, 'instructorId, dayOfWeek, time, classType, and payRate are all required');
  }
  if (!isValidTimeString(time)) {
    throw new ApiError(400, 'time must be in HH:mm 24-hour format');
  }
  if (!['General', 'Special'].includes(classType)) {
    throw new ApiError(400, 'classType must be General or Special');
  }
  if (Number(payRate) < 0) {
    throw new ApiError(400, 'payRate must be a non-negative number');
  }
}

const checkConflict = asyncHandler(async (req, res) => {
  const { dayOfWeek, time, excludeClassId } = req.body;
  if (!dayOfWeek || !time) {
    throw new ApiError(400, 'dayOfWeek and time are required');
  }

  const conflictingClass = await findConflict(dayOfWeek, time, DEFAULT_DURATION_MINUTES, excludeClassId || null);
  if (!conflictingClass) {
    return res.json({ conflict: false });
  }

  const suggestions = await suggestAlternatives(dayOfWeek, time, DEFAULT_DURATION_MINUTES, excludeClassId || null);
  res.json({ conflict: true, conflictingClass, suggestions });
});

const createClass = asyncHandler(async (req, res) => {
  validateClassInput(req.body);
  const { instructorId, dayOfWeek, time, classType, payRate } = req.body;

  const instructor = await Instructor.findOne({ instructorId, isActive: true });
  if (!instructor) {
    throw new ApiError(404, 'Instructor not found');
  }

  // Authoritative re-check to avoid a race between two managers publishing at once.
  const conflictingClass = await findConflict(dayOfWeek, time, DEFAULT_DURATION_MINUTES);
  if (conflictingClass) {
    const suggestions = await suggestAlternatives(dayOfWeek, time, DEFAULT_DURATION_MINUTES);
    throw new ApiError(409, 'Studio already booked for this time', { conflictingClass, suggestions });
  }

  const classSchedule = await ClassSchedule.create({
    instructor: instructor._id,
    dayOfWeek,
    time,
    durationMinutes: DEFAULT_DURATION_MINUTES,
    classType,
    payRate,
  });

  const populated = await classSchedule.populate('instructor', 'instructorId firstName lastName preferredContact email phone');

  const endTime = minutesToTime(timeToMinutes(time) + DEFAULT_DURATION_MINUTES);
  const confirmationMessage = `A new ${classType} class has been scheduled on ${dayOfWeek} from ${time} to ${endTime} with ${instructor.firstName} ${instructor.lastName}.`;

  await sendNotification({
    recipientModel: 'Instructor',
    recipientRef: instructor._id,
    channel: instructor.preferredContact,
    messageBody: confirmationMessage,
    relatedEntityType: 'ClassSchedule',
    relatedEntityId: classSchedule._id,
  });

  // UC2 also requires notifying the manager who published the schedule.
  // The manager User has no stored contact channel, so this is logged via email.
  await sendNotification({
    recipientModel: 'User',
    recipientRef: req.user.sub,
    channel: 'email',
    messageBody: confirmationMessage,
    relatedEntityType: 'ClassSchedule',
    relatedEntityId: classSchedule._id,
  });

  res.status(201).json(populated);
});

const listClasses = asyncHandler(async (req, res) => {
  const { instructorId } = req.query;
  const filter = { isActive: true };
  if (instructorId) {
    const instructor = await Instructor.findOne({ instructorId });
    filter.instructor = instructor ? instructor._id : null;
  }
  const classes = await ClassSchedule.find(filter)
    .populate('instructor', 'instructorId firstName lastName')
    .sort({ dayOfWeek: 1, time: 1 });
  res.json(classes);
});

const getClass = asyncHandler(async (req, res) => {
  const classSchedule = await ClassSchedule.findById(req.params.id).populate(
    'instructor',
    'instructorId firstName lastName'
  );
  if (!classSchedule) {
    throw new ApiError(404, 'Class not found');
  }
  res.json(classSchedule);
});

const updateClass = asyncHandler(async (req, res) => {
  validateClassInput(req.body);
  const { instructorId, dayOfWeek, time, classType, payRate } = req.body;

  const instructor = await Instructor.findOne({ instructorId, isActive: true });
  if (!instructor) {
    throw new ApiError(404, 'Instructor not found');
  }

  const conflictingClass = await findConflict(dayOfWeek, time, DEFAULT_DURATION_MINUTES, req.params.id);
  if (conflictingClass) {
    const suggestions = await suggestAlternatives(dayOfWeek, time, DEFAULT_DURATION_MINUTES, req.params.id);
    throw new ApiError(409, 'Studio already booked for this time', { conflictingClass, suggestions });
  }

  const classSchedule = await ClassSchedule.findByIdAndUpdate(
    req.params.id,
    { instructor: instructor._id, dayOfWeek, time, classType, payRate },
    { new: true, runValidators: true }
  ).populate('instructor', 'instructorId firstName lastName');

  if (!classSchedule) {
    throw new ApiError(404, 'Class not found');
  }

  res.json(classSchedule);
});

const deactivateClass = asyncHandler(async (req, res) => {
  const classSchedule = await ClassSchedule.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!classSchedule) {
    throw new ApiError(404, 'Class not found');
  }
  res.json(classSchedule);
});

module.exports = {
  checkConflict,
  createClass,
  listClasses,
  getClass,
  updateClass,
  deactivateClass,
};
