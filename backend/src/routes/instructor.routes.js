const express = require('express');
const auth = require('../middleware/auth.middleware');
const requireRole = require('../middleware/role.middleware');
const {
  checkDuplicate,
  createInstructor,
  listInstructors,
  getInstructor,
  updateInstructor,
  deactivateInstructor,
} = require('../controllers/instructor.controller');

const router = express.Router();

router.use(auth, requireRole('manager'));

router.get('/check-duplicate', checkDuplicate);
router.post('/', createInstructor);
router.get('/', listInstructors);
router.get('/:id', getInstructor);
router.put('/:id', updateInstructor);
router.delete('/:id', deactivateInstructor);

module.exports = router;
