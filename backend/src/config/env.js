require('dotenv').config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/yogitrack',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  seedManagerUsername: process.env.SEED_MANAGER_USERNAME || 'manager',
  seedManagerPassword: process.env.SEED_MANAGER_PASSWORD || 'manager123',
};
