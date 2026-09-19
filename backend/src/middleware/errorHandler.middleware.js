const ApiError = require('../utils/ApiError');

module.exports = function errorHandler(err, req, res, next) {
  if (err.code === 11000) {
    return res.status(409).json({
      message: 'A record with conflicting unique fields already exists.',
      details: err.keyValue,
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message, details: err.details });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
};
