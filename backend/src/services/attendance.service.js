const ClassSchedule = require('../models/ClassSchedule');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');
const CheckIn = require('../models/CheckIn');
const ApiError = require('../utils/ApiError');
const { studioTimeZone } = require('../config/env');
const { zonedParts, timeToMinutes, minutesToTime, formatDateTime12h } = require('../utils/dateUtils');

// Attendance may be recorded this long before a class starts without a schedule warning.
const EARLY_ALLOWANCE_MINUTES = 30;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

function customerName(customer) {
  return `${customer.firstName} ${customer.lastName}`;
}

function scheduleWarning(classSchedule, attendedAt) {
  const { dayOfWeek, minutes } = zonedParts(attendedAt, studioTimeZone);
  const start = timeToMinutes(classSchedule.time);
  const end = start + classSchedule.durationMinutes;
  if (dayOfWeek === classSchedule.dayOfWeek && minutes >= start - EARLY_ALLOWANCE_MINUTES && minutes <= end) {
    return null;
  }
  const { date, time } = formatDateTime12h(attendedAt, studioTimeZone);
  return `This class is scheduled for ${classSchedule.dayOfWeek} ${classSchedule.time}–${minutesToTime(end)}, but the attendance is for ${dayOfWeek} ${date} at ${time}.`;
}

/**
 * Picks the sale a check-in should draw from: an unlimited package first (it never
 * runs out), otherwise the finite package that expires soonest. Only packages of the
 * class's type that are valid on the attendance date qualify.
 */
async function findEligibleSale(customerRef, classType, attendedDate) {
  const validSales = await Sale.find({
    customer: customerRef,
    classType,
    validityStart: { $lte: attendedDate },
    validityEnd: { $gte: attendedDate },
  }).sort({ validityEnd: 1, paidAt: 1 });

  const sale = validSales.find((s) => s.isUnlimited) || validSales.find((s) => s.remainingClasses > 0) || null;
  return { sale, hasValidPackage: validSales.length > 0 };
}

function balanceWarning(customer, classType, hasValidPackage) {
  const reason = hasValidPackage
    ? `has no ${classType} classes left`
    : `has no valid ${classType} package on this date`;
  return `${customerName(customer)} ${reason} (class balance ${customer.classBalance}).`;
}

/**
 * Validates an attendance submission. Hard problems throw; schedule and balance
 * problems come back as warnings the instructor may override.
 */
async function evaluateAttendance({ instructorRef, classId, attendedAt, customerIds }) {
  if (!classId) {
    throw new ApiError(400, 'Choose a class');
  }
  if (!Array.isArray(customerIds) || customerIds.length === 0) {
    throw new ApiError(400, 'Add at least one customer');
  }
  if (new Set(customerIds).size !== customerIds.length) {
    throw new ApiError(400, 'A customer was added more than once');
  }

  const when = new Date(attendedAt);
  if (Number.isNaN(when.getTime())) {
    throw new ApiError(400, 'Attendance date and time must be a valid date');
  }
  if (when.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
    throw new ApiError(400, 'Attendance date and time cannot be in the future');
  }

  const classSchedule = await ClassSchedule.findOne({ _id: classId, instructor: instructorRef, isActive: true });
  if (!classSchedule) {
    throw new ApiError(404, 'Class not found');
  }

  const customers = await Customer.find({ customerId: { $in: customerIds }, isActive: true });
  if (customers.length !== customerIds.length) {
    const found = new Set(customers.map((c) => c.customerId));
    throw new ApiError(404, `Customer not found: ${customerIds.filter((id) => !found.has(id)).join(', ')}`);
  }
  // Keep the order the instructor added them in.
  customers.sort((a, b) => customerIds.indexOf(a.customerId) - customerIds.indexOf(b.customerId));

  const attendedDate = new Date(zonedParts(when, studioTimeZone).dateKey);

  const alreadyCheckedIn = await CheckIn.find({
    classSchedule: classSchedule._id,
    customer: { $in: customers.map((c) => c._id) },
    attendedDate,
  }).populate('customer', 'firstName lastName');
  if (alreadyCheckedIn.length > 0) {
    const names = alreadyCheckedIn.map((c) => customerName(c.customer)).join(', ');
    throw new ApiError(409, `Already checked in for this class on this date: ${names}`);
  }

  const attendees = [];
  for (const customer of customers) {
    const { sale, hasValidPackage } = await findEligibleSale(customer._id, classSchedule.classType, attendedDate);
    attendees.push({
      customer,
      sale,
      warning: sale ? null : balanceWarning(customer, classSchedule.classType, hasValidPackage),
    });
  }

  return {
    classSchedule,
    attendedAt: when,
    attendedDate,
    scheduleWarning: scheduleWarning(classSchedule, when),
    attendees,
  };
}

/**
 * Applies a check-in. customer.classBalance is the number shown to everyone: it goes
 * up with finite package sales and down by one for every check-in not covered by an
 * unlimited package, including overridden ones (which may take it below zero).
 */
async function applyCheckIn({ classSchedule, attendedAt, attendedDate, customer, sale }) {
  let usedSale = sale;
  if (sale && !sale.isUnlimited) {
    // Guarded decrement in case another check-in used the last class meanwhile.
    usedSale = await Sale.findOneAndUpdate(
      { _id: sale._id, remainingClasses: { $gt: 0 } },
      { $inc: { remainingClasses: -1, usageCount: 1 } },
      { new: true }
    );
  } else if (sale) {
    await Sale.updateOne({ _id: sale._id }, { $inc: { usageCount: 1 } });
  }

  const unlimited = Boolean(usedSale?.isUnlimited);
  let classBalance = customer.classBalance;
  if (!unlimited) {
    const updated = await Customer.findByIdAndUpdate(customer._id, { $inc: { classBalance: -1 } }, { new: true });
    classBalance = updated.classBalance;
  }

  const checkIn = await CheckIn.create({
    classSchedule: classSchedule._id,
    instructor: classSchedule.instructor,
    customer: customer._id,
    sale: usedSale ? usedSale._id : null,
    classType: classSchedule.classType,
    attendedAt,
    attendedDate,
    payRate: classSchedule.payRate,
    overdrawn: !usedSale,
    balanceAfter: classBalance,
  });

  return { checkIn, classBalance, unlimited };
}

function checkInMessage(customer, attendedAt, classBalance, unlimited) {
  const { date, time } = formatDateTime12h(attendedAt, studioTimeZone);
  const balance = unlimited ? 'unlimited' : classBalance;
  return `Hello ${customer.firstName}! You are checked-in for a class on ${date} at ${time}. Your class-balance is ${balance}.`;
}

module.exports = { evaluateAttendance, applyCheckIn, checkInMessage, customerName };
