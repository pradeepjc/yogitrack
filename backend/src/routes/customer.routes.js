const express = require('express');
const auth = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const { checkDuplicate, createCustomer, listCustomers } = require('../controllers/customer.controller');

const router = express.Router();

router.use(auth, requireRole('manager'));

router.get('/check-duplicate', checkDuplicate);
router.post('/', createCustomer);
router.get('/', listCustomers);

module.exports = router;
