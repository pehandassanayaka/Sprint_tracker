const express = require('express');
const router  = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public endpoints — no token required
router.post('/register', authController.register);
router.post('/login',    authController.login);

// Protected — requires valid JWT
router.get('/me', authMiddleware, authController.me);

module.exports = router;
