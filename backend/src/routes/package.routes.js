const express = require('express');
const auth = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const {
  createPackage,
  listPackages,
  updatePackage,
  deactivatePackage,
} = require('../controllers/package.controller');

const router = express.Router();

router.use(auth, requireRole('manager'));

router.post('/', createPackage);
router.get('/', listPackages);
router.put('/:id', updatePackage);
router.delete('/:id', deactivatePackage);

module.exports = router;
