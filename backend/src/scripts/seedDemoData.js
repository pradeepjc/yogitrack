/**
 * Adds a demo studio covering every use case: instructors (with logins), a weekly
 * class schedule, packages, customers, sales (expired, active and future) and about
 * six weeks of attendance. Dates are relative to today so the data never goes stale.
 *
 * Writes through the models rather than the API because the API (rightly) refuses
 * backdated sales and attendance. IDs, instructor logins, conflict checks and
 * check-in balance updates reuse the app's own services.
 *
 * Every record it creates is listed in a `demo_manifest` collection as it goes, so
 * the demo can be removed exactly, without guessing from names, even after an
 * interrupted run.
 *
 *   npm run seed:demo           add the demo (refuses if it is already there)
 *   npm run seed:demo:reset     remove the existing demo, then add a fresh one
 *   npm run seed:demo:remove    remove the demo only
 *
 * Removal refuses to run if any of your own records depend on demo records (a real
 * customer's sale of a demo package, or a check-in to a demo class), since deleting
 * those would leave real balances wrong. All modes refuse NODE_ENV=production unless
 * --allow-production is passed.
 */
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { nodeEnv, studioTimeZone } = require('../config/env');
const Instructor = require('../models/Instructor');
const Customer = require('../models/Customer');
const ClassSchedule = require('../models/ClassSchedule');
const Package = require('../models/Package');
const Sale = require('../models/Sale');
const Notification = require('../models/Notification');
const CheckIn = require('../models/CheckIn');
const User = require('../models/User');
const {
  generateInstructorId,
  generateCustomerId,
  generatePackageId,
  generateSaleId,
} = require('../services/idGenerator.service');
const { ensureInstructorAccount } = require('../services/instructorAccount.service');
const { findConflict, suggestAlternatives, DEFAULT_DURATION_MINUTES } = require('../services/scheduleConflict.service');
const { findEligibleSale, applyCheckIn, checkInMessage } = require('../services/attendance.service');
const { DAYS, zonedParts } = require('../utils/dateUtils');

const DEMO_EMAIL_DOMAIN = 'demo.example.com';
const MANIFEST_ID = 'demo';
const HISTORY_DAYS = 42;
const DAY_MS = 24 * 60 * 60 * 1000;

const INSTRUCTORS = [
  { key: 'priya', firstName: 'Priya', lastName: 'Sharma', phone: '612-555-0201', preferredContact: 'email' },
  { key: 'marcus', firstName: 'Marcus', lastName: 'Johnson', phone: '612-555-0202', preferredContact: 'phone' },
  { key: 'elena', firstName: 'Elena', lastName: 'Rossi', phone: '612-555-0203', preferredContact: 'email' },
  { key: 'kenji', firstName: 'Kenji', lastName: 'Tanaka', phone: '612-555-0204', preferredContact: 'phone' },
];

const CLASSES = [
  { instructor: 'priya', dayOfWeek: 'Sun', time: '09:00', classType: 'General', payRate: 45 },
  { instructor: 'marcus', dayOfWeek: 'Mon', time: '06:00', classType: 'General', payRate: 40 },
  { instructor: 'elena', dayOfWeek: 'Mon', time: '17:00', classType: 'Special', payRate: 60 },
  { instructor: 'priya', dayOfWeek: 'Tue', time: '12:00', classType: 'General', payRate: 45 },
  { instructor: 'kenji', dayOfWeek: 'Wed', time: '18:00', classType: 'General', payRate: 40 },
  { instructor: 'elena', dayOfWeek: 'Thu', time: '09:00', classType: 'Special', payRate: 60 },
  { instructor: 'marcus', dayOfWeek: 'Fri', time: '17:00', classType: 'General', payRate: 40 },
  { instructor: 'kenji', dayOfWeek: 'Sat', time: '10:00', classType: 'General', payRate: 45 },
];

