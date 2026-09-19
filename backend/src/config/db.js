const mongoose = require('mongoose');
const { mongoUri } = require('./env');

async function connectDB() {
  mongoose.connection.on('connected', () => {
    console.log(`[db] connected to ${mongoose.connection.name}`);
  });
  mongoose.connection.on('error', (err) => {
    console.error('[db] connection error:', err.message);
  });

  await mongoose.connect(mongoUri);
  return mongoose.connection;
}

module.exports = connectDB;
