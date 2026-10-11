const express = require('express');
const auth = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const { createSale, listSales } = require('../controllers/sale.controller');

const router = express.Router();

router.use(auth, requireRole('manager'));

router.post('/', createSale);
router.get('/', listSales);

module.exports = router;