// Every package is sellable from 90 days ago to 120 days ahead.
const PACKAGES = [
  { key: 'dropIn', name: 'Drop-In Class', category: 'General', classType: 'General', classes: 1, price: 20 },
  { key: 'four', name: '4-Class Pass', category: 'General', classType: 'General', classes: 4, price: 70 },
  { key: 'ten', name: '10-Class Pass', category: 'General', classType: 'General', classes: 10, price: 150 },
  { key: 'senior', name: 'Senior 10-Class Pass', category: 'Senior', classType: 'General', classes: 10, price: 120 },
  { key: 'unlimited', name: 'Unlimited Monthly', category: 'General', classType: 'General', classes: 'unlimited', price: 180 },
  { key: 'weights', name: 'Yoga with Weights 4-Pack', category: 'General', classType: 'Special', classes: 4, price: 90 },
];

// Validity is in days relative to today. `rate` is the chance a customer attends any class
// their package covers; `walkIn` is the chance they turn up without one (an override).
const CUSTOMERS = [
  {
    firstName: 'Olivia', lastName: 'Brown', phone: '651-555-0301', preferredContact: 'email', rate: 0.2,
    purchases: [{ pkg: 'four', from: -75, to: -30 }, { pkg: 'ten', from: -28, to: 60 }],
  },
  { firstName: 'Liam', lastName: 'Garcia', phone: '651-555-0302', preferredContact: 'phone', rate: 0.35, purchases: [{ pkg: 'unlimited', from: -35, to: 25 }] },
  { firstName: 'Ava', lastName: 'Martinez', phone: '651-555-0303', preferredContact: 'email', rate: 0.18, purchases: [{ pkg: 'senior', from: -40, to: 80 }] },
  {
    firstName: 'Noah', lastName: 'Wilson', phone: '651-555-0304', preferredContact: 'phone', rate: 0.2,
    purchases: [{ pkg: 'four', from: -20, to: 40 }, { pkg: 'ten', from: 10, to: 100 }],
  },
  {
    firstName: 'Mia', lastName: 'Anderson', phone: '651-555-0305', preferredContact: 'email', rate: 0.2,
    purchases: [{ pkg: 'weights', from: -30, to: 30 }, { pkg: 'four', from: -30, to: 30 }],
  },
  { firstName: 'Ethan', lastName: 'Thomas', phone: '651-555-0306', preferredContact: 'phone', rate: 0.2, walkIn: 0.04, purchases: [{ pkg: 'dropIn', from: -60, to: -50 }] },
  {
    firstName: 'Sophia', lastName: 'Lee', phone: '651-555-0307', preferredContact: 'email', rate: 0.15,
    purchases: [{ pkg: 'ten', from: -42, to: 50 }, { pkg: 'weights', from: -10, to: 50 }],
  },
  { firstName: 'James', lastName: 'Clark', phone: '651-555-0308', preferredContact: 'phone', purchases: [] },
  { firstName: 'Isabella', lastName: 'Lewis', phone: '651-555-0309', preferredContact: 'email', purchases: [{ pkg: 'unlimited', from: 5, to: 35 }] },
  { firstName: 'Lucas', lastName: 'Walker', phone: '651-555-0310', preferredContact: 'phone', purchases: [{ pkg: 'dropIn', from: 0, to: 30 }] },
];

const PAYMENT_MODES = ['Cash', 'Credit Card', 'Debit Card', 'Check'];

// Deterministic pseudo-random numbers so every run produces the same history.
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = seededRandom(5423);

const email = (person) => `${person.firstName}.${person.lastName}@${DEMO_EMAIL_DOMAIN}`.toLowerCase();

// Calendar dates are stored as UTC midnight (see the spec's date decisions).
const todayKey = zonedParts(new Date(), studioTimeZone).dateKey;
const dateFromToday = (days) => new Date(new Date(todayKey).getTime() + days * DAY_MS);
const dateKeyOf = (date) => date.toISOString().slice(0, 10);

// The UTC instant of a studio-local date and time.
function studioInstant(dateKey, time) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const seen = zonedParts(new Date(guess), studioTimeZone);
  const seenUtc = Date.UTC(...seen.dateKey.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v))), 0, seen.minutes);
  return new Date(guess - (seenUtc - guess));
}

