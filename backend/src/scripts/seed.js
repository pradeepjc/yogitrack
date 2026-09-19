const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const { seedManagerUsername, seedManagerPassword } = require('../config/env');
const User = require('../models/User');

async function seed() {
  await connectDB();

  const existing = await User.findOne({ username: seedManagerUsername.toLowerCase() });
  if (existing) {
    console.log(`[seed] manager user "${seedManagerUsername}" already exists, skipping.`);
  } else {
    const passwordHash = await bcrypt.hash(seedManagerPassword, 10);
    await User.create({
      username: seedManagerUsername.toLowerCase(),
      passwordHash,
      role: 'manager',
    });
    console.log(`[seed] created manager user "${seedManagerUsername}" / password "${seedManagerPassword}"`);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
