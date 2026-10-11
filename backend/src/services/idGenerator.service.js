const Counter = require('../models/Counter');

async function getNextSequence(counterName) {
  const counter = await Counter.findOneAndUpdate(
    { _id: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

function pad(num, width) {
  return String(num).padStart(width, '0');
}

async function generateInstructorId() {
  return 'I' + pad(await getNextSequence('instructor'), 5);
}

async function generateCustomerId() {
  return 'C' + pad(await getNextSequence('customer'), 5);
}

async function generatePackageId() {
  return 'PKG' + pad(await getNextSequence('package'), 5);
}

module.exports = { getNextSequence, generateInstructorId, generateCustomerId, generatePackageId };
