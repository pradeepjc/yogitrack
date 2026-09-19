const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { jwtSecret, jwtExpiresIn } = require('../config/env');

const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new ApiError(400, 'Username and password are required');
  }

  const user = await User.findOne({ username: username.toLowerCase(), isActive: true });
  if (!user) {
    throw new ApiError(401, 'Invalid username or password');
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    throw new ApiError(401, 'Invalid username or password');
  }

  const payload = { sub: user._id.toString(), username: user.username, role: user.role };
  const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });

  res.json({
    token,
    user: { id: user._id, username: user.username, role: user.role },
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.sub);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  res.json({ id: user._id, username: user.username, role: user.role });
});

module.exports = { login, me };