// The manifest lives outside the app's models; it only matters to this script.
const manifest = () => mongoose.connection.collection('demo_manifest');

async function track(kind, doc) {
  await manifest().updateOne({ _id: MANIFEST_ID }, { $push: { [kind]: doc._id } });
}

async function notify(recipientModel, recipient, messageBody, relatedEntityType, relatedEntityId, sentAt) {
  await Notification.create({
    recipientModel,
    recipientRef: recipient._id,
    channel: recipient.preferredContact,
    messageBody,
    relatedEntityType,
    relatedEntityId,
    sentAt,
  });
}

async function createInstructors() {
  const byKey = {};
  for (const spec of INSTRUCTORS) {
    const instructorId = await generateInstructorId();
    const instructor = await Instructor.create({
      instructorId,
      firstName: spec.firstName,
      lastName: spec.lastName,
      address: `${100 + INSTRUCTORS.indexOf(spec)} Lake St, Minneapolis, MN 55408`,
      phone: spec.phone,
      email: email(spec),
      preferredContact: spec.preferredContact,
    });
    await track('instructors', instructor);
    await ensureInstructorAccount(instructor);
    await notify(
      'Instructor',
      instructor,
      `Welcome to Yoga'Hom! We're excited to have you on board. Your instructor id is ${instructorId}.`,
      'Instructor',
      instructor._id
    );
    byKey[spec.key] = instructor;
  }
  return byKey;
}

async function createClasses(instructors) {
  const classes = [];
  for (const spec of CLASSES) {
    let { dayOfWeek, time } = spec;
    // Existing classes may already hold a slot; move to the closest free one.
    if (await findConflict(dayOfWeek, time)) {
      const [alternative] = await suggestAlternatives(dayOfWeek, time);
      if (!alternative) {
        console.log(`[demo] no free slot near ${dayOfWeek} ${time}; skipped that class`);
        continue;
      }
      console.log(`[demo] ${dayOfWeek} ${time} is taken; using ${alternative.dayOfWeek} ${alternative.time}`);
      ({ dayOfWeek, time } = alternative);
    }
    const cls = await ClassSchedule.create({
      instructor: instructors[spec.instructor]._id,
      dayOfWeek,
      time,
      durationMinutes: DEFAULT_DURATION_MINUTES,
      classType: spec.classType,
      payRate: spec.payRate,
    });
    await track('classes', cls);
    classes.push(cls);
  }
  return classes;
}

async function createPackages() {
  const byKey = {};
  for (const spec of PACKAGES) {
    const isUnlimited = spec.classes === 'unlimited';
    const pkg = await Package.create({
      packageId: await generatePackageId(),
      name: spec.name,
      category: spec.category,
      isUnlimited,
      numberOfClasses: isUnlimited ? null : spec.classes,
      classType: spec.classType,
      startDate: dateFromToday(-90),
      endDate: dateFromToday(120),
      price: spec.price,
    });
    await track('packages', pkg);
    byKey[spec.key] = pkg;
  }
  return byKey;
}

async function createCustomers() {
  const customers = [];
  for (const spec of CUSTOMERS) {
    const customerId = await generateCustomerId();
    const customer = await Customer.create({
      customerId,
      firstName: spec.firstName,
      lastName: spec.lastName,
      address: `${200 + CUSTOMERS.indexOf(spec)} Grand Ave, St Paul, MN 55105`,
      phone: spec.phone,
      email: email(spec),
      preferredContact: spec.preferredContact,
    });
    await track('customers', customer);
    await notify(
      'Customer',
      customer,
      `Welcome to Yoga'Hom! We're excited to have you on board. Your customer id is ${customerId}.`,
      'Customer',
      customer._id
    );
    customers.push({ customer, spec });
  }
  return customers;
}

