const express = require('express');
const authRoutes = require('./auth.routes');
const instructorRoutes = require('./instructor.routes');
const classRoutes = require('./class.routes');
const packageRoutes = require('./package.routes');
const customerRoutes = require('./customer.routes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.use('/auth', authRoutes);
router.use('/instructors', instructorRoutes);
router.use('/classes', classRoutes);
router.use('/packages', packageRoutes);
router.use('/customers', customerRoutes);

module.exports = router;
