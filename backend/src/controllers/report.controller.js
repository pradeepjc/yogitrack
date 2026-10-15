const Sale = require('../models/Sale');
const Package = require('../models/Package');
const Instructor = require('../models/Instructor');
const ClassSchedule = require('../models/ClassSchedule');
const Customer = require('../models/Customer');
const CheckIn = require('../models/CheckIn');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { studioTimeZone } = require('../config/env');
const { DAYS, zonedParts } = require('../utils/dateUtils');

const byDayThenTime = (a, b) => DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek) || a.time.localeCompare(b.time);

const fullName = (person) => `${person.firstName} ${person.lastName}`;

// Studio-local "today" as UTC midnight, matching how sale validity dates are stored.
function studioToday() {
  return new Date(zonedParts(new Date(), studioTimeZone).dateKey);
}

// 1. Package sales: units sold and revenue per package, including deleted packages that sold.
const packageSales = asyncHandler(async (req, res) => {
  const totals = await Sale.aggregate([
    { $group: { _id: '$package', unitsSold: { $sum: 1 }, revenue: { $sum: '$amountPaid' }, lastSoldAt: { $max: '$paidAt' } } },
  ]);
  const totalsByPackage = new Map(totals.map((t) => [String(t._id), t]));

  const packages = await Package.find({ $or: [{ isActive: true }, { _id: { $in: totals.map((t) => t._id) } }] });

  const rows = packages
    .map((pkg) => {
      const t = totalsByPackage.get(String(pkg._id));
      return {
        id: pkg._id,
        packageId: pkg.packageId,
        name: pkg.name,
        category: pkg.category,
        classType: pkg.classType,
        classes: pkg.isUnlimited ? 'Unlimited' : pkg.numberOfClasses,
        price: pkg.price,
        isActive: pkg.isActive,
        unitsSold: t ? t.unitsSold : 0,
        revenue: t ? t.revenue : 0,
        lastSoldAt: t ? t.lastSoldAt : null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || a.packageId.localeCompare(b.packageId));

  res.json({
    rows,
    totals: {
      unitsSold: rows.reduce((sum, r) => sum + r.unitsSold, 0),
      revenue: rows.reduce((sum, r) => sum + r.revenue, 0),
    },
  });
});

// 2. Active instructors with their active classes and all-time check-in counts per class.
const instructorClasses = asyncHandler(async (req, res) => {
  const instructors = await Instructor.find({ isActive: true }).sort({ instructorId: 1 });
  const classes = await ClassSchedule.find({ isActive: true });
  const counts = await CheckIn.aggregate([{ $group: { _id: '$classSchedule', checkIns: { $sum: 1 } } }]);
  const checkInsByClass = new Map(counts.map((c) => [String(c._id), c.checkIns]));

  const rows = [];
  for (const instructor of instructors) {
    const own = classes.filter((c) => String(c.instructor) === String(instructor._id)).sort(byDayThenTime);
    const base = { instructorId: instructor.instructorId, instructorName: fullName(instructor) };
    if (own.length === 0) {
      rows.push({ id: instructor._id, ...base, hasClass: false, checkIns: 0 });
    }
    for (const cls of own) {
      rows.push({
        id: cls._id,
        ...base,
        hasClass: true,
        dayOfWeek: cls.dayOfWeek,
        time: cls.time,
        durationMinutes: cls.durationMinutes,
        classType: cls.classType,
        payRate: cls.payRate,
        checkIns: checkInsByClass.get(String(cls._id)) || 0,
      });
    }
  }

  res.json({ rows });
});

const STATUS_ORDER = ['Active', 'Future', 'Expired'];

// 3. Active customers with every package they bought, labeled by validity relative to today.
const customerPackages = asyncHandler(async (req, res) => {
  const customers = await Customer.find({ isActive: true }).sort({ customerId: 1 });
  const sales = await Sale.find({ customer: { $in: customers.map((c) => c._id) } }).populate('package', 'packageId name');
  const today = studioToday();

  const rows = [];
  for (const customer of customers) {
    const base = {
      customerId: customer.customerId,
      customerName: fullName(customer),
      classBalance: customer.classBalance,
    };
    const own = sales
      .filter((s) => String(s.customer) === String(customer._id))
      .map((s) => {
        let status = 'Active';
        if (s.validityStart > today) status = 'Future';
        else if (s.validityEnd < today) status = 'Expired';
        return {
          id: s._id,
          ...base,
          saleId: s.saleId,
          packageId: s.package?.packageId,
          packageName: s.package?.name,
          classType: s.classType,
          remaining: s.isUnlimited ? 'Unlimited' : s.remainingClasses,
          validityStart: s.validityStart,
          validityEnd: s.validityEnd,
          status,
        };
      })
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.validityStart - b.validityStart);

    if (own.length === 0) {
      rows.push({ id: customer._id, ...base, status: null });
    }
    rows.push(...own);
  }

  res.json({ rows });
});

// 4. Teacher pay for a month: each check-in earns the class's pay rate as recorded at check-in.
const teacherPayments = asyncHandler(async (req, res) => {
  const month = req.query.month || zonedParts(new Date(), studioTimeZone).dateKey.slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new ApiError(400, 'Month must be in YYYY-MM format');
  }
  const [year, monthNumber] = month.split('-').map(Number);
  // attendedDate is the studio-local date stored as UTC midnight.
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));

  // Grouped by pay rate too, so a mid-month rate change is paid at both rates.
  const groups = await CheckIn.aggregate([
    { $match: { attendedDate: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: { classSchedule: '$classSchedule', payRate: '$payRate' },
        instructor: { $first: '$instructor' },
        checkIns: { $sum: 1 },
        amount: { $sum: '$payRate' },
      },
    },
  ]);

  // Deleted instructors and classes are still included: the work was done.
  const instructors = await Instructor.find({ _id: { $in: groups.map((g) => g.instructor) } });
  const classes = await ClassSchedule.find({ _id: { $in: groups.map((g) => g._id.classSchedule) } });
  const instructorById = new Map(instructors.map((i) => [String(i._id), i]));
  const classById = new Map(classes.map((c) => [String(c._id), c]));

  const byClass = groups
    .map((g) => {
      const instructor = instructorById.get(String(g.instructor));
      const cls = classById.get(String(g._id.classSchedule));
      return {
        id: `${g._id.classSchedule}-${g._id.payRate}`,
        instructorId: instructor.instructorId,
        instructorName: fullName(instructor),
        dayOfWeek: cls.dayOfWeek,
        time: cls.time,
        durationMinutes: cls.durationMinutes,
        classType: cls.classType,
        payRate: g._id.payRate,
        checkIns: g.checkIns,
        amount: g.amount,
      };
    })
    .sort((a, b) => a.instructorId.localeCompare(b.instructorId) || byDayThenTime(a, b) || a.payRate - b.payRate);

  const byInstructorMap = new Map();
  for (const row of byClass) {
    const entry = byInstructorMap.get(row.instructorId) || {
      id: row.instructorId,
      instructorId: row.instructorId,
      instructorName: row.instructorName,
      checkIns: 0,
      amount: 0,
    };
    entry.checkIns += row.checkIns;
    entry.amount += row.amount;
    byInstructorMap.set(row.instructorId, entry);
  }
  const byInstructor = [...byInstructorMap.values()];

  res.json({
    month,
    byInstructor,
    byClass,
    totals: {
      checkIns: byInstructor.reduce((sum, r) => sum + r.checkIns, 0),
      amount: byInstructor.reduce((sum, r) => sum + r.amount, 0),
    },
  });
});

module.exports = { packageSales, instructorClasses, customerPackages, teacherPayments };
