const express = require('express');
const auth = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const {
  checkConflict,
  createClass,
  listClasses,
  getClass,
  updateClass,
  deactivateClass,
} = require('../controllers/class.controller');

const router = express.Router();

router.use(auth, requireRole('manager'));

router.post('/check-conflict', checkConflict);
router.post('/', createClass);
router.get('/', listClasses);
router.get('/:id', getClass);
router.put('/:id', updateClass);
router.delete('/:id', deactivateClass);

module.exports = router;
