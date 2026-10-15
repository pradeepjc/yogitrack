const express = require('express');
const auth = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const {
  myClasses,
  listCustomers,
  previewAttendance,
  recordAttendance,
} = require('../controllers/attendance.controller');

const router = express.Router();

router.use(auth, requireRole('instructor'));

router.get('/classes', myClasses);
router.get('/customers', listCustomers);
router.post('/preview', previewAttendance);
router.post('/', recordAttendance);

module.exports = router;
