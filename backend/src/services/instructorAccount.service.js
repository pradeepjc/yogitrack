const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Instructor logins: username and initial password are both the instructor id
 * (e.g. I00003). Idempotent, so the backfill script can call it safely.
 */
async function ensureInstructorAccount(instructor) {
  const existing = await User.findOne({ instructor: instructor._id });
  if (existing) {
    return { user: existing, created: false };
  }
  const passwordHash = await bcrypt.hash(instructor.instructorId, 10);
  const user = await User.create({
    username: instructor.instructorId.toLowerCase(),
    passwordHash,
    role: 'instructor',
    instructor: instructor._id,
  });
  return { user, created: true };
}

async function deactivateInstructorAccount(instructorRef) {
  await User.updateMany({ instructor: instructorRef }, { isActive: false });
}

module.exports = { ensureInstructorAccount, deactivateInstructorAccount };
