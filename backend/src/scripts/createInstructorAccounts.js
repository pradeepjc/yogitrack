// One-time backfill: creates a login for every active instructor that doesn't have one.
const connectDB = require('../config/db');
const Instructor = require('../models/Instructor');
const { ensureInstructorAccount } = require('../services/instructorAccount.service');

async function run() {
  await connectDB();

  const instructors = await Instructor.find({ isActive: true }).sort({ instructorId: 1 });
  let createdCount = 0;
  for (const instructor of instructors) {
    const { created } = await ensureInstructorAccount(instructor);
    if (created) {
      createdCount += 1;
      console.log(`[accounts] created login for ${instructor.instructorId}`);
    }
  }
  console.log(`[accounts] ${createdCount} created, ${instructors.length - createdCount} already existed.`);

  process.exit(0);
}

run().catch((err) => {
  console.error('[accounts] failed:', err);
  process.exit(1);
});