// Sales and check-ins are applied in time order so balances evolve as they would have.
function buildTimeline(customers, packages, classes) {
  const events = [];
  let paymentIndex = 0;

  for (const { customer, spec } of customers) {
    for (const purchase of spec.purchases) {
      // Future packages were bought yesterday; others early on their first valid day,
      // before that day's first class.
      const paidDay = purchase.from > 0 ? -1 : purchase.from;
      events.push({
        at: studioInstant(dateKeyOf(dateFromToday(paidDay)), '05:30'),
        type: 'sale',
        customer,
        pkg: packages[purchase.pkg],
        purchase,
        paymentMode: PAYMENT_MODES[paymentIndex++ % PAYMENT_MODES.length],
      });
    }
  }

  const now = Date.now();
  for (let offset = -HISTORY_DAYS; offset <= 0; offset += 1) {
    const dateKey = dateKeyOf(dateFromToday(offset));
    const dayOfWeek = DAYS[new Date(`${dateKey}T12:00:00Z`).getUTCDay()];
    for (const cls of classes.filter((c) => c.dayOfWeek === dayOfWeek)) {
      const start = studioInstant(dateKey, cls.time);
      const at = new Date(start.getTime() + 5 * 60 * 1000);
      if (at.getTime() > now) continue;
      events.push({ at, type: 'class', cls, attendedDate: new Date(dateKey) });
    }
  }

  return events.sort((a, b) => a.at - b.at || (a.type === 'sale' ? -1 : 1));
}

async function recordSale(event) {
  const { customer, pkg, purchase, paymentMode, at } = event;
  const sale = await Sale.create({
    saleId: await generateSaleId(),
    customer: customer._id,
    package: pkg._id,
    classType: pkg.classType,
    isUnlimited: pkg.isUnlimited,
    remainingClasses: pkg.isUnlimited ? null : pkg.numberOfClasses,
    amountPaid: pkg.price,
    paymentMode,
    paidAt: at,
    validityStart: dateFromToday(purchase.from),
    validityEnd: dateFromToday(purchase.to),
  });
  if (!pkg.isUnlimited) {
    await Customer.updateOne({ _id: customer._id }, { $inc: { classBalance: pkg.numberOfClasses } });
  }
  return sale;
}

async function recordClass(event, customers) {
  const { cls, at, attendedDate } = event;
  const attendees = [];
  for (const { customer, spec } of customers) {
    const { sale } = await findEligibleSale(customer._id, cls.classType, attendedDate);
    if (random() < (sale ? spec.rate || 0 : spec.walkIn || 0)) {
      attendees.push({ customer, sale });
    }
  }

  let count = 0;
  for (const { customer: stale, sale } of attendees) {
    const customer = await Customer.findById(stale._id);
    const { checkIn, classBalance, unlimited } = await applyCheckIn({
      classSchedule: cls,
      attendedAt: at,
      attendedDate,
      customer,
      sale,
    });
    await notify('Customer', customer, checkInMessage(customer, at, classBalance, unlimited), 'CheckIn', checkIn._id, at);
    count += 1;
  }
  return count;
}

const fail = (message) => {
  console.error(`[demo] ${message}`);
  process.exit(1);
};

/**
 * Hard-deletes everything listed in the manifest plus what hangs off it: demo
 * instructors' logins, sales and check-ins involving demo customers, packages or
 * classes, and notifications to demo people or about those check-ins and classes.
 */
