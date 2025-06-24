const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      message: 'Admin authentication required',
      error: 'No token provided'
    });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);

    // Check if token is for admin
    if (decodedToken.type !== 'admin') {
      return res.status(403).json({ 
        message: 'Admin access required',
        error: 'Invalid token type'
      });
    }

    const { adminId } = decodedToken;
    const admin = await Admin.findById(adminId).select('-password');

    if (!admin) {
      return res.status(404).json({ 
        message: 'Admin not found',
        error: 'Admin account may have been deleted'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Admin token expired',
        error: 'Please login again',
        expired: true
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid admin token',
        error: 'Token is malformed or invalid'
      });
    } else {
      return res.status(401).json({ 
        message: 'Admin authentication failed',
        error: error.message
      });
    }
  }
};

// Role-based authorization middleware
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ message: 'Admin authentication required' });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
      });
    }

    next();
  };
};

// Principal only access
const principalOnly = authorizeRole(['principal']);

// HOD or Principal access
const hodOrPrincipal = authorizeRole(['hod', 'principal']);

module.exports = { 
  authenticateAdmin, 
  authorizeRole,
  principalOnly,
  hodOrPrincipal
};
