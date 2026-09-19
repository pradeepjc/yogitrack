const express = require('express');
const auth = require('../middleware/auth.middleware');
const { login, me } = require('../controllers/auth.controller');

const router = express.Router();

router.post('/login', login);
router.get('/me', auth, me);

module.exports = router;
