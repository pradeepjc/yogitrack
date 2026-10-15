const express = require('express');
const auth = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const {
  packageSales,
  instructorClasses,
  customerPackages,
  teacherPayments,
} = require('../controllers/report.controller');

const router = express.Router();

router.use(auth, requireRole('manager'));

router.get('/package-sales', packageSales);
router.get('/instructor-classes', instructorClasses);
router.get('/customer-packages', customerPackages);
router.get('/teacher-payments', teacherPayments);

module.exports = router;
