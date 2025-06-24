const jwt = require('jsonwebtoken');
const { getStudentModelByYear } = require('../models/Student');

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      message: 'Authentication required',
      error: 'No token provided'
    });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);

    // Check if token is for student
    if (decodedToken.type && decodedToken.type !== 'student') {
      return res.status(403).json({ 
        message: 'Student access required',
        error: 'Invalid token type'
      });
    }

    const { userId, year } = decodedToken;
    if (!year) {
      return res.status(400).json({ 
        message: 'Year not found in token',
        error: 'Invalid token structure'
      });
    }

    const Student = getStudentModelByYear(year);
    const student = await Student.findById(userId);

    if (!student) {
      return res.status(404).json({ 
        message: 'Student not found',
        error: 'Student account may have been deleted'
      });
    }

    req.student = student;
    next();
  } catch (error) {
    console.error('Student authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired',
        error: 'Please login again',
        expired: true
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token',
        error: 'Token is malformed or invalid'
      });
    } else {
      return res.status(401).json({ 
        message: 'Authentication failed',
        error: error.message
      });
    }
  }
};

module.exports = { authenticate };