async function removeDemo() {
  const listed = await manifest().findOne({ _id: MANIFEST_ID });
  if (!listed) {
    return false;
  }
  const { instructors = [], classes = [], packages = [], customers = [] } = listed;

  // Real records that depend on demo ones would be left inconsistent; stop instead.
  const realSales = await Sale.find({ package: { $in: packages }, customer: { $nin: customers } }).select('saleId');
  const realCheckIns = await CheckIn.countDocuments({ classSchedule: { $in: classes }, customer: { $nin: customers } });
  if (realSales.length > 0 || realCheckIns > 0) {
    const problems = [];
    if (realSales.length > 0) problems.push(`sales of demo packages to your own customers (${realSales.map((s) => s.saleId).join(', ')})`);
    if (realCheckIns > 0) problems.push(`${realCheckIns} check-in(s) of your own customers in demo classes`);
    fail(`Not removing the demo: your own data depends on it: ${problems.join(' and ')}. Nothing was deleted.`);
  }

  const checkIns = await CheckIn.find({
    $or: [{ customer: { $in: customers } }, { classSchedule: { $in: classes } }],
  }).select('_id');
  const checkInIds = checkIns.map((c) => c._id);

  const removed = {
    notifications: (
      await Notification.deleteMany({
        $or: [
          { recipientRef: { $in: [...instructors, ...customers] } },
          { relatedEntityId: { $in: [...checkInIds, ...classes] } },
        ],
      })
    ).deletedCount,
    checkIns: (await CheckIn.deleteMany({ _id: { $in: checkInIds } })).deletedCount,
    sales: (await Sale.deleteMany({ $or: [{ customer: { $in: customers } }, { package: { $in: packages } }] })).deletedCount,
    customers: (await Customer.deleteMany({ _id: { $in: customers } })).deletedCount,
    packages: (await Package.deleteMany({ _id: { $in: packages } })).deletedCount,
    classes: (await ClassSchedule.deleteMany({ _id: { $in: classes } })).deletedCount,
    logins: (await User.deleteMany({ instructor: { $in: instructors } })).deletedCount,
    instructors: (await Instructor.deleteMany({ _id: { $in: instructors } })).deletedCount,
  };
  await manifest().deleteOne({ _id: MANIFEST_ID });

  console.log(
    `[demo] removed ${removed.instructors} instructors (+${removed.logins} logins), ${removed.classes} classes, ` +
      `${removed.packages} packages, ${removed.customers} customers, ${removed.sales} sales, ` +
      `${removed.checkIns} check-ins and ${removed.notifications} notifications.`
  );
  return true;
}

async function run() {
  const mode = process.argv.includes('--remove') ? 'remove' : process.argv.includes('--reset') ? 'reset' : 'add';

  if (nodeEnv === 'production' && !process.argv.includes('--allow-production')) {
    fail('NODE_ENV is production. Re-run with --allow-production if you really mean it.');
  }

  await connectDB();

  if (mode === 'remove' || mode === 'reset') {
    const removed = await removeDemo();
    if (!removed) console.log('[demo] No demo data to remove.');
    if (mode === 'remove') {
      await mongoose.disconnect();
      return;
    }
  }

  if (await manifest().findOne({ _id: MANIFEST_ID })) {
    fail('Demo data is already present; nothing added. Use npm run seed:demo:reset for a fresh copy.');
  }
  // Demo-looking records without a manifest can't be removed safely by this script.
  const demoPattern = new RegExp(`@${DEMO_EMAIL_DOMAIN.replace(/\./g, '\\.')}$`);
  if ((await Instructor.exists({ email: demoPattern })) || (await Customer.exists({ email: demoPattern }))) {
    fail(`Records with @${DEMO_EMAIL_DOMAIN} emails exist but aren't tracked by this script; nothing added.`);
  }

  await manifest().insertOne({
    _id: MANIFEST_ID,
    createdAt: new Date(),
    instructors: [],
    classes: [],
    packages: [],
    customers: [],
  });

  const instructors = await createInstructors();
  const classes = await createClasses(instructors);
  const packages = await createPackages();
  const customers = await createCustomers();

  let salesCount = 0;
  let checkInCount = 0;
  for (const event of buildTimeline(customers, packages, classes)) {
    if (event.type === 'sale') {
      await recordSale(event);
      salesCount += 1;
    } else {
      checkInCount += await recordClass(event, customers);
    }
  }

  console.log(
    `[demo] added ${INSTRUCTORS.length} instructors, ${classes.length} classes, ${PACKAGES.length} packages, ` +
      `${customers.length} customers, ${salesCount} sales and ${checkInCount} check-ins (last ${HISTORY_DAYS} days).`
  );
  const ids = Object.values(instructors).map((i) => i.instructorId);
  console.log(`[demo] instructor logins: ${ids.map((id) => `${id} / ${id}`).join(', ')}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[demo] failed:', err);
  process.exit(1);
});
