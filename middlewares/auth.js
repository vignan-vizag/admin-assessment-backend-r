const jwt = require('jsonwebtoken');
const { getStudentModelByYear } = require('../models/Student');

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);

    const { userId, year } = decodedToken;
    if (!year) {
      return res.status(400).json({ message: 'Year not found in token' });
    }

    const Student = getStudentModelByYear(year);
    const student = await Student.findById(userId);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    req.student = student;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { authenticate };
