const express = require('express');
const { adminLogin, getAdminProfile } = require('../controllers/adminAuth');
const { authenticateAdmin } = require('../middlewares/adminAuth');

const router = express.Router();

// Admin login route
router.post('/login', adminLogin);

// Admin profile route (protected)
router.get('/profile', authenticateAdmin, getAdminProfile);

// Test route for admin authentication
router.get('/test', authenticateAdmin, (req, res) => {
  res.json({ 
    message: 'Admin authentication successful!', 
    admin: {
      username: req.admin.username,
      role: req.admin.role
    }
  });
});

module.exports = router;
