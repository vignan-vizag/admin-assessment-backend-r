const express = require('express');
const { register, login, validateToken } = require('../controllers/auth');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/validate', authenticate, validateToken);

module.exports = router;