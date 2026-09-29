const express = require('express');
const auth = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const { createPackage, listPackages } = require('../controllers/package.controller');

const router = express.Router();

router.use(auth, requireRole('manager'));

router.post('/', createPackage);
router.get('/', listPackages);

module.exports = router;
