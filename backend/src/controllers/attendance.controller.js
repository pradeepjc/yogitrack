const User = require('../models/User');
const Instructor = require('../models/Instructor');
const ClassSchedule = require('../models/ClassSchedule');
const Customer = require('../models/Customer');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { DAYS } = require('../utils/dateUtils');
const { sendNotification } = require('../services/notification.service');
const {
  evaluateAttendance,
  applyCheckIn,
  checkInMessage,
  customerName,
} = require('../services/attendance.service');

// Resolved on every request so a deactivated instructor loses access immediately.
async function currentInstructor(req) {
  const user = await User.findOne({ _id: req.user.sub, isActive: true });
  const instructor = user && (await Instructor.findOne({ _id: user.instructor, isActive: true }));
  if (!instructor) {
    throw new ApiError(403, 'Your instructor account is not active');
  }
  return instructor;
}

const myClasses = asyncHandler(async (req, res) => {
  const instructor = await currentInstructor(req);
  const classes = await ClassSchedule.find({ instructor: instructor._id, isActive: true });
  classes.sort((a, b) => DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek) || a.time.localeCompare(b.time));
  res.json(classes);
});

// Instructors only need enough to pick attendees, not contact details.
const listCustomers = asyncHandler(async (req, res) => {
  await currentInstructor(req);
  const customers = await Customer.find({ isActive: true })
    .select('customerId firstName lastName classBalance')
    .sort({ firstName: 1, lastName: 1 });
  res.json(customers);
});

const previewAttendance = asyncHandler(async (req, res) => {
  const instructor = await currentInstructor(req);
  const result = await evaluateAttendance({ instructorRef: instructor._id, ...req.body });
  res.json({
    scheduleWarning: result.scheduleWarning,
    attendees: result.attendees.map(({ customer, warning }) => ({
      customerId: customer.customerId,
      name: customerName(customer),
      classBalance: customer.classBalance,
      warning,
    })),
  });
});

const recordAttendance = asyncHandler(async (req, res) => {
  const instructor = await currentInstructor(req);
  const { classSchedule, attendedAt, attendedDate, attendees } = await evaluateAttendance({
    instructorRef: instructor._id,
    ...req.body,
  });

  const checkIns = [];
  for (const { customer, sale } of attendees) {
    const { checkIn, classBalance, unlimited } = await applyCheckIn({
      classSchedule,
      attendedAt,
      attendedDate,
      customer,
      sale,
    });

    await sendNotification({
      recipientModel: 'Customer',
      recipientRef: customer._id,
      channel: customer.preferredContact,
      messageBody: checkInMessage(customer, attendedAt, classBalance, unlimited),
      relatedEntityType: 'CheckIn',
      relatedEntityId: checkIn._id,
    });

    checkIns.push({
      customerId: customer.customerId,
      name: customerName(customer),
      classBalance,
      unlimited,
      overdrawn: checkIn.overdrawn,
    });
  }

  res.status(201).json({
    classSchedule: { dayOfWeek: classSchedule.dayOfWeek, time: classSchedule.time, classType: classSchedule.classType },
    attendedAt,
    checkIns,
  });
});

module.exports = { myClasses, listCustomers, previewAttendance, recordAttendance };
